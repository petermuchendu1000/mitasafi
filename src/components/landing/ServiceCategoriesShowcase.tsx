// =============================================================================
// MITASAFI: SERVICE CATEGORIES SHOWCASE
// =============================================================================
// Displays service categories like Fiverr's category icons row.
// Visual category navigation for quick discovery.
// =============================================================================

import Link from "next/link";
import { Container } from "@/components/ui";
import {
  Home,
  Wrench,
  ShieldCheck,
  Truck,
  Briefcase,
  Paintbrush,
  Car,
  Building2,
  Zap,
  Droplets,
  HardHat,
  TreeDeciduous,
  Sparkles,
  Scale,
} from "lucide-react";

// =============================================================================
// CATEGORY DATA
// =============================================================================

interface ServiceCategoryItem {
  id: string;
  name: string;
  slug: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  description: string;
}

const SERVICE_CATEGORIES: ServiceCategoryItem[] = [
  {
    id: "home-services",
    name: "Home Services",
    slug: "home-services",
    icon: <Home className="w-6 h-6" />,
    color: "text-blue-600",
    bgColor: "bg-blue-50 hover:bg-blue-100",
    description: "Cleaning, repairs, maintenance",
  },
  {
    id: "plumbing",
    name: "Plumbing",
    slug: "plumbing",
    icon: <Droplets className="w-6 h-6" />,
    color: "text-cyan-600",
    bgColor: "bg-cyan-50 hover:bg-cyan-100",
    description: "Pipes, fixtures, drainage",
  },
  {
    id: "electrical",
    name: "Electrical",
    slug: "electrical",
    icon: <Zap className="w-6 h-6" />,
    color: "text-yellow-600",
    bgColor: "bg-yellow-50 hover:bg-yellow-100",
    description: "Wiring, installations, repairs",
  },
  {
    id: "security",
    name: "Security",
    slug: "security",
    icon: <ShieldCheck className="w-6 h-6" />,
    color: "text-slate-600",
    bgColor: "bg-slate-50 hover:bg-slate-100",
    description: "Guards, CCTV, access control",
  },
  {
    id: "moving",
    name: "Moving & Logistics",
    slug: "moving",
    icon: <Truck className="w-6 h-6" />,
    color: "text-purple-600",
    bgColor: "bg-purple-50 hover:bg-purple-100",
    description: "Movers, delivery, storage",
  },
  {
    id: "professional",
    name: "Professional",
    slug: "professional-services",
    icon: <Briefcase className="w-6 h-6" />,
    color: "text-indigo-600",
    bgColor: "bg-indigo-50 hover:bg-indigo-100",
    description: "Legal, accounting, consulting",
  },
  {
    id: "construction",
    name: "Construction",
    slug: "construction",
    icon: <HardHat className="w-6 h-6" />,
    color: "text-orange-600",
    bgColor: "bg-orange-50 hover:bg-orange-100",
    description: "Building, renovation, repairs",
  },
  {
    id: "landscaping",
    name: "Landscaping",
    slug: "landscaping",
    icon: <TreeDeciduous className="w-6 h-6" />,
    color: "text-green-600",
    bgColor: "bg-green-50 hover:bg-green-100",
    description: "Gardens, lawns, outdoor",
  },
];

// =============================================================================
// CATEGORY CARD
// =============================================================================

function CategoryCard({ category }: { category: ServiceCategoryItem }) {
  return (
    <Link
      href={`/services/browse?category=${category.slug}`}
      className={`group flex flex-col items-center p-4 rounded-xl ${category.bgColor} transition-all duration-200 hover:shadow-md min-w-[120px]`}
    >
      <div className={`p-3 rounded-full bg-white shadow-sm mb-3 ${category.color} group-hover:scale-110 transition-transform duration-200`}>
        {category.icon}
      </div>
      <span className="text-sm font-semibold text-gray-900 text-center">
        {category.name}
      </span>
    </Link>
  );
}

// =============================================================================
// MAIN SECTION
// =============================================================================

export function ServiceCategoriesShowcase() {
  return (
    <section className="py-12 bg-white border-b border-gray-100">
      <Container>
        {/* Grid Layout for larger screens, scroll for mobile */}
        <div className="hidden md:grid md:grid-cols-4 lg:grid-cols-8 gap-4">
          {SERVICE_CATEGORIES.map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </div>

        {/* Mobile: Horizontal scroll */}
        <div className="md:hidden -mx-4 px-4">
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
            {SERVICE_CATEGORIES.map((category) => (
              <div key={category.id} className="snap-start">
                <CategoryCard category={category} />
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}

// =============================================================================
// COMPACT VARIANT (for use in Hero)
// =============================================================================

export function ServiceCategoriesCompact() {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {SERVICE_CATEGORIES.slice(0, 6).map((category) => (
        <Link
          key={category.id}
          href={`/services/browse?category=${category.slug}`}
          className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-full text-white text-sm transition-colors"
        >
          <span className="opacity-80">{category.icon}</span>
          <span>{category.name}</span>
        </Link>
      ))}
    </div>
  );
}
