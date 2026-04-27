import Image from "next/image";
import { Section, SectionHeader, Container } from "@/components/ui";
import { buttonVariants } from "@/components/ui/Button";
import { MapPin } from "lucide-react";
import Link from "next/link";

const neighborhoods = [
  {
    name: "Kilimani",
    slug: "kilimani",
    properties: "450+ listings",
    image: "https://syoolvgoaqnckgmngvse.supabase.co/storage/v1/object/public/landing-images/properties/apartment-exterior-1.jpg",
    popular: true,
  },
  {
    name: "Westlands",
    slug: "westlands",
    properties: "380+ listings",
    image: "https://syoolvgoaqnckgmngvse.supabase.co/storage/v1/object/public/landing-images/properties/apartment-exterior-2.jpg",
    popular: true,
  },
  {
    name: "South B/C",
    slug: "south",
    properties: "320+ listings",
    image: "https://syoolvgoaqnckgmngvse.supabase.co/storage/v1/object/public/landing-images/properties/living-room-modern-1.jpg",
    popular: false,
  },
  {
    name: "Langata",
    slug: "langata",
    properties: "280+ listings",
    image: "https://syoolvgoaqnckgmngvse.supabase.co/storage/v1/object/public/landing-images/properties/living-room-modern-2.jpg",
    popular: false,
  },
];

export function NeighborhoodsSection() {
  return (
    <Section background="gray" id="neighborhoods">
      <Container>
        <SectionHeader
          eyebrow="Nairobi Coverage"
          title="Find Homes Across Nairobi"
          description="From the bustling streets of Westlands to the leafy suburbs of Karen — we've got verified listings everywhere."
        />

        {/* Neighborhoods Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-12 lg:mt-16">
          {neighborhoods.map((neighborhood, index) => (
            <Link
              key={index}
              href={`/properties?area=${neighborhood.slug}`}
              className="group relative aspect-[4/3] rounded-2xl overflow-hidden shadow-soft"
            >
              <Image
                src={neighborhood.image}
                alt={`Properties in ${neighborhood.name}`}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-110"
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-gray-900/20 to-transparent" />
              
              {/* Popular Badge */}
              {neighborhood.popular && (
                <div className="absolute top-4 left-4 bg-cta-600 text-white text-xs font-semibold px-2 py-1 rounded-full">
                  Popular
                </div>
              )}

              {/* Content */}
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <div className="flex items-center gap-1.5 text-white mb-1">
                  <MapPin className="w-4 h-4" />
                  <h3 className="font-semibold text-lg">{neighborhood.name}</h3>
                </div>
                <p className="text-white/80 text-sm">{neighborhood.properties}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* All Areas Link */}
        <div className="mt-10 text-center">
          <p className="text-gray-600 mb-4">
            Also available in Karen, Lavington, Parklands, Ngong Road, Upper Hill, and 20+ more areas
          </p>
          <Link
            href="/properties"
            className={buttonVariants({ variant: "secondary" })}
          >
            Browse All Areas →
          </Link>
        </div>
      </Container>
    </Section>
  );
}
