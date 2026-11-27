import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create your account | MitaSafi",
  description: "Create a MitaSafi account to find a rental, list a property or offer home services.",
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
