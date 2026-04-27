/**
 * Step 4: Service Areas
 *
 * Provider selects which neighborhoods they serve.
 * Neighborhoods are loaded from the canonical `neighborhoods` table
 * via server action (bypasses RLS) and grouped by their `cluster` column.
 *
 * The wizard shell controls navigation — this step just syncs
 * selected neighborhood IDs into formData.serviceAreas.
 */

"use client";

import { useEffect, useState } from "react";
import { MapPin, Check, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWizard } from "../context";
import { getNeighborhoodsGrouped, type NeighborhoodClusterResult } from "../../actions";

interface Neighborhood {
  id: string;
  name: string;
  cluster: string | null;
}

interface NeighborhoodCluster {
  cluster: string;
  neighborhoods: Neighborhood[];
}

export function Step4ServiceAreas() {
  const { state, updateFormData } = useWizard();
  const { formData, errors } = state;

  const [clusters, setClusters] = useState<NeighborhoodCluster[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>(
    () => (formData.serviceAreas as { bulk?: string[] })?.bulk ?? []
  );
  const [canTravelOutside, setCanTravelOutside] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Load neighborhoods on mount via server action (bypasses RLS)
  useEffect(() => {
    async function loadNeighborhoods() {
      try {
        const { clusters: serverClusters, error } = await getNeighborhoodsGrouped();

        if (error) {
          console.error("Failed to load neighborhoods:", error);
        }

        if (serverClusters && serverClusters.length > 0) {
          setClusters(
            serverClusters.map((c: NeighborhoodClusterResult) => ({
              cluster: c.cluster,
              neighborhoods: c.neighborhoods,
            }))
          );
        }
      } catch (err) {
        console.error("Error loading neighborhoods:", err);
      }
      setIsLoading(false);
    }
    loadNeighborhoods();
  }, []);

  // Sync selections into formData whenever they change (via effect, not during render)
  useEffect(() => {
    updateFormData({
      serviceAreas: { bulk: selectedIds, canTravelOutside },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds, canTravelOutside]);

  const toggleNeighborhood = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleTravel = () => {
    setCanTravelOutside((prev) => !prev);
  };

  // Filter neighborhoods by search
  const filteredClusters = searchQuery.trim()
    ? clusters
        .map((c) => ({
          ...c,
          neighborhoods: c.neighborhoods.filter((n) =>
            n.name.toLowerCase().includes(searchQuery.toLowerCase())
          ),
        }))
        .filter((c) => c.neighborhoods.length > 0)
    : clusters;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Where do you offer these services?
        </h2>
        <p className="mt-2 text-gray-600">
          Select the neighborhoods in Nairobi where you can work
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search neighborhoods..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        />
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">
          Loading neighborhoods...
        </div>
      ) : filteredClusters.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No neighborhoods found
        </div>
      ) : (
        <>
          {filteredClusters.map((group) => (
            <div key={group.cluster}>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                {group.cluster}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {group.neighborhoods.map((n) => {
                  const selected = selectedIds.includes(n.id);
                  return (
                    <button
                      key={n.id}
                      onClick={() => toggleNeighborhood(n.id)}
                      className={cn(
                        "p-4 rounded-lg border-2 text-left transition-all",
                        selected
                          ? "border-teal-600 bg-teal-50"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={cn(
                            "font-medium",
                            selected ? "text-teal-700" : "text-gray-900"
                          )}
                        >
                          {n.name}
                        </span>
                        {selected && (
                          <Check className="w-5 h-5 text-teal-600" strokeWidth={2.5} />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Travel Outside Option */}
          {selectedIds.length > 0 && (
            <div className="border-t pt-6">
              <div className="flex items-start gap-3">
                <button
                  onClick={toggleTravel}
                  className={cn(
                    "flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors mt-0.5",
                    canTravelOutside
                      ? "bg-teal-600 border-teal-600"
                      : "bg-white border-gray-300"
                  )}
                >
                  {canTravelOutside && (
                    <Check className="w-3 h-3 text-white" strokeWidth={3} />
                  )}
                </button>
                <div>
                  <p className="font-medium text-gray-900">
                    I can travel outside these areas (extra charge)
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Customers can request your services in other areas
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Selected count */}
          {selectedIds.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <MapPin className="w-4 h-4" />
                <span>
                  <strong>{selectedIds.length}</strong>{" "}
                  {selectedIds.length === 1 ? "area" : "areas"} selected
                </span>
              </div>
            </div>
          )}
        </>
      )}

      {/* Error */}
      {errors.serviceAreas && (
        <p className="text-sm text-red-600">{errors.serviceAreas}</p>
      )}
    </div>
  );
}
