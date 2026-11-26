/**
 * Help and support for landlords.
 *
 * The support address comes from lib/site/urls.ts rather than being typed
 * here. That module exists because 39 hardcoded references to a domain that
 * had never been registered once silently broke every outbound email; a help
 * page printing a dead mailbox would fail the same way, more visibly.
 *
 * support@mitasafi.com was verified as a live Cloudflare Email Routing rule
 * before it was put on this page. A support address that bounces is worse
 * than none.
 */

import type { Metadata } from "next";
import { SUPPORT_EMAIL } from "@/lib/site/urls";
import { HelpClient } from "./HelpClient";

export const metadata: Metadata = {
  title: "Help & support",
  description:
    "How MitaSafi works for landlords: collecting rent, caretakers, reports — and what it does not do yet.",
};

export default function HelpPage() {
  return <HelpClient supportEmail={SUPPORT_EMAIL} />;
}
