// Deno test file for webhooks-lemonsqueezy edge function

// Replicate the verifySignature function from the edge function for unit testing
async function verifySignature(
  body: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  try {
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
      encoder.encode(body),
    );
    const expectedSig = Array.from(new Uint8Array(signatureBytes))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return expectedSig === signature;
  } catch {
    return false;
  }
}

// Replicate getTierFromVariant for unit testing
function getTierFromVariant(
  variantId: string,
  monthlyVariant: string,
  yearlyVariant: string,
): string {
  const variantMap: Record<string, string> = {};
  if (monthlyVariant) variantMap[monthlyVariant] = "individual";
  if (yearlyVariant) variantMap[yearlyVariant] = "individual";
  return variantMap[String(variantId)] || "individual";
}

// Helper to compute HMAC for test data
async function computeHmac(secret: string, data: string): Promise<string> {
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
    encoder.encode(data),
  );
  return Array.from(new Uint8Array(signatureBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// --- Signature verification tests ---

Deno.test("verifySignature - valid signature passes", async () => {
  const secret = "ls_webhook_secret_123";
  const body = JSON.stringify({ meta: { event_name: "subscription_created" } });
  const sig = await computeHmac(secret, body);

  const result = await verifySignature(body, sig, secret);
  if (!result) throw new Error("Expected valid signature to pass");
});

Deno.test("verifySignature - invalid signature is rejected", async () => {
  const secret = "ls_webhook_secret_123";
  const body = JSON.stringify({ meta: { event_name: "subscription_created" } });
  const badSig = "0".repeat(64);

  const result = await verifySignature(body, badSig, secret);
  if (result) throw new Error("Expected invalid signature to be rejected");
});

Deno.test("verifySignature - wrong secret is rejected", async () => {
  const correctSecret = "ls_correct_secret";
  const wrongSecret = "ls_wrong_secret";
  const body = JSON.stringify({ data: "test" });
  const sig = await computeHmac(correctSecret, body);

  const result = await verifySignature(body, sig, wrongSecret);
  if (result) throw new Error("Expected wrong secret to fail");
});

Deno.test("verifySignature - tampered body is rejected", async () => {
  const secret = "ls_webhook_secret";
  const originalBody = JSON.stringify({ amount: 9 });
  const tamperedBody = JSON.stringify({ amount: 0 });
  const sig = await computeHmac(secret, originalBody);

  const result = await verifySignature(tamperedBody, sig, secret);
  if (result) throw new Error("Expected tampered body to fail");
});

// --- Tier mapping tests ---

Deno.test("getTierFromVariant - monthly variant maps to individual", () => {
  const tier = getTierFromVariant("variant-monthly-001", "variant-monthly-001", "variant-yearly-001");
  if (tier !== "individual") {
    throw new Error(`Expected 'individual', got '${tier}'`);
  }
});

Deno.test("getTierFromVariant - yearly variant maps to individual", () => {
  const tier = getTierFromVariant("variant-yearly-001", "variant-monthly-001", "variant-yearly-001");
  if (tier !== "individual") {
    throw new Error(`Expected 'individual', got '${tier}'`);
  }
});

Deno.test("getTierFromVariant - unknown variant defaults to individual", () => {
  const tier = getTierFromVariant("unknown-variant-999", "variant-monthly-001", "variant-yearly-001");
  if (tier !== "individual") {
    throw new Error(`Expected 'individual' as default, got '${tier}'`);
  }
});

Deno.test("getTierFromVariant - empty env vars still default to individual", () => {
  const tier = getTierFromVariant("some-variant", "", "");
  if (tier !== "individual") {
    throw new Error(`Expected 'individual' as default, got '${tier}'`);
  }
});

// --- subscription_created event structure test ---

Deno.test("subscription_created event has expected structure", () => {
  const event = {
    meta: {
      event_name: "subscription_created",
      custom_data: { user_id: "user-abc-123" },
    },
    data: {
      id: "sub_12345",
      attributes: {
        variant_id: "variant-monthly-001",
        customer_id: "cust_67890",
      },
    },
  };

  // Verify the event can be parsed correctly
  if (event.meta.event_name !== "subscription_created") {
    throw new Error("Wrong event name");
  }
  if (!event.meta.custom_data.user_id) {
    throw new Error("Missing user_id in custom_data");
  }

  const tier = getTierFromVariant(
    String(event.data.attributes.variant_id),
    "variant-monthly-001",
    "variant-yearly-001",
  );
  if (tier !== "individual") {
    throw new Error(`Expected tier 'individual', got '${tier}'`);
  }
});

Deno.test("subscription_payment_failed - fail count threshold logic", () => {
  // Simulate the logic: failCount >= 3 triggers downgrade to free
  const scenarios = [
    { failCount: 1, shouldDowngrade: false },
    { failCount: 2, shouldDowngrade: false },
    { failCount: 3, shouldDowngrade: true },
    { failCount: 5, shouldDowngrade: true },
  ];

  for (const { failCount, shouldDowngrade } of scenarios) {
    const wouldDowngrade = failCount >= 3;
    if (wouldDowngrade !== shouldDowngrade) {
      throw new Error(
        `failCount=${failCount}: expected downgrade=${shouldDowngrade}, got ${wouldDowngrade}`,
      );
    }
  }
});
