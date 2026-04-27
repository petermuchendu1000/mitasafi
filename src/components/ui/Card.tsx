import { cn } from "@/lib/utils";
import Image from "next/image";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

const paddingStyles = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export function Card({ children, className, hover = false, padding = "md" }: CardProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-2xl border border-gray-100 overflow-hidden",
        hover && "shadow-soft transition-all duration-300 hover:shadow-medium hover:-translate-y-1",
        !hover && "shadow-soft",
        paddingStyles[padding],
        className
      )}
    >
      {children}
    </div>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  stat?: string;
  className?: string;
  colorScheme?: "brand" | "cta" | "success";
}

const colorSchemes = {
  brand: {
    iconBg: "bg-brand-50",
    iconText: "text-brand-600",
    statText: "text-brand-600",
  },
  cta: {
    iconBg: "bg-orange-50",
    iconText: "text-cta-600",
    statText: "text-cta-600",
  },
  success: {
    iconBg: "bg-emerald-50",
    iconText: "text-emerald-600",
    statText: "text-emerald-600",
  },
};

export function FeatureCard({ icon, title, description, stat, className, colorScheme = "brand" }: FeatureCardProps) {
  const colors = colorSchemes[colorScheme];
  
  return (
    <Card hover className={cn("flex flex-col", className)}>
      <div className={cn("w-14 h-14 rounded-xl flex items-center justify-center mb-5", colors.iconBg, colors.iconText)}>
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 leading-relaxed flex-grow">{description}</p>
      {stat && (
        <p className={cn("mt-4 pt-4 border-t border-gray-100 text-sm font-medium", colors.statText)}>
          {stat}
        </p>
      )}
    </Card>
  );
}

interface TestimonialCardProps {
  quote: string;
  author: string;
  role: string;
  location: string;
  image: string;
  rating?: number;
  className?: string;
}

export function TestimonialCard({
  quote,
  author,
  role,
  location,
  image,
  rating = 5,
  className,
}: TestimonialCardProps) {
  return (
    <Card className={cn("flex flex-col", className)}>
      {/* Rating stars */}
      <div className="flex gap-1 mb-4">
        {[...Array(5)].map((_, i) => (
          <svg
            key={i}
            className={cn("w-5 h-5", i < rating ? "text-warning-400" : "text-gray-200")}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>

      {/* Quote */}
      <blockquote className="text-gray-700 leading-relaxed flex-grow mb-6">
        &ldquo;{quote}&rdquo;
      </blockquote>

      {/* Author */}
      <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
        <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gray-100">
          <Image
            src={image}
            alt={author}
            fill
            className="object-cover"
            sizes="48px"
          />
        </div>
        <div>
          <p className="font-semibold text-gray-900">{author}</p>
          <p className="text-sm text-gray-500">
            {role} • {location}
          </p>
        </div>
      </div>
    </Card>
  );
}

interface StatCardProps {
  value: string;
  label: string;
  icon?: React.ReactNode;
  className?: string;
}

export function StatCard({ value, label, icon, className }: StatCardProps) {
  return (
    <div className={cn("text-center", className)}>
      {icon && (
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-100 text-brand-600 mb-3">
          {icon}
        </div>
      )}
      <p className="text-3xl sm:text-4xl lg:text-5xl font-bold text-brand-600 mb-1">
        {value}
      </p>
      <p className="text-gray-600 font-medium">{label}</p>
    </div>
  );
}

interface ProblemCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  className?: string;
}

export function ProblemCard({ icon, title, description, className }: ProblemCardProps) {
  return (
    <div
      className={cn(
        "bg-gray-50 rounded-2xl p-6 border border-gray-100",
        className
      )}
    >
      <div className="w-12 h-12 rounded-xl bg-error-50 flex items-center justify-center text-error-500 mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 text-sm leading-relaxed">{description}</p>
    </div>
  );
}
