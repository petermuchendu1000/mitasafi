/**
 * ServiceEditForm — focused edit for a single provider service.
 *
 * Editable fields (all persist to custom_pricing JSON):
 *  - Price type (fixed / starting_from / quote)
 *  - Price amount (KES)
 *  - Description (200 chars)
 *  - Images (view / add / remove, max 3)
 */

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Upload,
  X,
  Loader2,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { updateProviderService, uploadServiceImage, deleteServiceImage } from "../../actions";

type PriceType = "fixed" | "starting_from" | "quote";

const PRICE_TYPES: { id: PriceType; label: string; hint: string }[] = [
  { id: "fixed", label: "Fixed price", hint: "Same price for every job" },
  { id: "starting_from", label: "Starting from", hint: "Price may vary with scope" },
  { id: "quote", label: "Request a quote", hint: "Customer asks, you decide" },
];

interface ServiceEditFormProps {
  providerServiceId: string;
  serviceName: string;
  subcategoryName: string;
  categoryName: string;
  initialPrice: number | null;
  initialPriceType: PriceType;
  initialDescription: string;
  initialImageUrls: string[];
}

export function ServiceEditForm({
  providerServiceId,
  serviceName,
  subcategoryName,
  categoryName,
  initialPrice,
  initialPriceType,
  initialDescription,
  initialImageUrls,
}: ServiceEditFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [priceType, setPriceType] = useState<PriceType>(initialPriceType);
  const [price, setPrice] = useState<string>(initialPrice?.toString() || "");
  const [description, setDescription] = useState(initialDescription);
  const [imageUrls, setImageUrls] = useState<string[]>(initialImageUrls);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasChanges =
    priceType !== initialPriceType ||
    price !== (initialPrice?.toString() || "") ||
    description !== initialDescription ||
    JSON.stringify(imageUrls) !== JSON.stringify(initialImageUrls);

  // --- Image upload ---
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const available = 3 - imageUrls.length;
    const toUpload = files.slice(0, available);
    if (!toUpload.length) return;

    setUploading(true);
    for (const file of toUpload) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("serviceId", providerServiceId);

      const result = await uploadServiceImage(fd);
      if (result.success && result.data?.url) {
        setImageUrls((prev) => [...prev, result.data!.url]);
      }
    }
    setUploading(false);
    e.target.value = "";
  };

  const handleImageRemove = async (index: number) => {
    const url = imageUrls[index];
    setImageUrls((prev) => prev.filter((_, i) => i !== index));
    // Fire-and-forget storage cleanup
    deleteServiceImage(url).catch(() => {});
  };

  // --- Save ---
  const handleSave = () => {
    setError(null);
    setSaved(false);

    if (priceType !== "quote" && (!price || Number(price) <= 0)) {
      setError("Please enter a valid price");
      return;
    }

    if (imageUrls.length === 0) {
      setError("At least one photo is required");
      return;
    }

    startTransition(async () => {
      const result = await updateProviderService(providerServiceId, {
        priceType,
        price: priceType === "quote" ? null : Number(price),
        description: description.trim() || null,
        imageUrls,
      });

      if (result.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        setError(result.error || "Failed to save");
      }
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/provider/services"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to services
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{serviceName}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {subcategoryName} • {categoryName}
        </p>
      </div>

      {/* Pricing */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
          Pricing
        </h2>

        <div className="grid grid-cols-3 gap-2">
          {PRICE_TYPES.map((pt) => (
            <button
              key={pt.id}
              type="button"
              onClick={() => setPriceType(pt.id)}
              className={cn(
                "p-3 rounded-lg border-2 text-left transition-colors",
                priceType === pt.id
                  ? "border-teal-600 bg-teal-50"
                  : "border-gray-200 hover:border-gray-300"
              )}
            >
              <p className="text-sm font-medium text-gray-900">{pt.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{pt.hint}</p>
            </button>
          ))}
        </div>

        {priceType !== "quote" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Price (KES)
            </label>
            <div className="relative max-w-xs">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                KES
              </span>
              <input
                type="number"
                min="0"
                step="50"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0"
                className="w-full pl-12 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
              />
            </div>
          </div>
        )}
      </section>

      {/* Description */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
          Description
        </h2>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={200}
          rows={3}
          placeholder="Briefly describe what's included (e.g. &quot;Assembly of wardrobes and cupboards. Price depends on size.&quot;)"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none text-sm"
        />
        <p className="text-xs text-gray-400 text-right">{description.length}/200</p>
      </section>

      {/* Photos */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
          Photos <span className="text-red-500">*</span>
        </h2>
        <p className="text-xs text-gray-500">
          At least 1 photo required. Max 3 per service. Show completed work, not stock photos.
        </p>

        <div className="grid grid-cols-3 gap-3">
          {imageUrls.map((url, i) => (
            <div
              key={url}
              className="relative aspect-square rounded-lg border-2 border-gray-200 overflow-hidden bg-gray-50"
            >
              <Image
                src={url}
                alt={`Photo ${i + 1}`}
                fill
                sizes="200px"
                className="object-cover"
              />
              <button
                onClick={() => handleImageRemove(i)}
                className="absolute top-1.5 right-1.5 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-sm"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}

          {imageUrls.length < 3 && (
            <label
              className={cn(
                "aspect-square rounded-lg border-2 border-dashed cursor-pointer flex flex-col items-center justify-center transition-colors",
                uploading
                  ? "border-teal-400 bg-teal-50 cursor-wait"
                  : "border-gray-300 hover:border-teal-500 bg-gray-50 hover:bg-teal-50"
              )}
            >
              {uploading ? (
                <>
                  <Loader2 className="w-6 h-6 text-teal-500 mb-1 animate-spin" />
                  <span className="text-xs text-teal-600">Uploading…</span>
                </>
              ) : (
                <>
                  <Upload className="w-6 h-6 text-gray-400 mb-1" />
                  <span className="text-xs text-gray-500">Add photo</span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
                className="hidden"
                disabled={uploading}
              />
            </label>
          )}

          {/* Fill empty slots when < 3 images and no upload slot shown */}
          {imageUrls.length === 3 && null}
        </div>
      </section>

      {/* Error / Success */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
        <button
          onClick={handleSave}
          disabled={isPending || !hasChanges}
          className={cn(
            "inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg transition-colors",
            saved
              ? "bg-emerald-600 text-white"
              : "bg-teal-600 text-white hover:bg-teal-700",
            (isPending || !hasChanges) && "opacity-50 cursor-not-allowed"
          )}
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving…
            </>
          ) : saved ? (
            <>
              <Check className="w-4 h-4" />
              Saved
            </>
          ) : (
            "Save Changes"
          )}
        </button>
        <Link
          href="/dashboard/provider/services"
          className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800"
        >
          Cancel
        </Link>
      </div>
    </div>
  );
}
