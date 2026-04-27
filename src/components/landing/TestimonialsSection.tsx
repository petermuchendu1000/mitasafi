"use client";

import { Section, SectionHeader, Container, TestimonialCard } from "@/components/ui";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const testimonials = [
  {
    quote:
      "I was so tired of fake photos and hidden fees. With MitaSafi, what I saw online was exactly what I got. Found my apartment in Kilimani in just one week!",
    author: "Wanjiku Mwangi",
    role: "Marketing Manager",
    location: "Kilimani",
    image: "https://syoolvgoaqnckgmngvse.supabase.co/storage/v1/object/public/landing-images/people/testimonial-woman-1.jpg",
    rating: 5,
  },
  {
    quote:
      "As a landlord with 8 units, rent collection used to be a nightmare. Now tenants pay through the app and I get automatic reports. Game changer!",
    author: "James Ochieng",
    role: "Property Owner",
    location: "Westlands",
    image: "https://syoolvgoaqnckgmngvse.supabase.co/storage/v1/object/public/landing-images/people/testimonial-man-1.jpg",
    rating: 5,
  },
  {
    quote:
      "The digital receipts saved me during a dispute. My previous landlord claimed I hadn't paid, but I had proof for every single payment. Thank you MitaSafi!",
    author: "Grace Akinyi",
    role: "Software Developer",
    location: "South B",
    image: "https://syoolvgoaqnckgmngvse.supabase.co/storage/v1/object/public/landing-images/people/testimonial-woman-2.jpg",
    rating: 5,
  },
  {
    quote:
      "I've been a plumber for 15 years. Since joining MitaSafi's service network, I get consistent work and always get paid on time. My income has grown by 60%!",
    author: "Peter Mutua",
    role: "Licensed Plumber",
    location: "Nairobi",
    image: "https://syoolvgoaqnckgmngvse.supabase.co/storage/v1/object/public/landing-images/people/testimonial-man-2.jpg",
    rating: 5,
  },
  {
    quote:
      "Moving to Nairobi from Mombasa, I didn't know anyone. MitaSafi let me tour apartments virtually and chat with landlords before I even arrived. Moved in stress-free!",
    author: "Amina Hassan",
    role: "Nurse",
    location: "Langata",
    image: "https://syoolvgoaqnckgmngvse.supabase.co/storage/v1/object/public/landing-images/people/testimonial-woman-3.jpg",
    rating: 5,
  },
  {
    quote:
      "The maintenance tracking feature is brilliant. My tenants report issues with photos, I assign a service provider, and everyone stays informed. Professional management made easy.",
    author: "Daniel Kamau",
    role: "Property Manager",
    location: "Karen",
    image: "https://syoolvgoaqnckgmngvse.supabase.co/storage/v1/object/public/landing-images/people/testimonial-man-3.jpg",
    rating: 5,
  },
];

export function TestimonialsSection() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    const container = scrollContainerRef.current;
    if (container) {
      setCanScrollLeft(container.scrollLeft > 0);
      setCanScrollRight(
        container.scrollLeft < container.scrollWidth - container.clientWidth - 10
      );
    }
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener("scroll", checkScroll);
      checkScroll();
      return () => container.removeEventListener("scroll", checkScroll);
    }
  }, []);

  const scroll = (direction: "left" | "right") => {
    const container = scrollContainerRef.current;
    if (container) {
      const cardWidth = 400;
      const scrollAmount = direction === "left" ? -cardWidth : cardWidth;
      container.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  return (
    <Section background="cta-light" id="testimonials">
      <Container>
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-10">
          <SectionHeader
            eyebrow="Testimonials"
            title="Loved by Renters Across Nairobi"
            description="Real stories from real people who found their homes with MitaSafi."
            align="left"
          />

          {/* Navigation Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => scroll("left")}
              disabled={!canScrollLeft}
              className={cn(
                "p-3 rounded-full border border-gray-200 transition-all duration-200",
                canScrollLeft
                  ? "hover:bg-brand-50 hover:border-brand-200 text-gray-700"
                  : "opacity-40 cursor-not-allowed text-gray-400"
              )}
              aria-label="Previous testimonials"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => scroll("right")}
              disabled={!canScrollRight}
              className={cn(
                "p-3 rounded-full border border-gray-200 transition-all duration-200",
                canScrollRight
                  ? "hover:bg-brand-50 hover:border-brand-200 text-gray-700"
                  : "opacity-40 cursor-not-allowed text-gray-400"
              )}
              aria-label="Next testimonials"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Testimonials Carousel */}
        <div
          ref={scrollContainerRef}
          className="flex gap-6 overflow-x-auto scrollbar-hide pb-4 -mx-4 px-4 snap-x snap-mandatory"
        >
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="flex-shrink-0 w-[340px] sm:w-[380px] snap-start"
            >
              <TestimonialCard
                quote={testimonial.quote}
                author={testimonial.author}
                role={testimonial.role}
                location={testimonial.location}
                image={testimonial.image}
                rating={testimonial.rating}
              />
            </div>
          ))}
        </div>

        {/* Trust Indicators */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-center">
          <div>
            <p className="text-3xl font-bold text-gray-900">4.8/5.0</p>
            <p className="text-sm text-gray-500">Average Rating</p>
          </div>
          <div className="w-px h-12 bg-gray-200" />
          <div>
            <p className="text-3xl font-bold text-gray-900">2,847+</p>
            <p className="text-sm text-gray-500">Happy Renters</p>
          </div>
          <div className="w-px h-12 bg-gray-200" />
          <div>
            <p className="text-3xl font-bold text-gray-900">98%</p>
            <p className="text-sm text-gray-500">Would Recommend</p>
          </div>
        </div>
      </Container>
    </Section>
  );
}
