/**
 * Listings Empty State
 * 
 * Displayed when landlord has no listings yet.
 * Purpose: Encourage creating first listing to advertise vacancies.
 * Professional, clean, and encouraging design.
 */

"use client";

import Link from "next/link";
import { Megaphone, Plus, Upload, CheckCircle, ArrowRight, Users, Clock, BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function ListingsEmptyState() {
  const benefits = [
    "Reach thousands of verified tenants actively searching",
    "Receive and filter applications online",
    "Fill your vacancy in days, not weeks",
    "Only pay when you find the right tenant",
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Main Content */}
      <div className="px-6 py-8 sm:px-12 sm:py-10 text-center">
        {/* Icon */}
        <div className="w-16 h-16 bg-cta-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <Megaphone className="w-8 h-8 text-cta-600" />
        </div>

        {/* Title */}
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
          Create your first listing
        </h2>

        {/* Description */}
        <p className="text-gray-500 max-w-md mx-auto mb-6 leading-relaxed">
          Have a vacant unit? List it here to reach thousands of verified tenants.
          Get applications and fill your vacancy faster than ever.
        </p>

        {/* Benefits List */}
        <div className="max-w-sm mx-auto mb-6">
          <ul className="space-y-2 text-left">
            {benefits.map((benefit, index) => (
              <li key={index} className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-teal-500 flex-shrink-0 mt-0.5" />
                <span className="text-gray-600 text-sm">{benefit}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Primary CTA */}
        <Link
          href="/dashboard/landlord/listings/new"
          className={cn(
            "inline-flex items-center gap-2 px-6 py-3 rounded-lg",
            "text-white bg-cta-600",
            "hover:bg-cta-700 transition-all",
            "text-base font-semibold",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-cta-500 focus-visible:ring-offset-2",
            "shadow-sm hover:shadow-md"
          )}
        >
          <Plus className="w-5 h-5" strokeWidth={2.5} />
          List Your First Vacancy
        </Link>

        {/* Time estimate */}
        <p className="mt-3 text-xs text-gray-400">
          Takes about 3 minutes
        </p>

        {/* Secondary Option */}
        <p className="mt-5 text-sm text-gray-500">
          Have multiple vacancies?{" "}
          <button className="text-cta-600 hover:text-cta-700 font-medium hover:underline">
            Bulk upload listings
          </button>
        </p>
      </div>

      {/* Bottom Section - Quick Tips */}
      <div className="border-t border-gray-100 bg-gray-50/50 px-6 py-5 sm:px-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-gray-900">New to MitaSafi?</p>
            <p className="text-sm text-gray-500">
              Learn how to create listings that attract quality tenants
            </p>
          </div>
          <Link
            href="/help/listing-tips"
            className={cn(
              "inline-flex items-center gap-1.5 text-sm font-medium",
              "text-cta-600 hover:text-cta-700 transition-colors"
            )}
          >
            View listing tips
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
