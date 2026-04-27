/**
 * Educational Space Details
 * 
 * Captures educational-specific information:
 * - Classrooms and capacity
 * - Facilities (labs, library, playground)
 * - Compliance and accreditation
 * 
 * Design: Clean, professional. Teal primary, orange accents.
 * 
 * REFACTORED: Uses useCommercialForm hook for standardized state/validation
 */

"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { Minus, Plus } from "lucide-react";
import { useCommercialForm, useCommercialSubtype } from "../../hooks";
import { useWizard } from "../../context";
import { calculateStudentCapacity } from "../../utils";

export function EducationalDetails() {
  // Use shared hook for standardized state management & validation
  const { commercial, updateCommercial, isRequired } = useCommercialForm();
  const { isSchool, isDaycare } = useCommercialSubtype();
  const { updateFormData } = useWizard();

  // Auto-calculate total student capacity when classrooms or capacity changes
  useEffect(() => {
    const classrooms = commercial.classroomCount || 0;
    const capacity = commercial.classroomCapacity || 20;
    const calculated = calculateStudentCapacity(classrooms, capacity);
    
    // Only auto-update if we have classrooms and the calculated value is different
    if (classrooms > 0 && calculated !== commercial.totalStudentCapacity) {
      updateFormData({
        commercial: { ...commercial, totalStudentCapacity: calculated },
      });
    }
  }, [commercial.classroomCount, commercial.classroomCapacity, commercial, commercial.totalStudentCapacity, updateFormData]);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Educational Space Details
        </h2>
        <p className="text-gray-500">
          Classrooms, capacity, and facilities
        </p>
      </div>

      <div className="space-y-6">
        {/* Space Metrics */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Space Metrics</h3>
          </div>

          <div className="p-5 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Total Size <span className="text-orange-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={commercial.sizeSqm || ""}
                  onChange={(e) => updateCommercial({ sizeSqm: parseInt(e.target.value) || null })}
                  placeholder="e.g., 1000"
                  className="w-full px-4 py-3 pr-16 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">sqm</span>
              </div>
            </div>
          </div>
        </section>

        {/* Classroom Configuration */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Classroom Configuration</h3>
          </div>

          <div className="p-5 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Classrooms <span className="text-orange-500">*</span>
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => updateCommercial({ classroomCount: Math.max(0, (commercial.classroomCount || 0) - 1) })}
                    className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                  >
                    <Minus className="w-4 h-4 text-gray-600" />
                  </button>
                  <span className="flex-1 text-center font-semibold text-gray-900">
                    {commercial.classroomCount || 0}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateCommercial({ classroomCount: Math.min(50, (commercial.classroomCount || 0) + 1) })}
                    className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                  >
                    <Plus className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Students Per Classroom {isRequired("classroomCapacity") && <span className="text-orange-500">*</span>}
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => updateCommercial({ classroomCapacity: Math.max(5, (commercial.classroomCapacity || 20) - 5) })}
                    className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                  >
                    <Minus className="w-4 h-4 text-gray-600" />
                  </button>
                  <span className="flex-1 text-center font-semibold text-gray-900">
                    {commercial.classroomCapacity || 20}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateCommercial({ classroomCapacity: Math.min(60, (commercial.classroomCapacity || 20) + 5) })}
                    className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                  >
                    <Plus className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Total Student Capacity {isRequired("totalStudentCapacity") && <span className="text-orange-500">*</span>}
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={commercial.totalStudentCapacity || ""}
                  onChange={(e) => updateCommercial({ totalStudentCapacity: parseInt(e.target.value) || null })}
                  placeholder="Auto-calculated from classrooms"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Facilities */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Facilities</h3>
          </div>

          <div className="p-5 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {isSchool && (
                <>
                  <label
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                      commercial.hasComputerLab
                        ? "border-teal-600 bg-teal-50"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={commercial.hasComputerLab || false}
                      onChange={(e) => updateCommercial({ hasComputerLab: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Computer Lab
                    </span>
                  </label>

                  <label
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                      commercial.hasScienceLab
                        ? "border-teal-600 bg-teal-50"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={commercial.hasScienceLab || false}
                      onChange={(e) => updateCommercial({ hasScienceLab: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Science Lab
                    </span>
                  </label>

                  <label
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                      commercial.hasLibrary
                        ? "border-teal-600 bg-teal-50"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={commercial.hasLibrary || false}
                      onChange={(e) => updateCommercial({ hasLibrary: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Library
                    </span>
                  </label>
                </>
              )}

              <label
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                  commercial.hasPlayground
                    ? "border-teal-600 bg-teal-50"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <input
                  type="checkbox"
                  checked={commercial.hasPlayground || false}
                  onChange={(e) => updateCommercial({ hasPlayground: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Playground / Play Area {isRequired("hasPlayground") && <span className="text-orange-500">*</span>}
                </span>
              </label>

              <label
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                  commercial.hasCafeteria
                    ? "border-teal-600 bg-teal-50"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <input
                  type="checkbox"
                  checked={commercial.hasCafeteria || false}
                  onChange={(e) => updateCommercial({ hasCafeteria: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Cafeteria / Dining Area
                </span>
              </label>

              <label
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                  commercial.hasSickBay
                    ? "border-teal-600 bg-teal-50"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <input
                  type="checkbox"
                  checked={commercial.hasSickBay || false}
                  onChange={(e) => updateCommercial({ hasSickBay: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Sick Bay / First Aid Room
                </span>
              </label>
            </div>

            {commercial.hasPlayground && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Playground Area
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={commercial.playgroundSqm || ""}
                    onChange={(e) => updateCommercial({ playgroundSqm: parseInt(e.target.value) || null })}
                    placeholder="e.g., 200"
                    className="w-full px-4 py-3 pr-16 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">sqm</span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Accreditation */}
        {isSchool && (
          <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Accreditation</h3>
            </div>

            <div className="p-5">
              <label
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                  commercial.ministryApproved
                    ? "border-teal-600 bg-teal-50"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <input
                  type="checkbox"
                  checked={commercial.ministryApproved || false}
                  onChange={(e) => updateCommercial({ ministryApproved: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Ministry of Education Approved
                </span>
              </label>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
