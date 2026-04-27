/**
 * Provider Type Selection Form
 * 
 * Step 2 of verification: Choose Individual or Business
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Building2, Check } from "lucide-react";
import { setProviderType } from "./actions";

interface ProviderTypeFormProps {
  userId: string;
  providerId: string;
}

type ProviderType = "individual" | "company";

const providerTypes = [
  {
    id: "individual" as ProviderType,
    title: "Individual",
    description: "Freelancer, self-employed, or offering services independently",
    icon: User,
    features: [
      "Quick verification with ID",
      "Offer most service categories",
      "Personal profile listing",
    ],
  },
  {
    id: "company" as ProviderType,
    title: "Business",
    description: "Registered company, agency, or licensed contractor",
    icon: Building2,
    features: [
      "Access all service categories",
      "Offer regulated services",
      "Business profile & branding",
    ],
  },
];

export function ProviderTypeForm({ userId, providerId }: ProviderTypeFormProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<ProviderType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = async () => {
    if (!selected) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const result = await setProviderType(providerId, selected, userId);
      
      if (result.success) {
        router.refresh();
      } else {
        setError(result.error || "Failed to save. Please try again.");
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Type Options */}
      {providerTypes.map((type) => {
        const Icon = type.icon;
        const isSelected = selected === type.id;
        
        return (
          <button
            key={type.id}
            onClick={() => setSelected(type.id)}
            disabled={isLoading}
            className={`
              w-full text-left p-5 rounded-xl border-2 transition-all
              ${isSelected 
                ? "border-teal-600 bg-teal-50" 
                : "border-gray-200 bg-white hover:border-gray-300"
              }
              ${isLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
            `}
          >
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className={`
                w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0
                ${isSelected ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-600"}
              `}>
                <Icon className="w-6 h-6" />
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className={`font-semibold ${isSelected ? "text-teal-900" : "text-gray-900"}`}>
                    {type.title}
                  </h3>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-teal-600 flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-0.5 mb-3">
                  {type.description}
                </p>
                
                {/* Features */}
                <ul className="space-y-1.5">
                  {type.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                      <Check className={`w-3.5 h-3.5 ${isSelected ? "text-teal-600" : "text-gray-400"}`} />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </button>
        );
      })}

      {/* Error */}
      {error && (
        <p className="text-sm text-red-600 text-center">{error}</p>
      )}

      {/* Continue Button */}
      <button
        onClick={handleContinue}
        disabled={!selected || isLoading}
        className={`
          w-full py-3 rounded-lg font-medium transition-colors mt-4
          ${!selected || isLoading
            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
            : "bg-teal-600 text-white hover:bg-teal-700"
          }
        `}
      >
        {isLoading ? "Saving..." : "Continue"}
      </button>

      {/* Info Note */}
      <p className="text-xs text-gray-400 text-center mt-4">
        You can change this later in your account settings
      </p>
    </div>
  );
}
