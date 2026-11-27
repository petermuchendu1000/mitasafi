import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Log in | MitaSafi",
  description: "Log in to MitaSafi with Google or your mobile number.",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
