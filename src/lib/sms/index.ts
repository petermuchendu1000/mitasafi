/**
 * SMS Service Module
 *
 * Centralised SMS gateway for MitaSafi. Currently backed by Africa's Talking
 * with automatic sandbox/production switching based on environment variables.
 *
 * Environment variables:
 *   SMS_ENABLED   — "true" to send real SMS, anything else = dev mode (console log)
 *   AT_API_KEY    — Africa's Talking API key
 *   AT_USERNAME   — Africa's Talking username (use "sandbox" for sandbox mode)
 *   AT_SENDER_ID  — Optional alphanumeric sender ID (e.g. "MitaSafi")
 *
 * Usage:
 *   import { sendSMS, SMSResult } from "@/lib/sms";
 *   const result = await sendSMS("+254712345678", "Your code is 123456");
 */

// =============================================================================
// CONFIG
// =============================================================================

interface SMSConfig {
  enabled: boolean;
  apiKey: string;
  username: string;
  senderId: string;
}

function getConfig(): SMSConfig {
  return {
    enabled: process.env.SMS_ENABLED === "true",
    apiKey: process.env.AT_API_KEY ?? "",
    username: process.env.AT_USERNAME ?? "sandbox",
    senderId: process.env.AT_SENDER_ID ?? "",
  };
}

// =============================================================================
// TYPES
// =============================================================================

export interface SMSResult {
  /** Whether the SMS was accepted for delivery (or logged in dev mode) */
  success: boolean;
  /** Human-readable message about the outcome */
  message: string;
  /** Africa's Talking message ID (only in production mode on success) */
  messageId?: string;
}

/** Africa's Talking SDK recipient shape */
interface ATRecipient {
  statusCode: number;
  number: string;
  status: string;
  cost: string;
  messageId: string;
}

/** Africa's Talking SDK response shape */
interface ATResponse {
  SMSMessageData: {
    Message: string;
    Recipients: ATRecipient[];
  };
}

// =============================================================================
// CORE
// =============================================================================

/**
 * Send an SMS message.
 *
 * In dev mode (`SMS_ENABLED !== "true"`), the message is logged to the server
 * console and the function returns success immediately — no network call.
 *
 * In production mode, the message is dispatched via Africa's Talking and the
 * response is inspected for per-recipient status.
 *
 * @param to      E.164 phone number (e.g. "+254712345678")
 * @param message SMS body (max 480 chars for 3-part concatenated SMS)
 */
export async function sendSMS(to: string, message: string): Promise<SMSResult> {
  const config = getConfig();

  // ── Dev mode: log and return ──────────────────────────────────────────
  if (!config.enabled) {
    console.log(
      "\n" +
        "=".repeat(50) +
        "\n" +
        "📱 SMS (dev mode — not sent)\n" +
        `   To:      ${to}\n` +
        `   Message: ${message}\n` +
        "=".repeat(50) +
        "\n",
    );
    return { success: true, message: "Dev mode — SMS logged to console" };
  }

  // ── Production mode: validate config ──────────────────────────────────
  if (!config.apiKey) {
    console.error("[SMS] AT_API_KEY is not set");
    return { success: false, message: "SMS gateway not configured (missing API key)" };
  }

  // ── Send via Africa's Talking ─────────────────────────────────────────
  try {
    // Dynamic import so the dependency is only loaded when SMS is enabled.
    // This keeps bundle size zero in dev and avoids a hard crash if the
    // package isn't installed while SMS_ENABLED=false.
    const AfricasTalking = (await import("africastalking")).default;

    const at = AfricasTalking({
      apiKey: config.apiKey,
      username: config.username,
    });

    const sms = at.SMS;

    const options: { to: string[]; message: string; from?: string } = {
      to: [to],
      message,
    };

    // Only attach sender ID if configured (sandbox doesn't support it)
    if (config.senderId && config.username !== "sandbox") {
      options.from = config.senderId;
    }

    const response: ATResponse = await sms.send(options);

    const recipient = response.SMSMessageData?.Recipients?.[0];

    if (!recipient) {
      console.error("[SMS] No recipient in response:", JSON.stringify(response));
      return { success: false, message: "SMS gateway returned no recipients" };
    }

    // Africa's Talking status codes: 100 = queued (success), 101 = sent
    if (recipient.statusCode === 100 || recipient.statusCode === 101) {
      return {
        success: true,
        message: `SMS queued (${recipient.cost})`,
        messageId: recipient.messageId,
      };
    }

    console.error(
      `[SMS] Delivery failed: status=${recipient.statusCode}, ` +
        `reason=${recipient.status}, number=${recipient.number}`,
    );
    return {
      success: false,
      message: `SMS delivery failed: ${recipient.status}`,
    };
  } catch (error) {
    console.error("[SMS] Send error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown SMS error",
    };
  }
}

// =============================================================================
// OTP HELPERS
// =============================================================================

/**
 * Send an OTP verification SMS.
 *
 * This is a convenience wrapper around `sendSMS` that formats the standard
 * MitaSafi OTP message. Use this instead of building the string manually so
 * the wording stays consistent across all OTP flows.
 *
 * @param to           E.164 phone number
 * @param code         The OTP code (e.g. "482901")
 * @param expiryMins   How many minutes until the code expires (default 5)
 */
export async function sendOTP(
  to: string,
  code: string,
  expiryMins: number = 5,
): Promise<SMSResult> {
  const message =
    `Your MitaSafi verification code is: ${code}. ` +
    `Valid for ${expiryMins} minutes. Do not share this code.`;
  return sendSMS(to, message);
}
