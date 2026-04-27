"use client";

import { useState } from "react";
import { Section, SectionHeader, Container, FeatureCard } from "@/components/ui";
import { buttonVariants } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
  ShieldCheck,
  MessageCircle,
  Video,
  Lock,
  ClipboardCheck,
  PiggyBank,
  UserCheck,
  CalendarDays,
  Megaphone,
  LayoutDashboard,
  FileSignature,
  Calendar,
  BadgeCheck,
  Shield,
  Wrench,
  Key,
} from "lucide-react";

type UserType = "tenant" | "landlord" | "service-provider";

const userTypes = [
  { id: "tenant" as const, label: "I'm a Tenant", icon: <Key className="w-5 h-5" /> },
  { id: "landlord" as const, label: "I'm a Landlord", icon: <LayoutDashboard className="w-5 h-5" /> },
  { id: "service-provider" as const, label: "I'm a Service Provider", icon: <Wrench className="w-5 h-5" /> },
];

const features: Record<UserType, {
  eyebrow: string;
  title: string;
  subtitle: string;
  features: Array<{
    icon: React.ReactNode;
    title: string;
    description: string;
    stat: string;
  }>;
  cta: { primary: string; secondary: string; primaryHref: string; secondaryHref: string };
}> = {
  tenant: {
    eyebrow: "For Tenants",
    title: "Find Home, Not Headaches",
    subtitle: "Search with confidence. Move in with clarity. Live without the drama.",
    features: [
      {
        icon: <ShieldCheck className="w-6 h-6" />,
        title: "What You See Is What You Get",
        description:
          "Every listing is verified. Photos are timestamped. Prices include all costs — rent, water, garbage, parking. No surprises after you commit.",
        stat: "98% of tenants say listings matched reality",
      },
      {
        icon: <MessageCircle className="w-6 h-6" />,
        title: "Talk to Decision Makers",
        description:
          "Message landlords directly through the app. Schedule viewings on your terms. No gatekeepers taking cuts or playing favorites.",
        stat: "Average response time: 2 hours",
      },
      {
        icon: <Video className="w-6 h-6" />,
        title: "Tour From Your Couch",
        description:
          "See every room before you visit. 360° walkthroughs. Video tours. Detailed photo galleries. Save your weekends for the finalists only.",
        stat: "Save 5+ hours per house hunt",
      },
      {
        icon: <Lock className="w-6 h-6" />,
        title: "Every Shilling Tracked",
        description:
          "Pay rent through the app via M-Pesa. Get instant digital receipts. Build your payment history. Never argue about whether you paid again.",
        stat: "100% payment dispute resolution",
      },
      {
        icon: <ClipboardCheck className="w-6 h-6" />,
        title: "Issues Actually Get Fixed",
        description:
          "Report problems with photos and descriptions. Track status in real-time. Escalate if needed. Your home should work — and now there's accountability.",
        stat: "72% of issues resolved within 48 hours",
      },
      {
        icon: <PiggyBank className="w-6 h-6" />,
        title: "Your Deposit, Protected",
        description:
          "Full record of what you paid. Itemized deductions at move-out with photo evidence. Dispute unfair charges with documentation.",
        stat: "KES 2.5M+ in deposits protected",
      },
    ],
    cta: {
      primary: "Browse Verified Homes",
      secondary: "Create Free Account →",
      primaryHref: "/properties",
      secondaryHref: "/signup",
    },
  },
  landlord: {
    eyebrow: "For Landlords",
    title: "Better Tenants, Less Stress",
    subtitle: "Fill vacancies faster. Get paid on time. Know what's happening at your property.",
    features: [
      {
        icon: <UserCheck className="w-6 h-6" />,
        title: "Know Who's Moving In",
        description:
          "Verified IDs. Employment confirmation. Rental history from previous landlords. Payment track record. Make informed decisions, not hopeful guesses.",
        stat: "89% reduction in problematic tenancies",
      },
      {
        icon: <CalendarDays className="w-6 h-6" />,
        title: "Rent Comes to You",
        description:
          "Automated reminders go out before due date. Tenants pay through the app. Money hits your M-Pesa or bank account directly. No awkward conversations.",
        stat: "95% on-time payment rate",
      },
      {
        icon: <Megaphone className="w-6 h-6" />,
        title: "Fill Units Faster",
        description:
          "Your listing reaches thousands of verified, serious tenants. Professional presentation. No agents. No commission. Average vacancy: 12 days.",
        stat: "3x faster than traditional listings",
      },
      {
        icon: <LayoutDashboard className="w-6 h-6" />,
        title: "See Everything, From Anywhere",
        description:
          "Direct tenant communication. Maintenance requests with photos. Payment status at a glance. Financial reports. Finally know what's happening at your property.",
        stat: "Real-time updates on every property",
      },
      {
        icon: <FileSignature className="w-6 h-6" />,
        title: "Agreements That Protect You",
        description:
          "Generate professional lease agreements. Digital signatures. Automatic storage. Clear terms that hold up. Documented violations if things go wrong.",
        stat: "Legally compliant templates included",
      },
    ],
    cta: {
      primary: "List Your Property — Free",
      secondary: "See How It Works →",
      primaryHref: "/signup?role=landlord&intent=list",
      secondaryHref: "#how-it-works",
    },
  },
  "service-provider": {
    eyebrow: "For Service Providers",
    title: "Grow Your Business, Not Your Stress",
    subtitle: "Steady work. Trusted reputation. Guaranteed payment. Join Nairobi's rental service network.",
    features: [
      {
        icon: <Calendar className="w-6 h-6" />,
        title: "Work That Comes to You",
        description:
          "Get notified when landlords and tenants need your skills. Plumbing, electrical, moving, cleaning — whatever you do, there's demand.",
        stat: "Average 15+ job requests per month",
      },
      {
        icon: <BadgeCheck className="w-6 h-6" />,
        title: "Build a Reputation That Travels",
        description:
          "Verified ID and business registration. Customer reviews visible to all. Portfolio of past work. Your reputation opens doors before you arrive.",
        stat: "Verified providers earn 40% more",
      },
      {
        icon: <Shield className="w-6 h-6" />,
        title: "Get Paid, Every Time",
        description:
          "Clear job scope and pricing upfront. Payment released on completion. No more chasing clients. No more broken promises.",
        stat: "99.2% payment success rate",
      },
      {
        icon: <Wrench className="w-6 h-6" />,
        title: "Run Your Business Smarter",
        description:
          "Track all jobs in one place. Send quotes quickly. Manage your schedule. Get insights on your busiest times and top services.",
        stat: "Free business management tools",
      },
    ],
    cta: {
      primary: "Apply as Service Provider",
      secondary: "See Requirements →",
      primaryHref: "/signup?role=provider",
      secondaryHref: "/service-providers",
    },
  },
};

export function FeaturesSection() {
  const [activeTab, setActiveTab] = useState<UserType>("tenant");
  const activeFeatures = features[activeTab];

  // Color scheme per user type
  const tabColors: Record<UserType, { 
    active: string; 
    bg: string;
    buttonVariant: "brand" | "cta" | "success";
    cardColor: "brand" | "cta" | "success";
  }> = {
    tenant: {
      active: "bg-brand-600 text-white shadow-medium",
      bg: "bg-brand-50/50",
      buttonVariant: "brand",
      cardColor: "brand",
    },
    landlord: {
      active: "bg-cta-600 text-white shadow-medium",
      bg: "bg-orange-50/50",
      buttonVariant: "cta",
      cardColor: "cta",
    },
    "service-provider": {
      active: "bg-emerald-600 text-white shadow-medium",
      bg: "bg-emerald-50/50",
      buttonVariant: "success",
      cardColor: "success",
    },
  };

  const currentColors = tabColors[activeTab];

  return (
    <Section background="white" id="for-tenants" className={cn("transition-colors duration-300", currentColors.bg)}>
      <Container>
        {/* User Type Selector Header */}
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Built for Everyone in the Rental Ecosystem
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Whether you&apos;re searching for a home, managing properties, or offering
            services — MitaSafi works for you.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-4 mb-12 lg:mb-16">
          {userTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => setActiveTab(type.id)}
              className={cn(
                "flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-200",
                activeTab === type.id
                  ? tabColors[type.id].active
                  : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
              )}
            >
              {type.icon}
              {type.label}
            </button>
          ))}
        </div>

        {/* Features Content */}
        <div className="animate-fade-in">
          <SectionHeader
            eyebrow={activeFeatures.eyebrow}
            title={activeFeatures.title}
            description={activeFeatures.subtitle}
          />

          {/* Feature Cards Grid */}
          <div
            className={cn(
              "grid gap-6 mt-12 lg:mt-16",
              activeTab === "tenant"
                ? "sm:grid-cols-2 lg:grid-cols-3"
                : activeTab === "landlord"
                ? "sm:grid-cols-2 lg:grid-cols-3"
                : "sm:grid-cols-2 lg:grid-cols-2 max-w-4xl mx-auto"
            )}
          >
            {activeFeatures.features.map((feature, index) => (
              <FeatureCard
                key={index}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
                stat={feature.stat}
                colorScheme={currentColors.cardColor}
              />
            ))}
          </div>

          {/* CTA Block */}
          <div className="mt-12 lg:mt-16 text-center">
            <div className="inline-flex flex-col sm:flex-row gap-4">
              <Link
                href={activeFeatures.cta.primaryHref}
                className={buttonVariants({ variant: currentColors.buttonVariant, size: "lg" })}
              >
                {activeFeatures.cta.primary}
              </Link>
              <Link
                href={activeFeatures.cta.secondaryHref}
                className={buttonVariants({ variant: "ghost", size: "lg" })}
              >
                {activeFeatures.cta.secondary}
              </Link>
            </div>
            {activeTab === "tenant" && (
              <p className="mt-4 text-sm text-gray-500">
                Free to search. Free forever.
              </p>
            )}
          </div>
        </div>
      </Container>
    </Section>
  );
}
