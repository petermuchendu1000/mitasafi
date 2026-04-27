import { cn } from "@/lib/utils";

interface ContainerProps {
  children: React.ReactNode;
  size?: "wide" | "default" | "narrow" | "tight";
  className?: string;
  as?: React.ElementType;
}

const sizeStyles = {
  wide: "max-w-7xl",
  default: "max-w-6xl",
  narrow: "max-w-4xl",
  tight: "max-w-2xl",
};

export function Container({
  children,
  size = "wide",
  className,
  as: Component = "div",
}: ContainerProps) {
  return (
    <Component
      className={cn("mx-auto px-4 sm:px-6 lg:px-8", sizeStyles[size], className)}
    >
      {children}
    </Component>
  );
}
