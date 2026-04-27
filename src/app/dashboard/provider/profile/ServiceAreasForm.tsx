/**
 * Service Areas Form
 * 
 * Multi-select for neighborhoods with radius slider.
 */

"use client";

import { useState, useTransition } from "react";
import { ChevronLeft, MapPin, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { updateServiceAreas } from "./actions";
import type { NeighborhoodCluster, Neighborhood } from "@/types/provider-profile";

interface ServiceAreasFormProps {
  clusters: NeighborhoodCluster[];
  initialBaseNeighborhoodId: string | null;
  initialServiceAreaIds: string[];
  initialRadius: number;
  onComplete: () => void;
  onBack: () => void;
}

export function ServiceAreasForm({
  clusters,
  initialBaseNeighborhoodId,
  initialServiceAreaIds,
  initialRadius,
  onComplete,
  onBack,
}: ServiceAreasFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [baseNeighborhoodId, setBaseNeighborhoodId] = useState<string | null>(
    initialBaseNeighborhoodId
  );
  const [selectedAreas, setSelectedAreas] = useState<Set<string>>(
    new Set(initialServiceAreaIds)
  );
  const [radius, setRadius] = useState(initialRadius);
  const [expandedClusters, setExpandedClusters] = useState<Set<string>>(
    new Set()
  );

  // Flatten neighborhoods for base selection dropdown
  const allNeighborhoods = clusters.flatMap((c) => c.neighborhoods);

  const handleBaseChange = (id: string) => {
    setBaseNeighborhoodId(id);
    // Auto-add base to selected areas
    setSelectedAreas((prev) => new Set([...prev, id]));
  };

  const handleAreaToggle = (id: string) => {
    setSelectedAreas((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        // Don't allow removing base area
        if (id === baseNeighborhoodId) return prev;
        newSet.delete(id);
      } else {
        // Limit to 10 areas
        if (newSet.size >= 10) {
          setError("Maximum 10 service areas allowed");
          return prev;
        }
        newSet.add(id);
      }
      return newSet;
    });
    setError(null);
  };

  const handleClusterToggle = (cluster: string) => {
    setExpandedClusters((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(cluster)) {
        newSet.delete(cluster);
      } else {
        newSet.add(cluster);
      }
      return newSet;
    });
  };

  const handleSelectCluster = (cluster: NeighborhoodCluster) => {
    const clusterIds = cluster.neighborhoods.map((n) => n.id);
    const allSelected = clusterIds.every((id) => selectedAreas.has(id));

    if (allSelected) {
      // Deselect all in cluster (except base)
      setSelectedAreas((prev) => {
        const newSet = new Set(prev);
        clusterIds.forEach((id) => {
          if (id !== baseNeighborhoodId) {
            newSet.delete(id);
          }
        });
        return newSet;
      });
    } else {
      // Select all in cluster (up to limit)
      setSelectedAreas((prev) => {
        const newSet = new Set(prev);
        for (const id of clusterIds) {
          if (newSet.size >= 10) {
            setError("Maximum 10 service areas allowed");
            break;
          }
          newSet.add(id);
        }
        return newSet;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!baseNeighborhoodId) {
      setError("Please select your base location");
      return;
    }
    if (selectedAreas.size === 0) {
      setError("Please select at least one service area");
      return;
    }

    startTransition(async () => {
      const result = await updateServiceAreas({
        base_neighborhood_id: baseNeighborhoodId,
        service_area_ids: Array.from(selectedAreas),
        service_radius_km: radius,
      });

      if (result.success) {
        onComplete();
      } else {
        setError(result.error || "Failed to save");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Where Do You Work?
        </h2>
        <p className="text-gray-500 text-sm">
          Select your base location and the areas you serve.
        </p>
      </div>

      {/* Base Location */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Your Base Location <span className="text-red-500">*</span>
        </label>
        <p className="text-xs text-gray-500 mb-2">
          Where are you primarily based? This helps us show you to nearby clients.
        </p>
        <select
          value={baseNeighborhoodId || ""}
          onChange={(e) => handleBaseChange(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        >
          <option value="">Select your area</option>
          {clusters.map((cluster) => (
            <optgroup key={cluster.cluster} label={cluster.cluster}>
              {cluster.neighborhoods.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {/* Service Radius */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          How Far Will You Travel?
        </label>
        <p className="text-xs text-gray-500 mb-3">
          Maximum distance from your base location: <strong>{radius} km</strong>
        </p>
        <input
          type="range"
          min={5}
          max={50}
          step={5}
          value={radius}
          onChange={(e) => setRadius(Number(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>5 km</span>
          <span>25 km</span>
          <span>50 km</span>
        </div>
      </div>

      {/* Service Areas Selection */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Service Areas <span className="text-red-500">*</span>
          </label>
          <span className="text-xs text-gray-500">
            {selectedAreas.size}/10 selected
          </span>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Select all neighborhoods where you&apos;re willing to work.
        </p>

        <div className="border border-gray-200 rounded-lg max-h-80 overflow-y-auto">
          {clusters.map((cluster) => {
            const isExpanded = expandedClusters.has(cluster.cluster);
            const selectedInCluster = cluster.neighborhoods.filter((n) =>
              selectedAreas.has(n.id)
            ).length;
            const allSelected =
              selectedInCluster === cluster.neighborhoods.length;

            return (
              <div key={cluster.cluster} className="border-b last:border-b-0">
                {/* Cluster Header */}
                <div
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div 
                    className="flex items-center gap-3 flex-1 cursor-pointer"
                    onClick={() => handleClusterToggle(cluster.cluster)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleClusterToggle(cluster.cluster);
                      }
                    }}
                  >
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="font-medium text-gray-900">
                      {cluster.cluster}
                    </span>
                    {selectedInCluster > 0 && (
                      <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">
                        {selectedInCluster} selected
                      </span>
                    )}
                    <svg
                      className={cn(
                        "w-4 h-4 text-gray-400 transition-transform ml-auto",
                        isExpanded && "rotate-180"
                      )}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSelectCluster(cluster)}
                    className="text-xs text-teal-600 hover:text-teal-700 ml-2"
                  >
                    {allSelected ? "Deselect all" : "Select all"}
                  </button>
                </div>

                {/* Neighborhoods */}
                {isExpanded && (
                  <div className="px-4 pb-3 grid grid-cols-2 gap-2">
                    {cluster.neighborhoods.map((n) => {
                      const isSelected = selectedAreas.has(n.id);
                      const isBase = n.id === baseNeighborhoodId;

                      return (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => handleAreaToggle(n.id)}
                          disabled={isBase}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors text-left",
                            isSelected
                              ? "bg-teal-50 border-teal-300 text-teal-700"
                              : "bg-white border-gray-200 text-gray-600 hover:border-gray-300",
                            isBase && "opacity-75 cursor-not-allowed"
                          )}
                        >
                          <div
                            className={cn(
                              "w-4 h-4 rounded border flex items-center justify-center flex-shrink-0",
                              isSelected
                                ? "bg-teal-600 border-teal-600"
                                : "border-gray-300"
                            )}
                          >
                            {isSelected && (
                              <Check className="w-3 h-3 text-white" />
                            )}
                          </div>
                          <span className="truncate">{n.name}</span>
                          {isBase && (
                            <span className="text-xs text-teal-600 ml-auto">
                              Base
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
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
