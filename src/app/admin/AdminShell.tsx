/**
 * Admin Shell — Client component
 *
 * Provides the admin dashboard layout: sidebar navigation + main content area.
 * Intentionally minimal — admin panels prioritize function over form.
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Shield,
  ClipboardCheck,
  Flag,
  LayoutDashboard,
  LogOut,
} from "lucide-react";

interface AdminShellProps {
  children: React.ReactNode;
  adminName: string;
  adminEmail: string;
}

const navItems = [
  {
    href: "/admin",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/admin/verifications",
    label: "Verifications",
    icon: ClipboardCheck,
  },
  {
    href: "/admin/reviews",
    label: "Review Moderation",
    icon: Flag,
  },
];

export function AdminShell({ children, adminName, adminEmail }: AdminShellProps) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-gray-100 flex flex-col shrink-0">
        {/* Brand */}
        <div className="h-14 flex items-center gap-2 px-4 border-b border-gray-800">
          <Shield className="w-5 h-5 text-teal-400" />
          <span className="font-semibold text-sm tracking-wide">
            MitaSafi Admin
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                  ${isActive
                    ? "bg-gray-800 text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-800/60"
                  }
                `}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Admin profile + sign out */}
        <div className="border-t border-gray-800 p-4">
          <div className="text-sm font-medium text-gray-200 truncate">
            {adminName}
          </div>
          <div className="text-xs text-gray-500 truncate mb-3">
            {adminEmail}
          </div>
          <a
            href="/auth/signout"
            className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </a>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
