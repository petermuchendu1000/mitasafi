/**
 * Email Service
 * 
 * Handles all transactional emails for MitaSafi.
 * Uses Resend for reliable email delivery.
 * 
 * To set up:
 * 1. Create account at resend.com
 * 2. Add RESEND_API_KEY to .env.local
 * 3. Verify your domain in Resend dashboard
 */

import { Resend } from "resend";

// Email templates
export interface InquiryEmailData {
  landlordName: string;
  landlordEmail: string;
  inquirerName: string;
  inquirerEmail: string | null;
  inquirerPhone: string | null;
  listingTitle: string;
  listingArea: string;
  listingId: string;
  message: string | null;
  requestViewing: boolean;
  preferredTime: string | null;
  preferredDay: string | null;
}

export interface SearchAlertEmailData {
  recipientEmail: string;
  recipientName: string | null;
  alertName: string | null;
  listings: {
    id: string;
    title: string;
    area: string;
    bedrooms: number;
    rent_amount: number;
    cover_photo: string | null;
  }[];
}

export interface VerificationEmailData {
  email: string;
  name: string | null;
  verificationToken: string;
  type: "search_alert" | "email_change";
}

// Check if email is configured
export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

// Send inquiry notification to landlord
export async function sendInquiryNotification(data: InquiryEmailData): Promise<{ success: boolean; error?: string }> {
  if (!isEmailConfigured()) {
    console.log("[Email] Resend not configured, skipping email");
    return { success: true }; // Soft fail - don't block inquiries
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://mitasafi.co.ke";
    const listingUrl = `${baseUrl}/listings/${data.listingId}`;
    const dashboardUrl = `${baseUrl}/dashboard/inquiries`;

    // Format contact info
    const contactInfo = [
      data.inquirerEmail ? `📧 ${data.inquirerEmail}` : null,
      data.inquirerPhone ? `📱 +254 ${data.inquirerPhone}` : null,
    ].filter(Boolean).join("\n");

    // Viewing request section
    const viewingSection = data.requestViewing
      ? `
      <div style="background: #fff7ed; border-left: 4px solid #f97316; padding: 16px; margin: 20px 0; border-radius: 4px;">
        <h3 style="margin: 0 0 8px 0; color: #c2410c;">📅 Viewing Requested</h3>
        <p style="margin: 0; color: #7c2d12;">
          Preferred time: <strong>${data.preferredTime || "Any"}</strong><br/>
          Preferred day: <strong>${data.preferredDay || "Any"}</strong>
        </p>
      </div>
      `
      : "";

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background: #f3f4f6;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%); padding: 24px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 24px;">New Inquiry! 🎉</h1>
              <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9);">Someone wants to know more about your property</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 24px;">
              <!-- Listing Info -->
              <div style="background: #f0fdfa; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
                <p style="margin: 0; color: #0f766e; font-weight: 500;">${data.listingTitle}</p>
                <p style="margin: 4px 0 0 0; color: #5eead4; font-size: 14px;">📍 ${data.listingArea}</p>
              </div>
              
              <!-- Inquirer Info -->
              <h2 style="margin: 0 0 12px 0; font-size: 18px; color: #1f2937;">From: ${data.inquirerName}</h2>
              <p style="margin: 0 0 20px 0; color: #6b7280; white-space: pre-line;">${contactInfo}</p>
              
              <!-- Message -->
              ${data.message ? `
              <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
                <h3 style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280; text-transform: uppercase;">Message</h3>
                <p style="margin: 0; color: #1f2937; white-space: pre-wrap;">${data.message}</p>
              </div>
              ` : ""}
              
              ${viewingSection}
              
              <!-- CTA Buttons -->
              <div style="margin-top: 24px; text-align: center;">
                ${data.inquirerEmail ? `
                <a href="mailto:${data.inquirerEmail}?subject=Re: ${encodeURIComponent(data.listingTitle)}" 
                   style="display: inline-block; background: #f97316; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; margin: 8px;">
                  Reply via Email
                </a>
                ` : ""}
                ${data.inquirerPhone ? `
                <a href="https://wa.me/254${data.inquirerPhone.replace(/\s/g, "")}?text=${encodeURIComponent(`Hi ${data.inquirerName}, thank you for your interest in ${data.listingTitle}!`)}" 
                   style="display: inline-block; background: #25d366; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; margin: 8px;">
                  WhatsApp
                </a>
                ` : ""}
              </div>
              
              <div style="margin-top: 24px; text-align: center;">
                <a href="${dashboardUrl}" style="color: #0d9488; text-decoration: none; font-size: 14px;">
                  View all inquiries in dashboard →
                </a>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="background: #f9fafb; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                This inquiry was sent via <a href="${baseUrl}" style="color: #0d9488;">MitaSafi</a>
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const { error } = await resend.emails.send({
      from: "MitaSafi <notifications@mitasafi.co.ke>",
      to: data.landlordEmail,
      subject: `🏠 New inquiry for ${data.listingTitle}`,
      html,
      text: `
New Inquiry for ${data.listingTitle}

From: ${data.inquirerName}
${contactInfo}

${data.message || "No message provided"}

${data.requestViewing ? `\nViewing Requested:\nPreferred time: ${data.preferredTime || "Any"}\nPreferred day: ${data.preferredDay || "Any"}` : ""}

View listing: ${listingUrl}
      `.trim(),
    });

    if (error) {
      console.error("[Email] Failed to send inquiry notification:", error);
      return { success: false, error: error.message };
    }

    console.log("[Email] Inquiry notification sent to:", data.landlordEmail);
    return { success: true };
  } catch (error) {
    console.error("[Email] Error sending inquiry notification:", error);
    return { success: false, error: String(error) };
  }
}

// Send search alert notification
export async function sendSearchAlertNotification(data: SearchAlertEmailData): Promise<{ success: boolean; error?: string }> {
  if (!isEmailConfigured()) {
    console.log("[Email] Resend not configured, skipping email");
    return { success: true };
  }

  if (data.listings.length === 0) {
    return { success: true }; // No listings to notify about
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://mitasafi.co.ke";
    
    const listingsHtml = data.listings.map(listing => `
      <div style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin-bottom: 16px;">
        ${listing.cover_photo ? `
        <img src="${listing.cover_photo}" alt="${listing.title}" style="width: 100%; height: 150px; object-fit: cover;">
        ` : `
        <div style="width: 100%; height: 150px; background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%); display: flex; align-items: center; justify-content: center;">
          <span style="color: white; font-size: 24px;">🏠</span>
        </div>
        `}
        <div style="padding: 16px;">
          <h3 style="margin: 0 0 4px 0; font-size: 16px; color: #1f2937;">${listing.title}</h3>
          <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">📍 ${listing.area} • ${listing.bedrooms} bed</p>
          <p style="margin: 0 0 12px 0; color: #0d9488; font-weight: 600; font-size: 18px;">KES ${listing.rent_amount.toLocaleString()}/mo</p>
          <a href="${baseUrl}/listings/${listing.id}" style="display: inline-block; background: #0d9488; color: white; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-size: 14px;">
            View Details
          </a>
        </div>
      </div>
    `).join("");

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background: #f3f4f6;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%); padding: 24px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 24px;">New Listings Match! 🏠</h1>
              <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9);">
                ${data.listings.length} new ${data.listings.length === 1 ? "property matches" : "properties match"} your alert${data.alertName ? `: "${data.alertName}"` : ""}
              </p>
            </div>
            
            <!-- Content -->
            <div style="padding: 24px;">
              ${listingsHtml}
              
              <div style="margin-top: 24px; text-align: center;">
                <a href="${baseUrl}/browse" style="display: inline-block; background: #f97316; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">
                  Browse All Listings
                </a>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="background: #f9fafb; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                You're receiving this because you set up a search alert on <a href="${baseUrl}" style="color: #0d9488;">MitaSafi</a><br/>
                <a href="${baseUrl}/settings/alerts" style="color: #6b7280;">Manage your alerts</a>
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const { error } = await resend.emails.send({
      from: "MitaSafi <alerts@mitasafi.co.ke>",
      to: data.recipientEmail,
      subject: `🏠 ${data.listings.length} new ${data.listings.length === 1 ? "listing matches" : "listings match"} your search`,
      html,
    });

    if (error) {
      console.error("[Email] Failed to send search alert:", error);
      return { success: false, error: error.message };
    }

    console.log("[Email] Search alert sent to:", data.recipientEmail);
    return { success: true };
  } catch (error) {
    console.error("[Email] Error sending search alert:", error);
    return { success: false, error: String(error) };
  }
}

// Send verification email
export async function sendVerificationEmail(data: VerificationEmailData): Promise<{ success: boolean; error?: string }> {
  if (!isEmailConfigured()) {
    console.log("[Email] Resend not configured, skipping verification email");
    return { success: true };
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://mitasafi.co.ke";
    const verifyUrl = `${baseUrl}/api/verify?token=${data.verificationToken}&type=${data.type}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background: #f3f4f6;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%); padding: 24px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 24px;">Verify Your Email ✉️</h1>
            </div>
            
            <!-- Content -->
            <div style="padding: 24px; text-align: center;">
              <p style="margin: 0 0 24px 0; color: #6b7280;">
                ${data.name ? `Hi ${data.name},` : "Hi there,"}<br/><br/>
                Please verify your email to ${data.type === "search_alert" ? "activate your search alert" : "confirm your email change"}.
              </p>
              
              <a href="${verifyUrl}" style="display: inline-block; background: #f97316; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 500; font-size: 16px;">
                Verify Email
              </a>
              
              <p style="margin: 24px 0 0 0; color: #9ca3af; font-size: 14px;">
                This link expires in 24 hours
              </p>
            </div>
            
            <!-- Footer -->
            <div style="background: #f9fafb; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                If you didn't request this, you can ignore this email.
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const { error } = await resend.emails.send({
      from: "MitaSafi <noreply@mitasafi.co.ke>",
      to: data.email,
      subject: "Verify your email - MitaSafi",
      html,
    });

    if (error) {
      console.error("[Email] Failed to send verification email:", error);
      return { success: false, error: error.message };
    }

    console.log("[Email] Verification email sent to:", data.email);
    return { success: true };
  } catch (error) {
    console.error("[Email] Error sending verification email:", error);
    return { success: false, error: String(error) };
  }
}
