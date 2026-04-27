/**
 * Profile Basics Form
 * 
 * Form for headline, bio, experience, and languages.
 */

"use client";

import { useState, useTransition } from "react";
import { ChevronLeft } from "lucide-react";
import { updateProfileBasics } from "./actions";
import {
  YEARS_EXPERIENCE_OPTIONS,
  LANGUAGE_OPTIONS,
} from "@/types/provider-profile";

interface ProfileBasicsFormProps {
  initialData: {
    headline: string;
    bio: string;
    years_experience: string;
    languages: string[];
  };
  onComplete: () => void;
  onBack: () => void;
}

export function ProfileBasicsForm({
  initialData,
  onComplete,
  onBack,
}: ProfileBasicsFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [headline, setHeadline] = useState(initialData.headline);
  const [bio, setBio] = useState(initialData.bio);
  const [yearsExperience, setYearsExperience] = useState(
    initialData.years_experience
  );
  const [languages, setLanguages] = useState<string[]>(initialData.languages);

  const handleLanguageToggle = (lang: string) => {
    setLanguages((prev) =>
      prev.includes(lang)
        ? prev.filter((l) => l !== lang)
        : [...prev, lang]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic validation
    if (headline.length < 10) {
      setError("Headline must be at least 10 characters");
      return;
    }
    if (bio.length < 100) {
      setError("Bio must be at least 100 characters");
      return;
    }
    if (!yearsExperience) {
      setError("Please select your years of experience");
      return;
    }
    if (languages.length === 0) {
      setError("Please select at least one language");
      return;
    }

    startTransition(async () => {
      const result = await updateProfileBasics({
        headline,
        bio,
        years_experience: yearsExperience,
        languages,
      });

      if (result.success) {
        onComplete();
      } else {
        setError(result.error || "Failed to save");
      }
    });
  };

  // Generate headline suggestion
  const generateHeadlineSuggestion = () => {
    const expLabel = YEARS_EXPERIENCE_OPTIONS.find(
      (o) => o.value === yearsExperience
    )?.label;
    return `Professional Service Provider • ${expLabel || "Experienced"} • Nairobi`;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Tell Us About Yourself
        </h2>
        <p className="text-gray-500 text-sm">
          This information helps clients decide to hire you.
        </p>
      </div>

      {/* Headline */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Headline <span className="text-red-500">*</span>
        </label>
        <p className="text-xs text-gray-500 mb-2">
          A short tagline that appears in search results (10-80 characters)
        </p>
        <input
          type="text"
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          maxLength={80}
          placeholder="e.g., Expert Plumber • 8 Years Experience • Kilimani"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        />
        <div className="flex justify-between mt-1">
          <button
            type="button"
            onClick={() => setHeadline(generateHeadlineSuggestion())}
            className="text-xs text-teal-600 hover:text-teal-700"
          >
            Use suggestion
          </button>
          <span className="text-xs text-gray-400">
            {headline.length}/80
          </span>
        </div>
      </div>

      {/* Bio */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          About You <span className="text-red-500">*</span>
        </label>
        <p className="text-xs text-gray-500 mb-2">
          Tell clients about your experience, approach, and what makes you different (100-500 characters)
        </p>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={500}
          rows={5}
          placeholder="I've been providing professional services for over 5 years. I specialize in... My approach is... I always ensure..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
        />
        <div className="flex justify-end mt-1">
          <span
            className={`text-xs ${
              bio.length < 100 ? "text-amber-500" : "text-gray-400"
            }`}
          >
            {bio.length}/500 {bio.length < 100 && `(${100 - bio.length} more needed)`}
          </span>
        </div>
      </div>

      {/* Years of Experience */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Years of Experience <span className="text-red-500">*</span>
        </label>
        <select
          value={yearsExperience}
          onChange={(e) => setYearsExperience(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        >
          <option value="">Select experience level</option>
          {YEARS_EXPERIENCE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Languages */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Languages You Speak <span className="text-red-500">*</span>
        </label>
        <p className="text-xs text-gray-500 mb-2">
          Select all languages you can communicate in with clients
        </p>
        <div className="flex flex-wrap gap-2">
          {LANGUAGE_OPTIONS.map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => handleLanguageToggle(lang)}
              className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                languages.includes(lang)
                  ? "bg-teal-50 border-teal-300 text-teal-700"
                  : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              {lang}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between pt-4">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-2 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? "Saving..." : "Continue"}
        </button>
      </div>
    </form>
  );
}
