import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Navbar, Footer } from "@/components/landing";
import { Container } from "@/components/ui";
import { buttonVariants } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { 
  Wrench, 
  Users, 
  CreditCard, 
  Star, 
  Calendar, 
  MapPin,
  ArrowRight,
  CheckCircle,
  Clock,
  Zap,
  Shield,
  TrendingUp,
  BadgeCheck,
  Wallet,
  MessageSquare,
  Bell,
  ChevronDown,
  Camera,
  FileText,
  Handshake,
  Target,
  Award,
  Phone
} from "lucide-react";

export const metadata: Metadata = {
  title: "For Service Providers | Plumbers, Electricians & Fundis | MitaSafi Kenya",
  description: "Join Kenya's trusted network of service providers. Get steady jobs, secure payments, and build your reputation. Free to join. Plumbers, electricians, cleaners, movers welcome.",
  keywords: "fundi jobs Kenya, plumber jobs Nairobi, electrician work Kenya, service provider platform, handyman jobs, cleaning jobs Kenya, property maintenance jobs",
  openGraph: {
    title: "For Service Providers | MitaSafi Kenya",
    description: "Get steady jobs, secure payments, and build your reputation. Join Kenya's trusted network of plumbers, electricians, cleaners, and fundis.",
    type: "website",
    url: "https://mitasafi.co.ke/service-providers",
    images: [
      {
        url: "https://syoolvgoaqnckgmngvse.supabase.co/storage/v1/object/public/landing-images/hero/modern-apartment-building.jpg",
        width: 1200,
        height: 630,
        alt: "MitaSafi service provider network in Kenya",
      },
    ],
  },
};

// Structured Data for SEO
const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "For Service Providers | MitaSafi",
  "description": "Join MitaSafi's network of trusted service providers. Get steady work, secure payments, and build your reputation.",
  "url": "https://mitasafi.co.ke/service-providers",
  "mainEntity": {
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Is it free to join MitaSafi as a service provider?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes. Joining MitaSafi is completely free. We only charge a small service fee when you successfully complete a job and get paid."
        }
      },
      {
        "@type": "Question",
        "name": "How do I get paid for jobs?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Clients pay through the platform using mobile money, card, or bank transfer. For larger jobs, funds are held in escrow and released to you upon completion."
        }
      },
      {
        "@type": "Question",
        "name": "What services are in demand?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Plumbing, electrical work, cleaning, moving, painting, carpentry, pest control, and general handyman services are consistently in high demand."
        }
      }
    ]
  }
};

export default function ServiceProvidersPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <Navbar />
      <main className="min-h-screen">
        {/* Hero Section - Brand gradient background */}
        <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-28 overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-brand-800">
          {/* Background decorations */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-20 left-10 w-72 h-72 bg-white/5 rounded-full blur-3xl" />
            <div className="absolute bottom-10 right-10 w-96 h-96 bg-cta-500/10 rounded-full blur-3xl" />
          </div>

          <Container>
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left: Content */}
              <div className="text-center lg:text-left">
                {/* Main Headline */}
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
                  Stop Waiting for Referrals.{" "}
                  <span className="text-cta-400">Start Getting</span> Steady Work.
                </h1>

                {/* Subheadline */}
                <p className="text-xl text-brand-100 max-w-xl mb-10">
                  Connect with property owners and tenants who need plumbers, electricians, cleaners, 
                  movers, and fundis. Build your reputation. Get paid on time.
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-10">
                  <Link
                    href="/signup?role=provider"
                    className={cn(
                      buttonVariants({ variant: "cta", size: "lg" }),
                      "shadow-strong group text-base"
                    )}
                  >
                    <Wrench className="w-5 h-5" />
                    Join as a Provider
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <Link
                    href="#how-it-works"
                    className={cn(
                      buttonVariants({ variant: "outline", size: "lg" }),
                      "border-white/30 text-white hover:bg-white/10 group text-base"
                    )}
                  >
                    See How It Works
                  </Link>
                </div>

                {/* Trust indicators */}
                <div className="flex flex-wrap justify-center lg:justify-start gap-x-6 gap-y-3 text-sm text-white/80">
                  <span className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-cta-400" />
                    Free to join
                  </span>
                  <span className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-cta-400" />
                    Get paid securely
                  </span>
                  <span className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-cta-400" />
                    Set your own rates
                  </span>
                </div>
              </div>

              {/* Right: Stats cards */}
              <div className="relative hidden lg:block">
                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl">
                  <Image
                    src="https://syoolvgoaqnckgmngvse.supabase.co/storage/v1/object/public/landing-images/people/service-provider-electrician.jpg"
                    alt="Professional electrician at work in Kenya"
                    fill
                    className="object-cover"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-brand-900/60 to-transparent" />
                </div>
                
                {/* Floating stat cards */}
                <div className="absolute -bottom-6 -left-6 bg-white rounded-xl p-4 shadow-strong">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-cta-100 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-cta-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">2x</p>
                      <p className="text-sm text-gray-500">Average income increase</p>
                    </div>
                  </div>
                </div>

                <div className="absolute -top-4 -right-4 bg-white rounded-xl p-4 shadow-strong">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-brand-100 rounded-lg flex items-center justify-center">
                      <Users className="w-6 h-6 text-brand-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">5,000+</p>
                      <p className="text-sm text-gray-500">Property owners waiting</p>
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
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <span className="inline-block px-4 py-1.5 bg-cta-100 text-cta-700 text-sm font-semibold rounded-full mb-4">
                  THE STRUGGLE IS REAL
                </span>
                <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
                  Being a Skilled Fundi in Kenya Is Harder Than It Should Be
                </h2>
              </div>

              <div className="space-y-6 text-gray-600">
                <p className="text-lg leading-8 tracking-wide">
                  You are good at what you do. Maybe you are a plumber who can fix any leak, an electrician 
                  who has been wiring buildings for years, or a cleaner with clients who swear by your 
                  attention to detail. But finding consistent work? That is a different challenge entirely.
                </p>
                <p className="text-lg leading-8 tracking-wide">
                  Some weeks, your phone does not stop ringing. Other weeks, nothing. You depend on 
                  referrals, but referrals are unpredictable. You compete against providers who undercut 
                  your prices, even when their work is inferior. And when you do get a job, you 
                  sometimes have to chase payment for weeks.
                </p>
                <p className="text-lg leading-8 tracking-wide">
                  The hardest part? Every new client treats you like a stranger. You have to prove 
                  yourself from scratch each time, no matter how many satisfied customers you have 
                  served before. Your reputation does not travel with you.
                </p>
                <p className="text-lg leading-8 tracking-wide text-brand-700 font-semibold">
                  MitaSafi changes the game. We connect you directly with property owners and tenants 
                  who need your skills. Your ratings follow you. Your payments are protected. Your 
                  schedule fills up without you having to hustle for every job.
                </p>
              </div>
            </div>
          </Container>
        </section>

        {/* Service Categories - Visual Showcase */}
        <section className="py-20 bg-white">
          <Container>
            <div className="text-center mb-12">
              <span className="inline-block px-4 py-1.5 bg-brand-100 text-brand-700 text-sm font-semibold rounded-full mb-4">
                HIGH DEMAND
              </span>
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                Services People Are Actively Searching For
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Join in your specialty and start receiving job requests from tenants, landlords, and homeowners
              </p>
            </div>

            {/* Bento grid of service images */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-12">
              {/* Electrician - Large */}
              <div className="col-span-2 row-span-2 relative group rounded-3xl overflow-hidden shadow-lg">
                <div className="relative aspect-square">
                  <Image
                    src="https://syoolvgoaqnckgmngvse.supabase.co/storage/v1/object/public/landing-images/people/service-provider-electrician.jpg"
                    alt="Professional electrician at work"
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <span className="inline-block px-3 py-1 bg-cta-500 text-white text-xs font-bold rounded-full mb-2">HIGH DEMAND</span>
                    <h3 className="text-2xl font-bold text-white">Electrical Work</h3>
                    <p className="text-white/80 text-sm mt-1">Wiring, repairs, installations</p>
                  </div>
                </div>
              </div>

              {/* Plumber */}
              <div className="relative group rounded-3xl overflow-hidden shadow-lg">
                <div className="relative aspect-square">
                  <Image
                    src="https://syoolvgoaqnckgmngvse.supabase.co/storage/v1/object/public/landing-images/people/service-provider-plumber.jpg"
                    alt="Professional plumber fixing pipes"
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="text-lg font-bold text-white">Plumbing</h3>
                    <p className="text-white/80 text-xs">Pipes, fixtures, drainage</p>
                  </div>
                </div>
              </div>

              {/* Cleaner */}
              <div className="relative group rounded-3xl overflow-hidden shadow-lg">
                <div className="relative aspect-square">
                  <Image
                    src="https://syoolvgoaqnckgmngvse.supabase.co/storage/v1/object/public/landing-images/people/cleaner-professional.jpg"
                    alt="Professional cleaner at work"
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="text-lg font-bold text-white">Cleaning</h3>
                    <p className="text-white/80 text-xs">Homes, offices, deep clean</p>
                  </div>
                </div>
              </div>

              {/* Movers - Wide */}
              <div className="col-span-2 relative group rounded-3xl overflow-hidden shadow-lg">
                <div className="relative aspect-[2/1]">
                  <Image
                    src="https://syoolvgoaqnckgmngvse.supabase.co/storage/v1/object/public/landing-images/people/movers-services.png"
                    alt="Professional moving team"
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <h3 className="text-xl font-bold text-white">Moving Services</h3>
                    <p className="text-white/80 text-sm">Packing, transport, setup</p>
                  </div>
                </div>
              </div>
            </div>

            {/* More services tags */}
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-4">And many more services:</p>
              <div className="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
                {[
                  "Painting", "HVAC", "Carpentry", "Pest Control", 
                  "Security", "Gardening", "Appliance Repair", "General Handyman"
                ].map((service, index) => (
                  <span
                    key={index}
                    className="px-4 py-2 bg-gray-100 hover:bg-brand-100 hover:text-brand-700 rounded-full text-sm font-medium text-gray-600 transition-colors cursor-default"
                  >
                    {service}
                  </span>
                ))}
              </div>
            </div>
          </Container>
        </section>

        {/* Benefits Section */}
        <section className="py-20 bg-gradient-to-br from-brand-50 via-white to-cta-50">
          <Container>
            <div className="text-center mb-16">
              <span className="inline-block px-4 py-1.5 bg-brand-100 text-brand-700 text-sm font-semibold rounded-full mb-4">
                WHY JOIN
              </span>
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                Everything You Need to Build a Thriving Service Business
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                More than just job listings. MitaSafi protects your payments, builds your reputation, and keeps your calendar full.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  icon: Target,
                  title: "Steady Flow of Jobs",
                  description: "No more feast or famine. Get connected with property owners and tenants who need your services right now. Scheduled maintenance contracts mean predictable income.",
                  color: "brand",
                },
                {
                  icon: Wallet,
                  title: "Payments You Can Count On",
                  description: "Get paid securely through mobile money, card, or bank transfer. For larger jobs, escrow protects both you and the client. No more chasing payments for weeks.",
                  color: "cta",
                },
                {
                  icon: BadgeCheck,
                  title: "Reputation That Travels",
                  description: "Your ratings and reviews follow you. Every satisfied client strengthens your profile. Verified badge shows clients you are the real deal.",
                  color: "brand",
                },
                {
                  icon: Calendar,
                  title: "Work on Your Terms",
                  description: "Set your own rates and availability. Accept jobs that fit your schedule. See upcoming bookings so you can plan your week. You are in control.",
                  color: "cta",
                },
                {
                  icon: MapPin,
                  title: "Jobs in Your Area",
                  description: "Define your service areas and get requests nearby. No more wasting time traveling across the city for small jobs. Work efficiently.",
                  color: "brand",
                },
                {
                  icon: Camera,
                  title: "Showcase Your Work",
                  description: "Build a portfolio with photos of completed projects. Detailed reviews tell potential clients exactly what to expect. Stand out from the competition.",
                  color: "cta",
                },
              ].map((benefit, index) => (
                <div
                  key={index}
                  className={cn(
                    "p-8 rounded-2xl border-2 transition-all duration-300 group hover:shadow-xl bg-white",
                    benefit.color === "brand" 
                      ? "border-brand-100 hover:border-brand-300" 
                      : "border-cta-100 hover:border-cta-300"
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

        {/* How It Works - Orange accent */}
        <section id="how-it-works" className="py-20 bg-gradient-to-br from-cta-50 via-cta-100/50 to-white">
          <Container>
            <div className="text-center mb-16">
              <span className="inline-block px-4 py-1.5 bg-cta-500 text-white text-sm font-semibold rounded-full mb-4">
                GET STARTED
              </span>
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                Three Steps to Your First Job
              </h2>
            </div>

            <div className="max-w-5xl mx-auto">
              <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
                {[
                  {
                    step: "1",
                    title: "Create Your Profile",
                    description: "Sign up free, list your services, set your rates, and define your service areas. Add photos of past work to showcase your skills. The more complete your profile, the more jobs you attract.",
                    icon: FileText,
                  },
                  {
                    step: "2",
                    title: "Get Verified",
                    description: "Complete our simple verification process. We check your ID and basic credentials. Verified providers earn a trusted badge that makes clients choose them over unverified competition.",
                    icon: BadgeCheck,
                  },
                  {
                    step: "3",
                    title: "Start Earning",
                    description: "Receive job notifications in your area. Accept the ones that fit your schedule. Complete the work, get rated, and receive secure payment. Build your reputation with every job.",
                    icon: Wallet,
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

            {/* Movers image banner */}
            <div className="mt-16 relative rounded-2xl overflow-hidden shadow-xl">
              <div className="relative h-64 md:h-80">
                <Image
                  src="https://syoolvgoaqnckgmngvse.supabase.co/storage/v1/object/public/landing-images/people/movers-services.png"
                  alt="Professional moving team at work"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-cta-600/90 to-cta-600/60" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white px-6">
                    <h3 className="text-2xl md:text-3xl font-bold mb-4">Join 500+ Service Providers Already on MitaSafi</h3>
                    <Link
                      href="/signup?role=provider"
                      className={cn(
                        buttonVariants({ variant: "white", size: "lg" }),
                        "group text-base shadow-xl"
                      )}
                    >
                      <Wrench className="w-5 h-5" />
                      Join Our Network Free
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </Container>
        </section>

        {/* Testimonials Section */}
        <section className="py-20 bg-white">
          <Container>
            <div className="text-center mb-16">
              <span className="inline-block px-4 py-1.5 bg-brand-100 text-brand-700 text-sm font-semibold rounded-full mb-4">
                SUCCESS STORIES
              </span>
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                Hear from Providers Already Growing with MitaSafi
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  quote: "Before MitaSafi, I relied completely on word of mouth. Some months were great, others I struggled to pay bills. Now I have consistent bookings and my income has more than doubled. The verified badge really makes a difference.",
                  name: "Peter Kamau",
                  role: "Licensed Electrician, 8 years experience",
                  image: "https://syoolvgoaqnckgmngvse.supabase.co/storage/v1/object/public/landing-images/people/testimonial-man-1.jpg",
                  rating: 5,
                },
                {
                  quote: "The payment protection is what sold me. I used to have clients who would delay payment for months. Now the money is secure before I even start the job. I can focus on my work instead of chasing invoices.",
                  name: "Mary Wanjiru",
                  role: "Professional Cleaner, 5 years experience",
                  image: "https://syoolvgoaqnckgmngvse.supabase.co/storage/v1/object/public/landing-images/people/testimonial-woman-1.jpg",
                  rating: 5,
                },
                {
                  quote: "What I love most is that my reputation follows me. Every good review makes my profile stronger. New clients trust me before we even meet because they can see my track record. It is like having a recommendation letter that keeps growing.",
                  name: "John Ochieng",
                  role: "Plumber & Handyman, 12 years experience",
                  image: "https://syoolvgoaqnckgmngvse.supabase.co/storage/v1/object/public/landing-images/people/testimonial-man-2.jpg",
                  rating: 5,
                },
              ].map((testimonial, index) => (
                <div
                  key={index}
                  className="bg-gray-50 rounded-2xl p-8 border border-gray-100 hover:shadow-lg transition-shadow"
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

        {/* FAQ Section */}
        <section className="py-20 bg-gray-50">
          <Container>
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-12">
                <span className="inline-block px-4 py-1.5 bg-cta-100 text-cta-700 text-sm font-semibold rounded-full mb-4">
                  FAQ
                </span>
                <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                  Common Questions from Service Providers
                </h2>
              </div>

              <div className="space-y-4">
                {[
                  {
                    q: "Is it really free to join?",
                    a: "Yes. Creating your profile and getting verified is completely free. We only charge a small service fee when you successfully complete a job and receive payment. You never pay anything upfront."
                  },
                  {
                    q: "How do payments work?",
                    a: "Clients pay through the MitaSafi platform using mobile money, debit or credit card, or bank transfer. For larger jobs, we hold the funds in escrow and release them to you once the client confirms the work is complete. This protects both parties."
                  },
                  {
                    q: "What if a client does not pay?",
                    a: "For jobs booked through the platform, payment is secured before work begins. The escrow system means you will never complete a job and then have to chase payment. All communication is logged in case of any disputes."
                  },
                  {
                    q: "How do I get more jobs?",
                    a: "Complete your profile with photos of your work, maintain high ratings, respond quickly to requests, and deliver quality service. Verified providers with strong reviews consistently get more bookings."
                  },
                  {
                    q: "Can I set my own prices?",
                    a: "Absolutely. You set your own rates for each service you offer. You can also adjust pricing based on job complexity, urgency, or location. You are in full control of what you charge."
                  },
                  {
                    q: "What areas do you cover?",
                    a: "We are launching in major urban areas across Kenya. You can define your preferred service areas in your profile, and you will only receive job requests within those zones."
                  },
                ].map((faq, index) => (
                  <details
                    key={index}
                    className="group bg-white rounded-xl border border-gray-200 overflow-hidden"
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

        {/* Final CTA - Orange gradient */}
        <section className="py-20 bg-gradient-to-br from-cta-500 via-cta-600 to-cta-700 relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 left-0 w-72 h-72 bg-cta-400/30 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2" />
          </div>

          <Container className="relative">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-3xl lg:text-5xl font-bold text-white mb-6">
                Ready to Grow Your Service Business?
              </h2>
              <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto">
                Join MitaSafi today and connect with property owners who need your skills. 
                Free to join. Secure payments. Your reputation, protected and growing.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/signup?role=provider"
                  className={cn(
                    buttonVariants({ variant: "white", size: "lg" }),
                    "group text-base shadow-xl"
                  )}
                >
                  <Wrench className="w-5 h-5" />
                  Join as a Provider
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  href="/contact?type=partnership"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "border-white/30 text-white hover:bg-white/10 group text-base"
                  )}
                >
                  <Phone className="w-5 h-5" />
                  Talk to Our Team
                </Link>
              </div>

              {/* Trust badges */}
              <div className="mt-12 flex flex-wrap justify-center gap-8 text-white/70 text-sm">
                <span className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Payment Protection
                </span>
                <span className="flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  Verified Badge Program
                </span>
                <span className="flex items-center gap-2">
                  <Handshake className="w-5 h-5" />
                  Dispute Resolution
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
