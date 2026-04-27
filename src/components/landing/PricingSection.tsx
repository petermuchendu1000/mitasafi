"use client";

import { useState } from "react";
import { Section, SectionHeader, Container, Badge } from "@/components/ui";
import { buttonVariants } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Check, X } from "lucide-react";

type PlanCategory = "tenant" | "landlord" | "provider";

const plans = {
  tenant: [
    {
      name: "Free Forever",
      description: "Everything you need to find your perfect home",
      price: "KES 0",
      period: "forever",
      popular: true,
      features: [
        { text: "Unlimited property searches", included: true },
        { text: "Save favorites & get alerts", included: true },
        { text: "Direct landlord messaging", included: true },
        { text: "Virtual property tours", included: true },
        { text: "Secure rent payments", included: true },
        { text: "Digital receipts", included: true },
        { text: "Maintenance request tracking", included: true },
        { text: "Payment history reports", included: true },
      ],
      cta: "Get Started Free",
      ctaHref: "/signup",
    },
  ],
  landlord: [
    {
      name: "Free",
      description: "For landlords with 1-3 units",
      price: "KES 0",
      period: "forever",
      popular: false,
      features: [
        { text: "List up to 3 properties", included: true },
        { text: "Receive applications", included: true },
        { text: "Message tenants", included: true },
        { text: "Basic payment tracking", included: true },
        { text: "Maintenance requests", included: true },
        { text: "Tenant screening reports", included: false },
        { text: "Priority listing placement", included: false },
        { text: "Advanced analytics", included: false },
      ],
      cta: "Get Started Free",
      ctaHref: "/signup?role=landlord",
    },
    {
      name: "Professional",
      description: "For landlords with 4-20 units",
      price: "KES 2,500",
      period: "/month",
      popular: true,
      features: [
        { text: "List up to 20 properties", included: true },
        { text: "Receive applications", included: true },
        { text: "Message tenants", included: true },
        { text: "Automated rent collection", included: true },
        { text: "Maintenance management", included: true },
        { text: "Tenant screening reports", included: true },
        { text: "Priority listing placement", included: true },
        { text: "Basic analytics dashboard", included: true },
      ],
      cta: "Start 14-Day Trial",
      ctaHref: "/signup?role=landlord&plan=professional",
    },
    {
      name: "Enterprise",
      description: "For property managers with 20+ units",
      price: "Custom",
      period: "pricing",
      popular: false,
      features: [
        { text: "Unlimited properties", included: true },
        { text: "All Professional features", included: true },
        { text: "Bulk unit management", included: true },
        { text: "Team accounts", included: true },
        { text: "Advanced reporting", included: true },
        { text: "API access", included: true },
        { text: "Dedicated support", included: true },
        { text: "Custom integrations", included: true },
      ],
      cta: "Contact Sales",
      ctaHref: "/contact?type=enterprise",
    },
  ],
  provider: [
    {
      name: "Free",
      description: "Get discovered by renters nearby",
      price: "KES 0",
      period: "forever",
      popular: false,
      features: [
        { text: "Create business profile", included: true },
        { text: "Receive service requests", included: true },
        { text: "Message clients directly", included: true },
        { text: "Basic availability calendar", included: true },
        { text: "Customer reviews", included: true },
        { text: "Priority placement", included: false },
        { text: "Verified badge", included: false },
        { text: "Analytics dashboard", included: false },
      ],
      cta: "Join Free",
      ctaHref: "/signup?role=provider",
    },
    {
      name: "Pro",
      description: "Grow your service business",
      price: "KES 1,500",
      period: "/month",
      popular: true,
      features: [
        { text: "Everything in Free", included: true },
        { text: "Priority in search results", included: true },
        { text: "Verified provider badge", included: true },
        { text: "Advanced scheduling", included: true },
        { text: "Multiple service areas", included: true },
        { text: "Performance analytics", included: true },
        { text: "Instant notifications", included: true },
        { text: "Featured provider listing", included: false },
      ],
      cta: "Start 14-Day Trial",
      ctaHref: "/signup?role=provider&plan=pro",
    },
    {
      name: "Business",
      description: "For agencies & teams",
      price: "KES 4,000",
      period: "/month",
      popular: false,
      features: [
        { text: "Everything in Pro", included: true },
        { text: "Team member accounts", included: true },
        { text: "Featured provider listing", included: true },
        { text: "Job assignment & tracking", included: true },
        { text: "Bulk invoicing", included: true },
        { text: "Custom branding", included: true },
        { text: "Priority support", included: true },
        { text: "API access", included: true },
      ],
      cta: "Start 14-Day Trial",
      ctaHref: "/signup?role=provider&plan=business",
    },
  ],
};

export function PricingSection() {
  const [activeCategory, setActiveCategory] = useState<PlanCategory>("landlord");

  return (
    <Section background="white" id="pricing">
      <Container>
        <SectionHeader
          eyebrow="Pricing"
          title="Simple, Transparent Pricing"
          description="Free for tenants. Affordable plans for landlords and service providers. No hidden fees, ever."
        />

        {/* Category Toggle */}
        <div className="flex justify-center mt-8 mb-12">
          <div className="inline-flex bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setActiveCategory("tenant")}
              className={cn(
                "px-6 py-2.5 rounded-lg font-medium transition-all duration-200",
                activeCategory === "tenant"
                  ? "bg-white text-gray-900 shadow-soft"
                  : "text-gray-600 hover:text-gray-900"
              )}
            >
              For Tenants
            </button>
            <button
              onClick={() => setActiveCategory("landlord")}
              className={cn(
                "px-6 py-2.5 rounded-lg font-medium transition-all duration-200",
                activeCategory === "landlord"
                  ? "bg-white text-gray-900 shadow-soft"
                  : "text-gray-600 hover:text-gray-900"
              )}
            >
              For Landlords
            </button>
            <button
              onClick={() => setActiveCategory("provider")}
              className={cn(
                "px-6 py-2.5 rounded-lg font-medium transition-all duration-200",
                activeCategory === "provider"
                  ? "bg-white text-gray-900 shadow-soft"
                  : "text-gray-600 hover:text-gray-900"
              )}
            >
              For Providers
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div
          className={cn(
            "grid gap-8",
            activeCategory === "tenant"
              ? "max-w-md mx-auto"
              : "lg:grid-cols-3 max-w-5xl mx-auto"
          )}
        >
          {plans[activeCategory].map((plan, index) => (
            <div
              key={index}
              className={cn(
                "relative bg-white rounded-2xl border-2 p-8 transition-all duration-300",
                plan.popular
                  ? "border-brand-600 shadow-medium scale-105 lg:scale-110"
                  : "border-gray-100 shadow-soft hover:border-gray-200"
              )}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <Badge
                  variant="brand"
                  className="absolute -top-3 left-1/2 -translate-x-1/2"
                >
                  Most Popular
                </Badge>
              )}

              {/* Plan Header */}
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {plan.name}
                </h3>
                <p className="text-gray-500 text-sm">{plan.description}</p>
              </div>

              {/* Price */}
              <div className="text-center mb-8">
                <span className="text-4xl font-bold text-gray-900">
                  {plan.price}
                </span>
                <span className="text-gray-500 ml-1">{plan.period}</span>
              </div>

              {/* Features */}
              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <li
                    key={featureIndex}
                    className={cn(
                      "flex items-start gap-3",
                      !feature.included && "opacity-50"
                    )}
                  >
                    {feature.included ? (
                      <Check className="w-5 h-5 text-success-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <X className="w-5 h-5 text-gray-300 flex-shrink-0 mt-0.5" />
                    )}
                    <span
                      className={cn(
                        "text-sm",
                        feature.included ? "text-gray-700" : "text-gray-400"
                      )}
                    >
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <Link
                href={plan.ctaHref}
                className={cn(
                  buttonVariants({
                    variant: plan.popular ? "primary" : "secondary",
                    size: "lg",
                    fullWidth: true,
                  })
                )}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        {/* Additional Info */}
        <p className="text-center text-gray-500 text-sm mt-8">
          All plans include 256-bit SSL encryption, M-Pesa integration, and 24/7
          support.
          <br />
          No credit card required for free plans. Cancel anytime.
        </p>
      </Container>
    </Section>
  );
}
