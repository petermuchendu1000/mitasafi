import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login | MitaSafi",
  description: "Sign in to MitaSafi to find verified rental homes or manage your properties.",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
}
