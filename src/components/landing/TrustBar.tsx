import { Container, StatCard } from "@/components/ui";
import { Home, Wallet, Star, BadgeCheck } from "lucide-react";

const stats = [
  {
    value: "5,000+",
    label: "Verified Homes",
    icon: <Home className="w-6 h-6" />,
  },
  {
    value: "KES 25M+",
    label: "Rent Processed",
    icon: <Wallet className="w-6 h-6" />,
  },
  {
    value: "4.8/5.0",
    label: "Average Rating",
    icon: <Star className="w-6 h-6" />,
  },
  {
    value: "98%",
    label: "Listing Accuracy",
    icon: <BadgeCheck className="w-6 h-6" />,
  },
];

export function TrustBar() {
  return (
    <section className="bg-white py-12 lg:py-16 border-b border-gray-100">
      <Container>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {stats.map((stat, index) => (
            <StatCard
              key={index}
              value={stat.value}
              label={stat.label}
              icon={stat.icon}
            />
          ))}
        </div>

        {/* Security Badges */}
        <div className="flex flex-wrap items-center justify-center gap-6 mt-10 pt-8 border-t border-gray-200">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <svg
              className="w-5 h-5 text-success-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            SSL Secured
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <svg
              className="w-5 h-5 text-success-500"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
            M-Pesa Partner
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <svg
              className="w-5 h-5 text-success-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                clipRule="evenodd"
              />
            </svg>
            Data Protected
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <svg
              className="w-5 h-5 text-success-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            Verified Platform
          </div>
        </div>
      </Container>
    </section>
  );
}
