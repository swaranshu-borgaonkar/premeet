// Deno test file for webhooks-stripe edge function

// Helper to compute HMAC-SHA256 hex signature
async function computeHmac(secret: string, payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signatureBytes = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload),
  );
  return Array.from(new Uint8Array(signatureBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// We extract and test the verifyStripeSignature logic directly since
// the edge function bundles it. We replicate the function here for unit testing.
async function verifyStripeSignature(
  body: string,
  signatureHeader: string,
  secret: string,
): Promise<boolean> {
  try {
    const parts = signatureHeader.split(",");
    const timestamp = parts.find((p) => p.startsWith("t="))?.split("=")[1];
    const sig = parts.find((p) => p.startsWith("v1="))?.split("=")[1];

    if (!timestamp || !sig) return false;

    const age = Math.floor(Date.now() / 1000) - parseInt(timestamp);
    if (age > 300) return false;

    const payload = `${timestamp}.${body}`;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const signatureBytes = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(payload),
    );
    const expectedSig = Array.from(new Uint8Array(signatureBytes))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return expectedSig === sig;
  } catch {
    return false;
  }
}

Deno.test("verifyStripeSignature - valid signature passes", async () => {
  const secret = "whsec_test_secret_key_123";
  const body = JSON.stringify({ type: "checkout.session.completed", data: {} });
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const payload = `${timestamp}.${body}`;
  const sig = await computeHmac(secret, payload);
  const signatureHeader = `t=${timestamp},v1=${sig}`;

  const result = await verifyStripeSignature(body, signatureHeader, secret);
  if (!result) throw new Error("Expected valid signature to pass verification");
});

Deno.test("verifyStripeSignature - invalid signature is rejected", async () => {
  const secret = "whsec_test_secret_key_123";
  const body = JSON.stringify({ type: "checkout.session.completed" });
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signatureHeader = `t=${timestamp},v1=0000000000000000000000000000000000000000000000000000000000000000`;

  const result = await verifyStripeSignature(body, signatureHeader, secret);
  if (result) throw new Error("Expected invalid signature to fail verification");
});

Deno.test("verifyStripeSignature - wrong secret is rejected", async () => {
  const correctSecret = "whsec_correct";
  const wrongSecret = "whsec_wrong";
  const body = JSON.stringify({ type: "test" });
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const payload = `${timestamp}.${body}`;
  const sig = await computeHmac(correctSecret, payload);
  const signatureHeader = `t=${timestamp},v1=${sig}`;

  const result = await verifyStripeSignature(body, signatureHeader, wrongSecret);
  if (result) throw new Error("Expected wrong secret to fail verification");
});

Deno.test("verifyStripeSignature - timestamp older than 5 minutes is rejected", async () => {
  const secret = "whsec_test_secret";
  const body = JSON.stringify({ type: "test" });
  // Timestamp from 10 minutes ago
  const timestamp = (Math.floor(Date.now() / 1000) - 600).toString();
  const payload = `${timestamp}.${body}`;
  const sig = await computeHmac(secret, payload);
  const signatureHeader = `t=${timestamp},v1=${sig}`;

  const result = await verifyStripeSignature(body, signatureHeader, secret);
  if (result) throw new Error("Expected stale timestamp to fail verification");
});

Deno.test("verifyStripeSignature - missing timestamp returns false", async () => {
  const secret = "whsec_test_secret";
  const signatureHeader = "v1=abc123";

  const result = await verifyStripeSignature("{}", signatureHeader, secret);
  if (result) throw new Error("Expected missing timestamp to fail");
});

Deno.test("verifyStripeSignature - missing v1 signature returns false", async () => {
  const secret = "whsec_test_secret";
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signatureHeader = `t=${timestamp}`;

  const result = await verifyStripeSignature("{}", signatureHeader, secret);
  if (result) throw new Error("Expected missing v1 to fail");
});

Deno.test("verifyStripeSignature - tampered body is rejected", async () => {
  const secret = "whsec_test_secret";
  const originalBody = JSON.stringify({ amount: 100 });
  const tamperedBody = JSON.stringify({ amount: 999 });
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const payload = `${timestamp}.${originalBody}`;
  const sig = await computeHmac(secret, payload);
  const signatureHeader = `t=${timestamp},v1=${sig}`;

  const result = await verifyStripeSignature(tamperedBody, signatureHeader, secret);
  if (result) throw new Error("Expected tampered body to fail verification");
});
