import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { encode as base64Encode } from 'https://deno.land/std@0.177.0/encoding/base64.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CONNECTION_TIMEOUT_MS = 30_000;
const SMTP_READ_TIMEOUT_MS = 15_000;

// ---------------------------------------------------------------------------
// SMTP protocol helpers
// ---------------------------------------------------------------------------

interface SmtpConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  from_email: string;
  from_name: string;
  use_tls: boolean;
}

/**
 * Thin wrapper around a Deno TCP/TLS connection that exposes helpers for
 * reading SMTP response lines and writing SMTP commands.
 */
class SmtpConnection {
  private conn: Deno.Conn;
  private reader: ReadableStreamDefaultReader<Uint8Array>;
  private decoder = new TextDecoder();
  private encoder = new TextEncoder();
  private buffer = '';

  constructor(conn: Deno.Conn) {
    this.conn = conn;
    this.reader = conn.readable.getReader();
  }

  /** Replace the underlying connection (used after STARTTLS upgrade). */
  upgrade(conn: Deno.Conn) {
    // Release old reader – the previous conn is no longer usable after TLS
    // handshake, so we just drop it.
    this.conn = conn;
    this.reader = conn.readable.getReader();
  }

  /** Read a complete SMTP response (may be multi-line). Returns the full text. */
  async readResponse(): Promise<{ code: number; text: string }> {
    const lines: string[] = [];

    // SMTP multi-line responses use "code-text" for continuation lines and
    // "code text" (space) for the final line.
    while (true) {
      const line = await this.readLine();
      lines.push(line);
      // Final line: 3-digit code followed by a space (or end of string).
      if (/^\d{3}([ ]|$)/.test(line)) break;
    }

    const full = lines.join('\n');
    const code = parseInt(full.substring(0, 3), 10);
    return { code, text: full };
  }

  /** Read one line (terminated by \r\n) from the socket. */
  private async readLine(): Promise<string> {
    while (true) {
      const idx = this.buffer.indexOf('\r\n');
      if (idx !== -1) {
        const line = this.buffer.substring(0, idx);
        this.buffer = this.buffer.substring(idx + 2);
        return line;
      }

      const result = await this.readWithTimeout();
      if (result.done) {
        // Connection closed – return whatever we have left.
        const remaining = this.buffer;
        this.buffer = '';
        return remaining;
      }
      this.buffer += this.decoder.decode(result.value, { stream: true });
    }
  }

  /** Read from the reader with a timeout. */
  private readWithTimeout(): Promise<ReadableStreamReadResult<Uint8Array>> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('SMTP read timeout')), SMTP_READ_TIMEOUT_MS);
      this.reader.read().then((result) => {
        clearTimeout(timer);
        resolve(result);
      }).catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  /** Send a command string (appends \r\n). */
  async send(command: string): Promise<void> {
    const writer = this.conn.writable.getWriter();
    try {
      await writer.write(this.encoder.encode(command + '\r\n'));
    } finally {
      writer.releaseLock();
    }
  }

  /** Send a command and read the response. Throws if the response code is not in `okCodes`. */
  async command(cmd: string, okCodes: number[] = [250]): Promise<{ code: number; text: string }> {
    await this.send(cmd);
    const resp = await this.readResponse();
    if (!okCodes.includes(resp.code)) {
      throw new Error(`SMTP error on "${cmd.split(' ')[0]}": ${resp.code} ${resp.text}`);
    }
    return resp;
  }

  close() {
    try {
      this.reader.releaseLock();
    } catch { /* already released */ }
    try {
      this.conn.close();
    } catch { /* already closed */ }
  }
}

// ---------------------------------------------------------------------------
// Connect to SMTP with timeout
// ---------------------------------------------------------------------------

async function connectWithTimeout(
  options: Deno.ConnectOptions | Deno.ConnectTlsOptions,
  tls: boolean,
): Promise<Deno.Conn> {
  return new Promise<Deno.Conn>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('SMTP connection timeout')), CONNECTION_TIMEOUT_MS);
    const p = tls
      ? Deno.connectTls(options as Deno.ConnectTlsOptions)
      : Deno.connect(options as Deno.ConnectOptions);

    p.then((conn) => {
      clearTimeout(timer);
      resolve(conn);
    }).catch((err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

// ---------------------------------------------------------------------------
// Build RFC-5322 message
// ---------------------------------------------------------------------------

function buildMessage(opts: {
  from: string;
  fromName: string;
  to: string;
  cc?: string;
  subject: string;
  body: string;
}): string {
  const boundary = `----=_Part_${crypto.randomUUID().replace(/-/g, '')}`;
  const date = new Date().toUTCString();

  const fromHeader = opts.fromName
    ? `"${opts.fromName.replace(/"/g, '\\"')}" <${opts.from}>`
    : opts.from;

  const headers = [
    `From: ${fromHeader}`,
    `To: ${opts.to}`,
    ...(opts.cc ? [`Cc: ${opts.cc}`] : []),
    `Subject: ${opts.subject}`,
    `Date: ${date}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    `Message-ID: <${crypto.randomUUID()}@premeet>`,
  ];

  // We send both a plain-text fallback and the HTML body.
  const plainText = opts.body.replace(/<[^>]+>/g, '');

  const messageParts = [
    headers.join('\r\n'),
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 7bit',
    '',
    plainText,
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: 7bit',
    '',
    opts.body,
    `--${boundary}--`,
  ];

  return messageParts.join('\r\n');
}

// ---------------------------------------------------------------------------
// Core SMTP send routine
// ---------------------------------------------------------------------------

async function sendViaSmtp(
  smtp: SmtpConfig,
  envelope: { to: string; cc?: string; subject: string; body: string },
): Promise<void> {
  // Determine if we connect with implicit TLS (port 465) or STARTTLS (port 587/25).
  const implicitTls = smtp.port === 465;
  const hostname = smtp.host;

  let rawConn: Deno.Conn;

  if (implicitTls) {
    rawConn = await connectWithTimeout({ hostname, port: smtp.port }, true);
  } else {
    rawConn = await connectWithTimeout({ hostname, port: smtp.port }, false);
  }

  const conn = new SmtpConnection(rawConn);

  try {
    // Read server greeting
    const greeting = await conn.readResponse();
    if (greeting.code !== 220) {
      throw new Error(`Unexpected greeting: ${greeting.code} ${greeting.text}`);
    }

    // EHLO
    const ehloResp = await conn.command(`EHLO premeet.app`, [250]);

    // STARTTLS for non-implicit TLS connections when use_tls is enabled
    if (!implicitTls && smtp.use_tls) {
      if (!ehloResp.text.toUpperCase().includes('STARTTLS')) {
        throw new Error('Server does not support STARTTLS but use_tls is enabled');
      }

      await conn.command('STARTTLS', [220]);

      // Upgrade the connection to TLS
      const tlsConn = await Deno.startTls(rawConn, { hostname });
      conn.upgrade(tlsConn);

      // Re-issue EHLO after TLS upgrade
      await conn.command(`EHLO premeet.app`, [250]);
    }

    // AUTH LOGIN
    await conn.command('AUTH LOGIN', [334]);
    await conn.command(btoa(smtp.username), [334]);
    await conn.command(btoa(smtp.password), [235]);

    // MAIL FROM
    await conn.command(`MAIL FROM:<${smtp.from_email}>`, [250]);

    // RCPT TO – primary recipient(s)
    const toAddresses = envelope.to.split(',').map((a) => a.trim()).filter(Boolean);
    for (const addr of toAddresses) {
      await conn.command(`RCPT TO:<${addr}>`, [250, 251]);
    }

    // RCPT TO – CC recipients
    const ccAddresses = envelope.cc
      ? envelope.cc.split(',').map((a) => a.trim()).filter(Boolean)
      : [];
    for (const addr of ccAddresses) {
      await conn.command(`RCPT TO:<${addr}>`, [250, 251]);
    }

    // DATA
    await conn.command('DATA', [354]);

    // Build and send the message body
    const message = buildMessage({
      from: smtp.from_email,
      fromName: smtp.from_name,
      to: envelope.to,
      cc: envelope.cc,
      subject: envelope.subject,
      body: envelope.body,
    });

    // Transparency: escape lines starting with a dot
    const escaped = message.replace(/\r\n\./g, '\r\n..');

    await conn.send(escaped + '\r\n.');
    const dataResp = await conn.readResponse();
    if (dataResp.code !== 250) {
      throw new Error(`DATA termination failed: ${dataResp.code} ${dataResp.text}`);
    }

    // QUIT
    try {
      await conn.command('QUIT', [221]);
    } catch {
      // Some servers close immediately; that is fine.
    }
  } finally {
    conn.close();
  }
}

// ---------------------------------------------------------------------------
// Edge function handler
// ---------------------------------------------------------------------------

serve(async (req) => {
  try {
    const { email_id } = await req.json();

    if (!email_id) {
      return new Response(
        JSON.stringify({ error: 'email_id is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Fetch email from queue
    const { data: email, error: emailError } = await supabase
      .from('email_queue')
      .select('*')
      .eq('id', email_id)
      .single();

    if (emailError || !email) {
      console.error('Email fetch error:', emailError);
      return new Response(
        JSON.stringify({ error: 'Email not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // 2. Verify user is on Team or Enterprise plan
    const { data: user } = await supabase
      .from('users')
      .select('subscription_tier')
      .eq('id', email.user_id)
      .single();

    if (user?.subscription_tier !== 'team' && user?.subscription_tier !== 'enterprise') {
      await supabase
        .from('email_queue')
        .update({ status: 'failed', error_message: 'SMTP email requires Team plan or higher' })
        .eq('id', email_id);

      return new Response(
        JSON.stringify({ error: 'SMTP email requires Team plan or higher' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // 3. Get workspace SMTP settings
    const workspaceId = email.workspace_id;

    if (!workspaceId) {
      await supabase
        .from('email_queue')
        .update({ status: 'failed', error_message: 'No workspace_id on email record' })
        .eq('id', email_id);

      return new Response(
        JSON.stringify({ error: 'Email has no associated workspace' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Verify user belongs to the workspace
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('user_id', email.user_id)
      .eq('workspace_id', workspaceId)
      .single();

    if (!membership) {
      await supabase
        .from('email_queue')
        .update({ status: 'failed', error_message: 'User is not a member of the workspace' })
        .eq('id', email_id);

      return new Response(
        JSON.stringify({ error: 'User is not a member of the workspace' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const { data: workspace } = await supabase
      .from('workspaces')
      .select('settings')
      .eq('id', workspaceId)
      .single();

    const smtpConfig: SmtpConfig | undefined = workspace?.settings?.smtp;

    if (!smtpConfig || !smtpConfig.host || !smtpConfig.username || !smtpConfig.password) {
      await supabase
        .from('email_queue')
        .update({ status: 'failed', error_message: 'Workspace SMTP settings are not configured' })
        .eq('id', email_id);

      return new Response(
        JSON.stringify({ error: 'Workspace SMTP settings are not configured' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Default port if not set
    if (!smtpConfig.port) smtpConfig.port = 587;
    if (smtpConfig.use_tls === undefined) smtpConfig.use_tls = true;

    // 4-5. Send the email via SMTP
    console.log(`[email-send-smtp] Sending email ${email_id} to ${email.to_email} via ${smtpConfig.host}:${smtpConfig.port}`);

    const startTime = Date.now();

    try {
      await sendViaSmtp(smtpConfig, {
        to: email.to_email,
        cc: email.cc_email || undefined,
        subject: email.subject,
        body: email.body,
      });
    } catch (smtpError) {
      const duration = Date.now() - startTime;
      const errorMsg = smtpError instanceof Error ? smtpError.message : String(smtpError);
      console.error(`[email-send-smtp] SMTP failure after ${duration}ms for email ${email_id}: ${errorMsg}`);

      // 6. Update status to failed
      await supabase
        .from('email_queue')
        .update({ status: 'failed', error_message: errorMsg })
        .eq('id', email_id);

      return new Response(
        JSON.stringify({ error: `SMTP send failed: ${errorMsg}` }),
        { status: 502, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const duration = Date.now() - startTime;

    // 6. Update status to sent
    await supabase
      .from('email_queue')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', email_id);

    // 9. Log the send attempt
    console.log(`[email-send-smtp] Email ${email_id} sent successfully in ${duration}ms to ${email.to_email}${email.cc_email ? ` (cc: ${email.cc_email})` : ''}`);

    return new Response(
      JSON.stringify({ success: true, email_id, duration_ms: duration }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[email-send-smtp] Unhandled error:', errorMsg);

    return new Response(
      JSON.stringify({ error: errorMsg }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
});
