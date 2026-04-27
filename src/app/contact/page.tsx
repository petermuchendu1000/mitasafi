"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Navbar, Footer } from "@/components/landing";
import { Container } from "@/components/ui";
import { buttonVariants } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { 
  Mail, 
  Phone, 
  MapPin, 
  MessageSquare,
  Building2,
  Send,
  CheckCircle,
  ArrowRight
} from "lucide-react";
import { Suspense } from "react";

function ContactForm() {
  const searchParams = useSearchParams();
  const inquiryType = searchParams.get("type") || "general";
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    type: inquiryType,
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsSubmitting(false);
    setIsSubmitted(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  if (isSubmitted) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-8 lg:p-12 text-center">
        <div className="w-16 h-16 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-8 h-8 text-success-600" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-4">
          Message Received!
        </h3>
        <p className="text-gray-600 mb-8">
          Thank you for reaching out. Our team will get back to you within 24-48 hours.
        </p>
        <Link
          href="/"
          className={buttonVariants({ variant: "primary", size: "lg" })}
        >
          Back to Home
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-8 lg:p-12">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Send us a message</h2>
      
      <div className="space-y-6">
        {/* Name and Email */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Full Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
              placeholder="Your name"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
              placeholder="you@example.com"
            />
          </div>
        </div>

        {/* Phone and Company */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
              placeholder="+254 7XX XXX XXX"
            />
          </div>
          <div>
            <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
              Company Name
            </label>
            <input
              type="text"
              id="company"
              name="company"
              value={formData.company}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
              placeholder="Your company"
            />
          </div>
        </div>

        {/* Inquiry Type */}
        <div>
          <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
            Inquiry Type *
          </label>
          <select
            id="type"
            name="type"
            required
            value={formData.type}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
          >
            <option value="general">General Inquiry</option>
            <option value="enterprise">Enterprise / Property Management</option>
            <option value="partnership">Partnership Opportunity</option>
            <option value="support">Technical Support</option>
            <option value="press">Press / Media</option>
          </select>
        </div>

        {/* Message */}
        <div>
          <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
            Message *
          </label>
          <textarea
            id="message"
            name="message"
            required
            rows={5}
            value={formData.message}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors resize-none"
            placeholder="Tell us how we can help..."
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            buttonVariants({ variant: "primary", size: "lg" }),
            "w-full justify-center",
            isSubmitting && "opacity-70 cursor-not-allowed"
          )}
        >
          {isSubmitting ? (
            <>
              <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
              Sending...
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              Send Message
            </>
          )}
        </button>
      </div>
    </form>
  );
}

function ContactFormWrapper() {
  return (
    <Suspense fallback={
      <div className="bg-white rounded-2xl shadow-xl p-8 lg:p-12 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-48 mb-6" />
        <div className="space-y-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="h-12 bg-gray-200 rounded" />
            <div className="h-12 bg-gray-200 rounded" />
          </div>
          <div className="h-12 bg-gray-200 rounded" />
          <div className="h-32 bg-gray-200 rounded" />
        </div>
      </div>
    }>
      <ContactForm />
    </Suspense>
  );
}

export default function ContactPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        {/* Hero Section */}
        <section className="relative pt-32 pb-12 lg:pt-40 lg:pb-16 overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-0 left-1/2 w-[600px] h-[600px] bg-brand-100/50 rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2" />
          </div>

          <Container>
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight mb-6">
                Get in Touch
              </h1>
              <p className="text-xl text-gray-600">
                Have questions about MitaSafi? We&apos;d love to hear from you. 
                Our team is here to help.
              </p>
            </div>
          </Container>
        </section>

        {/* Contact Section */}
        <section className="py-12 lg:py-20">
          <Container>
            <div className="grid lg:grid-cols-5 gap-12 lg:gap-16">
              {/* Contact Info */}
              <div className="lg:col-span-2 space-y-8">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">
                    Contact Information
                  </h2>
                  <p className="text-gray-600 mb-8">
                    Reach out to us through any of these channels. We typically respond 
                    within 24 hours.
                  </p>
                </div>

                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-brand-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Mail className="w-6 h-6 text-brand-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">Email</h3>
                      <a href="mailto:hello@mitasafi.co.ke" className="text-brand-600 hover:text-brand-700">
                        hello@mitasafi.co.ke
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-brand-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Phone className="w-6 h-6 text-brand-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">Phone</h3>
                      <a href="tel:+254700000000" className="text-brand-600 hover:text-brand-700">
                        +254 700 000 000
                      </a>
                      <p className="text-sm text-gray-500 mt-1">Mon-Fri, 9am-6pm EAT</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-brand-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-6 h-6 text-brand-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">Office</h3>
                      <p className="text-gray-600">
                        Nairobi, Kenya<br />
                        <span className="text-sm text-gray-500">(By appointment only)</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Enterprise CTA */}
                <div className="bg-cta-50 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Building2 className="w-6 h-6 text-cta-600" />
                    <h3 className="font-semibold text-gray-900">Enterprise Solutions</h3>
                  </div>
                  <p className="text-gray-600 text-sm mb-4">
                    Managing 20+ properties? Let&apos;s discuss a custom solution for your portfolio.
                  </p>
                  <Link
                    href="/signup?role=landlord"
                    className="text-cta-600 hover:text-cta-700 font-medium text-sm inline-flex items-center gap-1"
                  >
                    Learn about Enterprise
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {/* Contact Form */}
              <div className="lg:col-span-3">
                <ContactFormWrapper />
              </div>
            </div>
          </Container>
        </section>

        {/* FAQ Teaser */}
        <section className="py-16 bg-gray-50">
          <Container>
            <div className="text-center">
              <MessageSquare className="w-12 h-12 text-brand-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Looking for Quick Answers?
              </h2>
              <p className="text-gray-600 mb-6 max-w-lg mx-auto">
                Check out our frequently asked questions for instant answers to common inquiries.
              </p>
              <Link
                href="/#faq"
                className={buttonVariants({ variant: "secondary", size: "lg" })}
              >
                View FAQ
              </Link>
            </div>
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
