/**
 * Turning a planned notice into the words somebody actually receives.
 *
 * ESCAPING IS NOT OPTIONAL HERE
 *   Tenant names, unit numbers and building names are typed by people. They
 *   go into an HTML email. `escape()` below is applied to every interpolated
 *   value without exception — a building called `<b>` is a formatting bug, a
 *   tenant called `<img src=x onerror=...>` is not.
 *
 * TONE
 *   These are messages about somebody's home and somebody's money. A rent
 *   reminder that reads as a threat damages a relationship the landlord has
 *   to maintain for years. They state the fact, the amount and the date, and
 *   stop.
 */

import { SITE_URL, SUPPORT_EMAIL } from "@/lib/site/urls";
import type { NoticeKind, PlannedNotice } from "./plan";

export interface RenderedNotice {
  subject: string;
  text: string;
  html: string;
}

function escape(v: string | number): string {
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function kes(v: string | number): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  return `KES ${n.toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;
}

/** A plain, readable shell. No images, no tracking pixel, no web fonts. */
function shell(heading: string, bodyHtml: string, footer: string): string {
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#1f2937;line-height:1.6">
  <div style="max-width:560px;margin:0 auto;padding:24px">
    <div style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
      <div style="padding:20px 24px;border-bottom:1px solid #e5e7eb">
        <h1 style="margin:0;font-size:18px;color:#0f766e">${escape(heading)}</h1>
      </div>
      <div style="padding:24px">${bodyHtml}</div>
      <div style="padding:16px 24px;background:#f9fafb;border-top:1px solid #e5e7eb">
        <p style="margin:0;font-size:12px;color:#6b7280">${footer}</p>
      </div>
    </div>
  </div>
</body></html>`;
}

const TENANT_FOOTER = `Sent by your landlord through MitaSafi. MitaSafi never receives or holds your rent, and will never ask you for your M-Pesa PIN. To stop these messages, speak to your landlord — they control them.`;

const LANDLORD_FOOTER = `Sent by MitaSafi. You can turn these off under Settings in your dashboard.`;

/** `data` is whatever the planner attached for this kind. */
export function renderNotice(notice: PlannedNotice): RenderedNotice {
  const d = notice.data;
  const unit = String(d.unit ?? "");
  const building = String(d.building ?? "");
  const where = building ? `${unit}, ${building}` : unit;

  switch (notice.kind as NoticeKind) {
    case "invoice_due_soon": {
      const subject = `Rent for ${unit} is due in ${d.daysUntilDue} day${d.daysUntilDue === 1 ? "" : "s"}`;
      const text = [
        `Hello ${d.tenant},`,
        ``,
        `Your rent for ${where} is due on ${d.dueDate}.`,
        `Amount outstanding: ${kes(d.balance)}.`,
        ``,
        `You can see exactly where and how to pay on your MitaSafi page:`,
        `${SITE_URL}/dashboard/rent`,
        ``,
        TENANT_FOOTER,
      ].join("\n");
      return {
        subject,
        text,
        html: shell(
          subject,
          `<p style="margin:0 0 12px">Hello ${escape(String(d.tenant))},</p>
           <p style="margin:0 0 12px">Your rent for <strong>${escape(where)}</strong> is due on <strong>${escape(String(d.dueDate))}</strong>.</p>
           <p style="margin:0 0 20px">Amount outstanding: <strong>${escape(kes(d.balance))}</strong>.</p>
           <p style="margin:0"><a href="${SITE_URL}/dashboard/rent" style="background:#0d9488;color:#ffffff;padding:10px 18px;border-radius:8px;text-decoration:none;display:inline-block">See how to pay</a></p>`,
          TENANT_FOOTER,
        ),
      };
    }

    case "invoice_due_day": {
      const subject = `Rent for ${unit} is due today`;
      const text = [
        `Hello ${d.tenant},`,
        ``,
        `Your rent for ${where} is due today.`,
        `Amount outstanding: ${kes(d.balance)}.`,
        ``,
        `${SITE_URL}/dashboard/rent`,
        ``,
        TENANT_FOOTER,
      ].join("\n");
      return {
        subject,
        text,
        html: shell(
          subject,
          `<p style="margin:0 0 12px">Hello ${escape(String(d.tenant))},</p>
           <p style="margin:0 0 12px">Your rent for <strong>${escape(where)}</strong> is due today.</p>
           <p style="margin:0 0 20px">Amount outstanding: <strong>${escape(kes(d.balance))}</strong>.</p>
           <p style="margin:0"><a href="${SITE_URL}/dashboard/rent" style="background:#0d9488;color:#ffffff;padding:10px 18px;border-radius:8px;text-decoration:none;display:inline-block">See how to pay</a></p>`,
          TENANT_FOOTER,
        ),
      };
    }

    case "invoice_late": {
      // Deliberately not "OVERDUE" in capitals, and deliberately mentions
      // that a payment already sent may not have been recorded yet. The
      // alternative is a tenant who paid in cash this morning receiving an
      // accusation, with no way to read it as anything else.
      const subject = `Rent for ${unit} has not been recorded yet`;
      const text = [
        `Hello ${d.tenant},`,
        ``,
        `Your rent for ${where} was due on ${d.dueDate} and ${kes(d.balance)} has not been recorded as received.`,
        ``,
        `If you have already paid, your landlord may not have recorded it yet — keep your M-Pesa message and send them the code.`,
        ``,
        `${SITE_URL}/dashboard/rent`,
        ``,
        TENANT_FOOTER,
      ].join("\n");
      return {
        subject,
        text,
        html: shell(
          subject,
          `<p style="margin:0 0 12px">Hello ${escape(String(d.tenant))},</p>
           <p style="margin:0 0 12px">Your rent for <strong>${escape(where)}</strong> was due on <strong>${escape(String(d.dueDate))}</strong> and <strong>${escape(kes(d.balance))}</strong> has not been recorded as received.</p>
           <p style="margin:0 0 20px;color:#6b7280">If you have already paid, your landlord may not have recorded it yet — keep your M-Pesa message and send them the code.</p>
           <p style="margin:0"><a href="${SITE_URL}/dashboard/rent" style="background:#0d9488;color:#ffffff;padding:10px 18px;border-radius:8px;text-decoration:none;display:inline-block">See what has been recorded</a></p>`,
          TENANT_FOOTER,
        ),
      };
    }

    case "lease_expiring": {
      const toLandlord = notice.recipientKind === "landlord";
      const subject = toLandlord
        ? `Lease for ${unit} ends in ${d.daysLeft} day${d.daysLeft === 1 ? "" : "s"}`
        : `Your lease for ${unit} ends on ${d.endDate}`;
      const body = toLandlord
        ? `The lease for ${where}${d.tenant ? ` (${d.tenant})` : ""} ends on ${d.endDate}, in ${d.daysLeft} day${d.daysLeft === 1 ? "" : "s"}.`
        : `Your lease for ${where} ends on ${d.endDate}, in ${d.daysLeft} day${d.daysLeft === 1 ? "" : "s"}. Speak to your landlord if you would like to renew.`;
      const link = toLandlord
        ? `${SITE_URL}/dashboard/landlord/leases`
        : `${SITE_URL}/dashboard/rent`;
      return {
        subject,
        text: [
          body,
          ``,
          link,
          ``,
          toLandlord ? LANDLORD_FOOTER : TENANT_FOOTER,
        ].join("\n"),
        html: shell(
          subject,
          `<p style="margin:0 0 20px">${escape(body)}</p>
           <p style="margin:0"><a href="${link}" style="background:#0d9488;color:#ffffff;padding:10px 18px;border-radius:8px;text-decoration:none;display:inline-block">Open MitaSafi</a></p>`,
          toLandlord ? LANDLORD_FOOTER : TENANT_FOOTER,
        ),
      };
    }

    case "application_submitted": {
      // The top of the funnel. A landlord who misses this loses a tenant to
      // whoever answered first, so it names the listing and the applicant
      // and does nothing else.
      const subject =
        `New application for ${escape(String(d.listing))}`.replace(
          /&amp;/g,
          "&",
        );
      const body = `${d.applicant} has applied for ${d.listing}${d.area ? `, ${d.area}` : ""}.`;
      return {
        subject: `New application for ${d.listing}`,
        text: [
          body,
          ``,
          `Read it and decide here:`,
          `${SITE_URL}/dashboard/landlord/applications`,
          ``,
          LANDLORD_FOOTER,
        ].join("\n"),
        html: shell(
          subject,
          `<p style="margin:0 0 20px">${escape(body)}</p>
           <p style="margin:0"><a href="${SITE_URL}/dashboard/landlord/applications" style="background:#0d9488;color:#ffffff;padding:10px 18px;border-radius:8px;text-decoration:none;display:inline-block">Read the application</a></p>`,
          LANDLORD_FOOTER,
        ),
      };
    }

    case "maintenance_submitted": {
      const subject = `Repair reported: ${d.title}`;
      const body = `${d.tenant} reported a ${d.category} problem at ${where || "their unit"}: ${d.title}.`;
      return {
        subject,
        text: [
          body,
          ``,
          String(d.description ?? ""),
          ``,
          `Urgency: ${d.urgency}`,
          ``,
          `${SITE_URL}/dashboard/landlord/maintenance`,
          ``,
          LANDLORD_FOOTER,
        ].join("\n"),
        html: shell(
          subject,
          `<p style="margin:0 0 12px">${escape(body)}</p>
           <p style="margin:0 0 12px;white-space:pre-wrap">${escape(String(d.description ?? ""))}</p>
           <p style="margin:0 0 20px;color:#6b7280">Urgency: ${escape(String(d.urgency))}</p>
           <p style="margin:0"><a href="${SITE_URL}/dashboard/landlord/maintenance" style="background:#0d9488;color:#ffffff;padding:10px 18px;border-radius:8px;text-decoration:none;display:inline-block">Open maintenance</a></p>`,
          LANDLORD_FOOTER,
        ),
      };
    }

    case "overdue_summary": {
      const n = Number(d.leasesBehind);
      const subject = `${n} lease${n === 1 ? "" : "s"} behind on rent`;
      const body = `${n} of your lease${n === 1 ? " is" : "s are"} behind on rent for ${d.month}, totalling ${kes(d.totalOwed)}.`;
      return {
        subject,
        text: [
          body,
          ``,
          `${SITE_URL}/dashboard/landlord/reports`,
          ``,
          LANDLORD_FOOTER,
        ].join("\n"),
        html: shell(
          subject,
          `<p style="margin:0 0 20px">${escape(body)}</p>
           <p style="margin:0"><a href="${SITE_URL}/dashboard/landlord/reports" style="background:#0d9488;color:#ffffff;padding:10px 18px;border-radius:8px;text-decoration:none;display:inline-block">Open the arrears report</a></p>`,
          LANDLORD_FOOTER,
        ),
      };
    }
  }
}

export { escape as _escapeForTest, SUPPORT_EMAIL };
