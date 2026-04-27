// =============================================================================
// MITASAFI: POPULAR SERVICES SECTION
// =============================================================================
// Displays trending/popular services like Fiverr's "Popular services" section.
// Server-fetched data with client-side interactivity.
// =============================================================================

import Link from "next/link";
import Image from "next/image";
import { Container } from "@/components/ui";
import { 
  Paintbrush, 
  Code, 
  TrendingUp, 
  Video, 
  FileText, 
  Music, 
  Briefcase, 
  Sparkles,
  Home,
  Wrench,
  ShieldCheck,
  Truck,
  ArrowRight
} from "lucide-react";

// =============================================================================
// POPULAR SERVICES DATA
// =============================================================================
// Static list of popular services - matches your service categories

interface PopularService {
  name: string;
  slug: string;
  icon: React.ReactNode;
  image: string;
  gradient: string;
  href: string;
}

const POPULAR_SERVICES: PopularService[] = [
  {
    name: "Home Cleaning",
    slug: "home-cleaning",
    icon: <Home className="w-5 h-5" />,
    image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=300&fit=crop",
    gradient: "from-blue-500 to-cyan-500",
    href: "/services/browse?category=home-services&subcategory=cleaning",
  },
  {
    name: "Plumbing",
    slug: "plumbing",
    icon: <Wrench className="w-5 h-5" />,
    image: "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=400&h=300&fit=crop",
    gradient: "from-orange-500 to-red-500",
    href: "/services/browse?category=home-services&subcategory=plumbing",
  },
  {
    name: "Electrical",
    slug: "electrical",
    icon: <Sparkles className="w-5 h-5" />,
    image: "https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=400&h=300&fit=crop",
    gradient: "from-yellow-500 to-orange-500",
    href: "/services/browse?category=home-services&subcategory=electrical",
  },
  {
    name: "Moving & Delivery",
    slug: "moving",
    icon: <Truck className="w-5 h-5" />,
    image: "https://images.unsplash.com/photo-1600518464441-9154a4dea21b?w=400&h=300&fit=crop",
    gradient: "from-purple-500 to-pink-500",
    href: "/services/browse?category=logistics&subcategory=moving",
  },
  {
    name: "Interior Design",
    slug: "interior-design",
    icon: <Paintbrush className="w-5 h-5" />,
    image: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=400&h=300&fit=crop",
    gradient: "from-rose-500 to-pink-500",
    href: "/services/browse?category=professional-services&subcategory=interior-design",
  },
  {
    name: "Security Services",
    slug: "security",
    icon: <ShieldCheck className="w-5 h-5" />,
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop",
    gradient: "from-slate-600 to-slate-800",
    href: "/services/browse?category=security&subcategory=guards",
  },
  {
    name: "Legal Services",
    slug: "legal",
    icon: <FileText className="w-5 h-5" />,
    image: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&h=300&fit=crop",
    gradient: "from-emerald-500 to-teal-500",
    href: "/services/browse?category=professional-services&subcategory=legal",
  },
  {
    name: "Property Management",
    slug: "property-management",
    icon: <Briefcase className="w-5 h-5" />,
    image: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&h=300&fit=crop",
    gradient: "from-indigo-500 to-blue-500",
    href: "/services/browse?category=professional-services&subcategory=property-management",
  },
];

// =============================================================================
// SERVICE CARD
// =============================================================================

function ServiceCard({ service }: { service: PopularService }) {
  return (
    <Link
      href={service.href}
      className="group relative flex-shrink-0 w-[200px] h-[260px] rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300"
    >
      {/* Background Image */}
      <Image
        src={service.image}
        alt={service.name}
        fill
        className="object-cover transition-transform duration-500 group-hover:scale-110"
      />
      
      {/* Gradient Overlay */}
      <div className={`absolute inset-0 bg-gradient-to-t ${service.gradient} opacity-60 group-hover:opacity-70 transition-opacity`} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      
      {/* Content */}
      <div className="absolute inset-0 p-4 flex flex-col justify-end">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 bg-white/20 backdrop-blur-sm rounded-lg text-white">
            {service.icon}
          </div>
        </div>
        <h3 className="text-lg font-bold text-white group-hover:translate-x-1 transition-transform duration-300">
          {service.name}
        </h3>
      </div>
    </Link>
  );
}

// =============================================================================
// MAIN SECTION
// =============================================================================

export function PopularServicesSection() {
  return (
    <section className="py-16 bg-white">
      <Container>
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Popular Services
            </h2>
            <p className="text-gray-600">
              Most requested services by tenants and property owners
            </p>
          </div>
          <Link
            href="/services/browse"
            className="hidden sm:flex items-center gap-2 px-4 py-2 text-sm font-medium text-brand-600 hover:text-brand-700 hover:bg-brand-50 rounded-lg transition-colors"
          >
            View all services
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Horizontal Scroll */}
        <div className="relative -mx-4 px-4">
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
            {POPULAR_SERVICES.map((service) => (
              <div key={service.slug} className="snap-start">
                <ServiceCard service={service} />
              </div>
            ))}
          </div>
        </div>

        {/* Mobile CTA */}
        <div className="mt-6 sm:hidden">
          <Link
            href="/services/browse"
            className="flex items-center justify-center gap-2 w-full px-4 py-3 text-sm font-medium text-brand-600 border border-brand-200 hover:bg-brand-50 rounded-lg transition-colors"
          >
            View all services
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </Container>
    </section>
  );
}
