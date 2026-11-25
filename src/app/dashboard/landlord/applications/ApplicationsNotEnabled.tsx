/**
 * Shown only when rental_applications does not exist yet.
 *
 * The honest alternative to a 500. It says what is missing and what still
 * works, rather than implying the landlord simply has no applications — which
 * is the lie an ordinary empty state would tell here.
 */

import Link from "next/link";
import { FileText } from "lucide-react";

export function ApplicationsNotEnabled() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Applications</h1>
        <p className="mt-1 text-gray-500">
          Tenant applications for your listings
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 px-6 py-12 text-center">
        <FileText
          aria-hidden="true"
          className="w-8 h-8 mx-auto text-gray-400"
        />
        <h2 className="mt-4 text-base font-semibold text-gray-900">
          Applications are not switched on yet
        </h2>
        <p className="mt-2 text-sm text-gray-600 max-w-md mx-auto">
          The database change that stores applications has not been applied to
          this environment. This is not an empty list — nothing can be submitted
          until it is in place.
        </p>
        <p className="mt-4 text-sm text-gray-600">
          In the meantime,{" "}
          <Link
            href="/dashboard/inquiries"
            className="text-teal-700 font-medium hover:underline"
          >
            Inquiries
          </Link>{" "}
          still carries everyone who has asked about your listings.
        </p>
      </div>
    </div>
  );
}
