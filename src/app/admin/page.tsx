/**
 * Admin Dashboard — Index Page
 *
 * Shows a high-level overview: pending verifications count, flagged reviews, etc.
 * Each card links to the relevant admin section.
 */

import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function AdminDashboardPage() {
  const admin = createAdminClient();

  // Parallel queries for dashboard stats
  const [pendingVerifications, flaggedReviews] = await Promise.all([
    admin
      .from("service_providers")
      .select("id", { count: "exact", head: true })
      .eq("account_status", "pending_verification")
      .then(({ count }) => count ?? 0),

    admin
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("is_flagged", true)
      .eq("is_hidden", false)
      .then(({ count }) => count ?? 0),
  ]);

  const stats = [
    {
      label: "Pending Verifications",
      value: pendingVerifications,
      href: "/admin/verifications",
      color: "text-amber-600 bg-amber-50 border-amber-200",
    },
    {
      label: "Flagged Reviews",
      value: flaggedReviews,
      href: "/admin/reviews",
      color: "text-red-600 bg-red-50 border-red-200",
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">
        Admin Dashboard
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className={`block rounded-xl border p-6 transition-shadow hover:shadow-md ${stat.color}`}
          >
            <div className="text-3xl font-bold mb-1">{stat.value}</div>
            <div className="text-sm font-medium opacity-80">{stat.label}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
