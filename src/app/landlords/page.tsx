import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Navbar, Footer } from "@/components/landing";
import { Container } from "@/components/ui";
import { buttonVariants } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { 
  Building2, 
  Users, 
  CreditCard, 
  Shield, 
  BarChart3, 
  MessageSquare,
  ArrowRight,
  CheckCircle,
  Clock,
  Star,
  Megaphone,
  LayoutDashboard,
  Home,
  BadgeCheck,
  TrendingUp,
  FileText,
  Bell,
  ChevronDown,
  Zap,
  Target,
  Wallet,
  Eye,
  UserCheck,
  Receipt,
  Headphones
} from "lucide-react";

export const metadata: Metadata = {
  title: "For Landlords | List, Screen & Collect Rent | MitaSafi Kenya",
  description: "List your rentals, screen verified tenants, and collect rent automatically. Free for up to 3 properties. Find quality tenants faster with MitaSafi Kenya.",
  keywords: "landlord portal Kenya, list property for rent Kenya, tenant screening Kenya, rent collection app Kenya, property management software Kenya, find quality tenants Kenya",
  openGraph: {
    title: "For Landlords | MitaSafi Kenya",
    description: "Find quality tenants, screen applicants with confidence, and collect rent on time. Free landlord tools for property owners across Kenya.",
    type: "website",
    url: "https://mitasafi.co.ke/landlords",
    images: [
      {
        url: "https://syoolvgoaqnckgmngvse.supabase.co/storage/v1/object/public/landing-images/hero/modern-apartment-building.jpg",
        width: 1200,
        height: 630,
        alt: "MitaSafi landlord dashboard for property management in Kenya",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "For Landlords | MitaSafi Kenya",
    description: "Find quality tenants, screen applicants with confidence, and collect rent on time.",
  },
};

// Structured Data for SEO
const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "For Landlords | MitaSafi",
  "description": "List properties, screen tenants, and collect rent with MitaSafi. Free for landlords with up to 3 properties.",
  "url": "https://mitasafi.co.ke/landlords",
  "breadcrumb": {
    "@type": "BreadcrumbList",
    "itemListElement": [
      {"@type": "ListItem", "position": 1, "name": "Home", "item": "https://mitasafi.co.ke"},
      {"@type": "ListItem", "position": 2, "name": "For Landlords", "item": "https://mitasafi.co.ke/landlords"}
    ]
  },
  "mainEntity": {
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Is MitaSafi free for landlords?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes. Landlords with up to three properties can use MitaSafi completely free. Premium features are available for larger portfolios."
        }
      },
      {
        "@type": "Question",
        "name": "How does tenant screening work?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "We verify tenant identification documents, confirm employment status, and collect references from previous landlords. Applicants have a Tenant Score based on payment history and property care ratings."
        }
      },
      {
        "@type": "Question",
        "name": "What payment methods are supported?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Tenants can pay through mobile money, debit or credit cards, or direct bank transfer. Landlords receive instant confirmation and digital receipts."
        }
      }
    ]
  }
};

export default function LandlordsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <Navbar />
      <main className="min-h-screen">
        {/* Hero Section - Teal gradient background */}
        <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-28 overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-brand-800">
          {/* Background decorations */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-20 left-10 w-72 h-72 bg-white/5 rounded-full blur-3xl" />
            <div className="absolute bottom-10 right-10 w-96 h-96 bg-cta-500/10 rounded-full blur-3xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-500/20 rounded-full blur-3xl" />
          </div>

          <Container>
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left: Content */}
              <div className="text-center lg:text-left">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-white text-sm font-medium mb-6">
                  <Zap className="w-4 h-4 text-cta-400" />
                  Launching Soon in Kenya
                </div>

                {/* Main Headline */}
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
                  Stop Chasing Rent.{" "}
                  <span className="text-cta-400">Start Building</span> a Thriving Rental Business.
                </h1>

                {/* Subheadline */}
                <p className="text-xl text-brand-100 max-w-xl mb-10">
                  List your properties, screen applicants with confidence, and collect rent on time. 
                  Join thousands of landlords across Kenya who are taking the stress out of property management.
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-10">
                  <Link
                    href="/signup?role=landlord&intent=list"
                    className={cn(
                      buttonVariants({ variant: "cta", size: "lg" }),
                      "shadow-strong group text-base"
                    )}
                  >
                    <Megaphone className="w-5 h-5" />
                    List a Vacancy
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <Link
                    href="/signup?role=landlord&intent=manage"
                    className={cn(
                      buttonVariants({ variant: "outline", size: "lg" }),
                      "border-white/30 text-white hover:bg-white/10 group text-base"
                    )}
                  >
                    <LayoutDashboard className="w-5 h-5" />
                    Explore Dashboard
                  </Link>
                </div>

                {/* Trust indicators */}
                <div className="flex flex-wrap justify-center lg:justify-start gap-x-6 gap-y-3 text-sm text-white/80">
                  <span className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-cta-400" />
                    Free for up to 3 properties
                  </span>
                  <span className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-cta-400" />
                    No upfront costs
                  </span>
                  <span className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-cta-400" />
                    Cancel anytime
                  </span>
                </div>
              </div>

              {/* Right: Image */}
              <div className="relative hidden lg:block">
                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl">
                  <Image
                    src="https://syoolvgoaqnckgmngvse.supabase.co/storage/v1/object/public/landing-images/hero/modern-apartment-building.jpg"
                    alt="Modern apartment building managed with MitaSafi in Kenya"
                    fill
                    className="object-cover"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-brand-900/40 to-transparent" />
                </div>
                
                {/* Floating stat cards */}
                <div className="absolute -bottom-6 -left-6 bg-white rounded-xl p-4 shadow-strong">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-cta-100 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-cta-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">3-5 days</p>
                      <p className="text-sm text-gray-500">Average time to fill vacancy</p>
                    </div>
                  </div>
                </div>

                <div className="absolute -top-4 -right-4 bg-white rounded-xl p-4 shadow-strong">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-brand-100 rounded-lg flex items-center justify-center">
                      <UserCheck className="w-6 h-6 text-brand-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">98%</p>
                      <p className="text-sm text-gray-500">On-time rent collection</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Container>
        </section>

        {/* Problem Section - Light background */}
        <section className="py-20 bg-gray-50">
          <Container>
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Image */}
              <div className="relative hidden lg:block order-2">
                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-xl">
                  <Image
                    src="https://syoolvgoaqnckgmngvse.supabase.co/storage/v1/object/public/landing-images/people/landlord-handshake.jpg"
                    alt="Landlord and tenant handshake agreement"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                </div>
              </div>
              
              {/* Content */}
              <div className="order-1">
                <div className="mb-8">
                  <span className="inline-block px-4 py-1.5 bg-cta-100 text-cta-700 text-sm font-semibold rounded-full mb-4">
                    THE REALITY
                  </span>
                  <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
                    Managing Rentals in Kenya Has Been Broken for Too Long
                  </h2>
                </div>

                <div className="space-y-6 text-gray-600">
                <p className="text-lg leading-8 tracking-wide">
                  Every landlord knows the frustration. You list your property on social media and get flooded with spam. 
                  You take a chance on a tenant who seemed trustworthy, only to spend months chasing late payments. 
                  Your caretaker filters information, and you only hear about problems when they become expensive disasters.
                </p>
                <p className="text-lg leading-8 tracking-wide">
                  The traditional way of managing rental properties in Kenya costs you time, money, and peace of mind. 
                  Between vacancy losses, tenant disputes, unreliable payment tracking, and communication breakdowns, 
                  being a landlord often feels like a second job you never signed up for.
                </p>
                <p className="text-lg leading-8 tracking-wide text-brand-700 font-semibold">
                  MitaSafi was built to change that. We created a platform where landlords can finally focus on what matters: 
                  growing their rental income while spending less time on day-to-day headaches.
                </p>
                </div>
              </div>
            </div>
          </Container>
        </section>

        {/* Benefits Section - White background with teal accents */}
        <section className="py-20 bg-white">
          <Container>
            <div className="text-center mb-16">
              <span className="inline-block px-4 py-1.5 bg-brand-100 text-brand-700 text-sm font-semibold rounded-full mb-4">
                WHY MITASAFI
              </span>
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                Everything You Need to Manage Your Properties Professionally
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                From finding quality tenants to collecting rent on time, we handle the hard parts so you do not have to.
              </p>
            </div>

            {/* Dashboard Preview Image */}
            <div className="mb-16">
              <div className="relative max-w-4xl mx-auto rounded-2xl overflow-hidden shadow-2xl border border-gray-200">
                <Image
                  src="https://syoolvgoaqnckgmngvse.supabase.co/storage/v1/object/public/landing-images/people/man-on-laptop.jpg"
                  alt="Landlord managing properties on MitaSafi dashboard"
                  width={1200}
                  height={675}
                  className="w-full h-auto"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-900/20 to-transparent" />
              </div>
              <p className="text-center text-sm text-gray-500 mt-4">Your command center for managing all your properties</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  icon: UserCheck,
                  title: "Quality Tenants, Not Guesswork",
                  description: "Every applicant goes through our verification process. We check IDs, confirm employment, and gather references. See their Tenant Score before making any decision.",
                  color: "brand",
                },
                {
                  icon: Wallet,
                  title: "Rent Collection That Actually Works",
                  description: "Automated reminders, multiple payment methods, instant confirmations, and digital receipts. No more awkward phone calls or chasing payments.",
                  color: "cta",
                },
                {
                  icon: MessageSquare,
                  title: "Direct Communication, No Middlemen",
                  description: "Tenants communicate with you directly through the app. Every message is logged. Maintenance requests come with photos. Know exactly what is happening at your property.",
                  color: "brand",
                },
                {
                  icon: Target,
                  title: "Fill Vacancies Faster",
                  description: "Reach serious, verified renters actively searching for properties like yours. No spam, no agent commissions, just quality leads.",
                  color: "cta",
                },
                {
                  icon: BarChart3,
                  title: "Property Analytics at Your Fingertips",
                  description: "Track views, applications, payment status, and market rates. Make data-driven decisions that maximize your rental income.",
                  color: "brand",
                },
                {
                  icon: BadgeCheck,
                  title: "Build Your Reputation",
                  description: "Verified landlord badge and tenant reviews help you stand out. A strong track record attracts better tenants and fills vacancies faster.",
                  color: "cta",
                },
              ].map((benefit, index) => (
                <div
                  key={index}
                  className={cn(
                    "p-8 rounded-2xl border-2 transition-all duration-300 group hover:shadow-xl",
                    benefit.color === "brand" 
                      ? "border-brand-100 hover:border-brand-300 hover:bg-brand-50/50" 
                      : "border-cta-100 hover:border-cta-300 hover:bg-cta-50/50"
                  )}
                >
                  <div className={cn(
                    "w-14 h-14 rounded-xl flex items-center justify-center mb-5 transition-colors",
                    benefit.color === "brand"
                      ? "bg-brand-100 group-hover:bg-brand-200"
                      : "bg-cta-100 group-hover:bg-cta-200"
                  )}>
                    <benefit.icon className={cn(
                      "w-7 h-7",
                      benefit.color === "brand" ? "text-brand-600" : "text-cta-600"
                    )} />
                  </div>
                  <h3 className="font-bold text-gray-900 text-xl mb-3">{benefit.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{benefit.description}</p>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* How It Works - Orange accent section */}
        <section className="py-20 bg-gradient-to-br from-cta-50 via-cta-100/50 to-white">
          <Container>
            <div className="text-center mb-16">
              <span className="inline-block px-4 py-1.5 bg-cta-500 text-white text-sm font-semibold rounded-full mb-4">
                GET STARTED
              </span>
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                Three Simple Steps to a Stress-Free Rental Business
              </h2>
            </div>

            <div className="max-w-5xl mx-auto">
              <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
                {[
                  {
                    step: "1",
                    title: "Create Your Free Account",
                    description: "Sign up in minutes and verify your identity as a property owner. We will guide you through adding your first property with photos, descriptions, pricing, and availability details.",
                    icon: FileText,
                  },
                  {
                    step: "2",
                    title: "Receive Verified Applications",
                    description: "Serious tenants discover your listing and submit applications through the platform. Review their verified profiles, Tenant Scores, and references before scheduling viewings.",
                    icon: Users,
                  },
                  {
                    step: "3",
                    title: "Manage Everything from Your Dashboard",
                    description: "Once a tenant moves in, track rent payments, handle maintenance requests, and communicate directly through the app. Your entire rental operation in one place.",
                    icon: LayoutDashboard,
                  },
                ].map((item, index) => (
                  <div key={index} className="relative">
                    {/* Connector line */}
                    {index < 2 && (
                      <div className="hidden md:block absolute top-12 left-[60%] w-full h-0.5 bg-gradient-to-r from-cta-300 to-cta-100" />
                    )}
                    
                    <div className="relative bg-white rounded-2xl p-8 shadow-lg border border-cta-100 hover:shadow-xl transition-shadow">
                      {/* Step number */}
                      <div className="w-14 h-14 bg-cta-500 text-white rounded-full flex items-center justify-center text-2xl font-bold mb-6 shadow-lg shadow-cta-500/30">
                        {item.step}
                      </div>
                      
                      <div className="flex items-center gap-3 mb-4">
                        <item.icon className="w-6 h-6 text-cta-600" />
                        <h3 className="font-bold text-gray-900 text-xl">{item.title}</h3>
                      </div>
                      
                      <p className="text-gray-600 leading-relaxed">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-center mt-12 flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/signup?role=landlord&intent=list"
                className={cn(
                  buttonVariants({ variant: "cta", size: "lg" }),
                  "group text-base"
                )}
              >
                <Megaphone className="w-5 h-5" />
                List Your First Vacancy
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/signup?role=landlord&intent=manage"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "group text-base"
                )}
              >
                <Home className="w-5 h-5" />
                Manage Existing Properties
              </Link>
            </div>
          </Container>
        </section>

        {/* Pricing Section - Teal background */}
        <section className="py-20 bg-brand-700">
          <Container>
            <div className="text-center mb-16">
              <span className="inline-block px-4 py-1.5 bg-white/10 text-white text-sm font-semibold rounded-full mb-4">
                PRICING
              </span>
              <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
                Free to Start, Built to Scale
              </h2>
              <p className="text-lg text-brand-100 max-w-2xl mx-auto">
                MitaSafi is free for landlords with up to three properties. 
                No hidden fees. No agent commissions. Just transparent pricing.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
              {/* Free Plan */}
              <div className="bg-white rounded-2xl p-8 shadow-lg">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">Free</h3>
                  <p className="text-sm text-gray-500">For landlords with 1-3 units</p>
                </div>
                
                <div className="text-center mb-6">
                  <span className="text-4xl font-bold text-brand-700">KES 0</span>
                  <span className="text-gray-500 text-sm ml-1">forever</span>
                </div>
                
                <ul className="space-y-3 mb-8">
                  {[
                    { text: "List up to 3 properties", included: true },
                    { text: "Receive applications", included: true },
                    { text: "Message tenants", included: true },
                    { text: "Basic payment tracking", included: true },
                    { text: "Maintenance requests", included: true },
                    { text: "Tenant screening reports", included: false },
                    { text: "Priority listing placement", included: false },
                    { text: "Advanced analytics", included: false },
                  ].map((feature, i) => (
                    <li key={i} className={cn(
                      "flex items-center gap-3 text-sm",
                      feature.included ? "text-gray-700" : "text-gray-400"
                    )}>
                      {feature.included ? (
                        <CheckCircle className="w-5 h-5 text-brand-500 flex-shrink-0" />
                      ) : (
                        <span className="w-5 h-5 flex items-center justify-center text-gray-300 flex-shrink-0">✕</span>
                      )}
                      {feature.text}
                    </li>
                  ))}
                </ul>
                
                <Link
                  href="/signup?role=landlord"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "w-full border-brand-300 text-brand-700 hover:bg-brand-50"
                  )}
                >
                  Get Started Free
                </Link>
              </div>

              {/* Professional Plan */}
              <div className="bg-white rounded-2xl p-8 shadow-xl relative border-2 border-cta-500 transform md:-translate-y-4">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1 bg-cta-500 text-white text-xs font-bold rounded-full whitespace-nowrap">
                    Most Popular
                  </span>
                </div>
                
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">Professional</h3>
                  <p className="text-sm text-gray-500">For landlords with 4-20 units</p>
                </div>
                
                <div className="text-center mb-6">
                  <span className="text-4xl font-bold text-cta-600">KES 2,500</span>
                  <span className="text-gray-500 text-sm ml-1">/month</span>
                </div>
                
                <ul className="space-y-3 mb-8">
                  {[
                    "List up to 20 properties",
                    "Receive applications",
                    "Message tenants",
                    "Automated rent collection",
                    "Maintenance management",
                    "Tenant screening reports",
                    "Priority listing placement",
                    "Basic analytics dashboard",
                  ].map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-gray-700">
                      <CheckCircle className="w-5 h-5 text-cta-500 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                
                <Link
                  href="/signup?role=landlord&plan=professional"
                  className={cn(
                    buttonVariants({ variant: "cta", size: "lg" }),
                    "w-full"
                  )}
                >
                  Start 14-Day Trial
                </Link>
              </div>

              {/* Enterprise Plan */}
              <div className="bg-white rounded-2xl p-8 shadow-lg">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">Enterprise</h3>
                  <p className="text-sm text-gray-500">For property managers with 20+ units</p>
                </div>
                
                <div className="text-center mb-6">
                  <span className="text-4xl font-bold text-gray-900">Custom</span>
                  <span className="text-gray-500 text-sm ml-1">pricing</span>
                </div>
                
                <ul className="space-y-3 mb-8">
                  {[
                    "Unlimited properties",
                    "All Professional features",
                    "Bulk unit management",
                    "Team accounts",
                    "Advanced reporting",
                    "API access",
                    "Dedicated support",
                    "Custom integrations",
                  ].map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-gray-700">
                      <CheckCircle className="w-5 h-5 text-brand-500 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                
                <Link
                  href="/contact?type=enterprise"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "w-full border-brand-300 text-brand-700 hover:bg-brand-50"
                  )}
                >
                  Contact Sales
                </Link>
              </div>
            </div>
          </Container>
        </section>

        {/* Property Showcase Section */}
        <section className="py-20 bg-white">
          <Container>
            <div className="text-center mb-12">
              <span className="inline-block px-4 py-1.5 bg-brand-100 text-brand-700 text-sm font-semibold rounded-full mb-4">
                SHOWCASE YOUR PROPERTIES
              </span>
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                Beautiful Listings That Attract Quality Tenants
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Present your properties professionally with high-quality photos and detailed descriptions
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Property 1 - Large */}
              <div className="lg:col-span-2 lg:row-span-2 relative group rounded-2xl overflow-hidden shadow-lg">
                <div className="relative aspect-[16/10] lg:aspect-auto lg:h-full">
                  <Image
                    src="https://syoolvgoaqnckgmngvse.supabase.co/storage/v1/object/public/landing-images/properties/living-room-modern-1.jpg"
                    alt="Modern living room in rental property"
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <span className="inline-block px-3 py-1 bg-brand-500 text-white text-xs font-bold rounded-full mb-2">FEATURED</span>
                    <h3 className="text-xl font-bold text-white">Spacious 3BR Apartment</h3>
                    <p className="text-white/80 text-sm">Kilimani, Nairobi • KES 85,000/month</p>
                  </div>
                </div>
              </div>

              {/* Property 2 */}
              <div className="relative group rounded-2xl overflow-hidden shadow-lg">
                <div className="relative aspect-[4/3]">
                  <Image
                    src="https://syoolvgoaqnckgmngvse.supabase.co/storage/v1/object/public/landing-images/properties/kitchen-modern-1.jpg"
                    alt="Modern kitchen in rental property"
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="text-lg font-bold text-white">2BR with Modern Kitchen</h3>
                    <p className="text-white/80 text-xs">Westlands • KES 55,000/month</p>
                  </div>
                </div>
              </div>

              {/* Property 3 */}
              <div className="relative group rounded-2xl overflow-hidden shadow-lg">
                <div className="relative aspect-[4/3]">
                  <Image
                    src="https://syoolvgoaqnckgmngvse.supabase.co/storage/v1/object/public/landing-images/properties/apartment-exterior-1.jpg"
                    alt="Apartment building exterior"
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="text-lg font-bold text-white">Secure Apartment Complex</h3>
                    <p className="text-white/80 text-xs">Lavington • From KES 45,000/month</p>
                  </div>
                </div>
              </div>
            </div>
          </Container>
        </section>

        {/* Testimonials Section - Light background */}
        <section className="py-20 bg-gray-50">
          <Container>
            <div className="text-center mb-16">
              <span className="inline-block px-4 py-1.5 bg-brand-100 text-brand-700 text-sm font-semibold rounded-full mb-4">
                SUCCESS STORIES
              </span>
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                Trusted by Property Owners Across Kenya
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  quote: "I used to spend the first week of every month chasing rent and worrying about who actually paid. Since switching to MitaSafi, payments come in automatically and I have receipts for everything. I wish this existed years ago.",
                  name: "James Mwangi",
                  role: "Property Owner, 8 Units",
                  image: "https://syoolvgoaqnckgmngvse.supabase.co/storage/v1/object/public/landing-images/people/testimonial-man-1.jpg",
                  rating: 5,
                },
                {
                  quote: "Finding tenants used to take months. My last vacancy was filled in ten days because I could see exactly who was applying and make a confident decision. The Tenant Score feature is a game changer.",
                  name: "Grace Wanjiku",
                  role: "Landlord, 3 Units",
                  image: "https://syoolvgoaqnckgmngvse.supabase.co/storage/v1/object/public/landing-images/people/testimonial-woman-1.jpg",
                  rating: 5,
                },
                {
                  quote: "The direct communication with tenants means I actually know what is happening at my properties. No more surprises. No more expensive problems that could have been fixed early. I finally feel in control.",
                  name: "Peter Kamau",
                  role: "Property Manager, 15 Units",
                  image: "https://syoolvgoaqnckgmngvse.supabase.co/storage/v1/object/public/landing-images/people/testimonial-man-2.jpg",
                  rating: 5,
                },
              ].map((testimonial, index) => (
                <div
                  key={index}
                  className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow"
                >
                  {/* Stars */}
                  <div className="flex gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 text-cta-500 fill-current" />
                    ))}
                  </div>
                  
                  {/* Quote */}
                  <blockquote className="text-gray-700 mb-6 leading-relaxed">
                    &ldquo;{testimonial.quote}&rdquo;
                  </blockquote>
                  
                  {/* Author */}
                  <div className="flex items-center gap-4">
                    <div className="relative w-12 h-12 rounded-full overflow-hidden">
                      <Image
                        src={testimonial.image}
                        alt={testimonial.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{testimonial.name}</p>
                      <p className="text-sm text-gray-500">{testimonial.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* FAQ Section - White background */}
        <section className="py-20 bg-white">
          <Container>
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-12">
                <span className="inline-block px-4 py-1.5 bg-cta-100 text-cta-700 text-sm font-semibold rounded-full mb-4">
                  FAQ
                </span>
                <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                  Common Questions from Landlords
                </h2>
              </div>

              <div className="space-y-4">
                {[
                  {
                    q: "Is MitaSafi really free?",
                    a: "Yes. Landlords with up to three properties can use MitaSafi completely free. You can list properties, receive applications, communicate with tenants, and collect rent at no cost. Premium features are available for larger portfolios, but there is no pressure to upgrade."
                  },
                  {
                    q: "How does tenant screening work?",
                    a: "We verify tenant identification documents, confirm employment status through official channels, and collect references from previous landlords within our ecosystem. Applicants also have a Tenant Score based on their payment history and property care ratings, which you can review before making any decisions."
                  },
                  {
                    q: "What payment methods do tenants use?",
                    a: "Tenants can pay rent through mobile money, debit or credit cards, or direct bank transfer. You receive funds to your linked account with instant confirmation and digital receipts for every transaction."
                  },
                  {
                    q: "How long does it take to fill a vacancy?",
                    a: "Most landlords receive qualified applications within the first week of listing. Average time from listing to signed lease is under two weeks, compared to months using traditional methods. Your results depend on pricing, location, and property condition."
                  },
                  {
                    q: "Can I manage multiple properties?",
                    a: "Absolutely. Your dashboard shows all properties in one view. You can track vacancies, applications, payments, and maintenance requests across your entire portfolio. Premium plans include bulk management tools for landlords with larger portfolios."
                  },
                  {
                    q: "Do you operate outside major cities?",
                    a: "We are starting with major urban areas in Kenya and expanding based on demand. If your property is outside our current coverage, you can still create an account and we will notify you when we launch in your area."
                  },
                  {
                    q: "Are there any hidden fees or commissions?",
                    a: "None. We do not charge agent commissions or add hidden fees to transactions. Our revenue comes from optional premium subscriptions, not from taking a cut of your rental income."
                  },
                ].map((faq, index) => (
                  <details
                    key={index}
                    className="group bg-gray-50 rounded-xl border border-gray-200 overflow-hidden"
                  >
                    <summary className="flex items-center justify-between p-6 cursor-pointer list-none">
                      <h3 className="font-semibold text-gray-900 pr-4">{faq.q}</h3>
                      <ChevronDown className="w-5 h-5 text-gray-500 group-open:rotate-180 transition-transform flex-shrink-0" />
                    </summary>
                    <div className="px-6 pb-6 pt-0">
                      <p className="text-gray-600 leading-relaxed">{faq.a}</p>
                    </div>
                  </details>
                ))}
              </div>
            </div>
          </Container>
        </section>

        {/* Final CTA Section - Orange gradient */}
        <section className="py-20 bg-gradient-to-br from-cta-500 via-cta-600 to-cta-700 relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 left-0 w-72 h-72 bg-cta-400/30 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2" />
          </div>
          
          <Container className="relative">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-3xl lg:text-5xl font-bold text-white mb-6">
                Ready to Simplify Your Rental Business?
              </h2>
              <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto">
                Whether you own one property or manage dozens, MitaSafi gives you the tools to find better tenants, 
                collect rent reliably, and stay informed about your investments.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/signup?role=landlord&intent=list"
                  className={cn(
                    buttonVariants({ variant: "white", size: "lg" }),
                    "group text-base shadow-xl"
                  )}
                >
                  <Megaphone className="w-5 h-5" />
                  List Your First Vacancy
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  href="/signup?role=landlord&intent=manage"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "border-white/30 text-white hover:bg-white/10 group text-base"
                  )}
                >
                  <LayoutDashboard className="w-5 h-5" />
                  Explore the Dashboard
                </Link>
              </div>

              {/* Trust badges */}
              <div className="mt-12 flex flex-wrap justify-center gap-8 text-white/70 text-sm">
                <span className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Secure & Encrypted
                </span>
                <span className="flex items-center gap-2">
                  <Headphones className="w-5 h-5" />
                  24/7 Support
                </span>
                <span className="flex items-center gap-2">
                  <Receipt className="w-5 h-5" />
                  No Hidden Fees
                </span>
              </div>
            </div>
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
