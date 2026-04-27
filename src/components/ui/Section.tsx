import { cn } from "@/lib/utils";

interface SectionProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
  background?: "white" | "gray" | "brand" | "brand-light" | "cta-light" | "dark";
  padding?: "none" | "sm" | "md" | "lg";
}

const backgroundStyles = {
  white: "bg-white",
  gray: "bg-gray-50",
  brand: "bg-brand-600",
  "brand-light": "bg-brand-50",
  "cta-light": "bg-gradient-to-br from-orange-50 via-amber-50 to-orange-50",
  dark: "bg-gray-900",
};

const paddingStyles = {
  none: "",
  sm: "py-12 sm:py-16",
  md: "py-16 sm:py-20 lg:py-24",
  lg: "py-20 sm:py-28 lg:py-32",
};

export function Section({
  children,
  className,
  id,
  background = "white",
  padding = "md",
}: SectionProps) {
  return (
    <section
      id={id}
      className={cn(backgroundStyles[background], paddingStyles[padding], className)}
    >
      {children}
    </section>
  );
}

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
  dark?: boolean;
  /** Controls the eyebrow accent color. Defaults to "brand" (teal). */
  eyebrowColor?: "brand" | "cta";
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  align = "center",
  className,
  dark = false,
  eyebrowColor = "brand",
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "max-w-3xl",
        align === "center" && "mx-auto text-center",
        className
      )}
    >
      {eyebrow && (
        <p
          className={cn(
            "text-sm font-semibold uppercase tracking-wider mb-3",
            dark
              ? eyebrowColor === "cta" ? "text-cta-300" : "text-brand-300"
              : eyebrowColor === "cta" ? "text-cta-600" : "text-brand-600"
          )}
        >
          {eyebrow}
        </p>
      )}
      <h2
        className={cn(
          "text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-balance",
          dark ? "text-white" : "text-gray-900"
        )}
      >
        {title}
      </h2>
      {description && (
        <p
          className={cn(
            "mt-4 text-lg sm:text-xl",
            dark ? "text-gray-300" : "text-gray-600"
          )}
        >
          {description}
        </p>
      )}
    </div>
  );
}
