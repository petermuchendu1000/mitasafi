/**
 * Shared Field Configuration Types & Components
 * 
 * Provides reusable form field primitives for specialized spaces.
 * Enables configuration-driven form generation with type safety.
 */

import { cn } from "@/lib/utils";
import { Minus, Plus } from "lucide-react";
import type { CommercialFormData } from "../../../commercial-types";

// =============================================================================
// FIELD CONFIGURATION TYPES
// =============================================================================

export type FieldType = 
  | "number" 
  | "text" 
  | "counter" 
  | "checkbox" 
  | "select" 
  | "multi-select"
  | "button-group";

export interface BaseFieldConfig {
  id: keyof CommercialFormData;
  label: string;
  required?: boolean;
  description?: string;
}

export interface NumberFieldConfig extends BaseFieldConfig {
  type: "number";
  placeholder?: string;
  unit?: string;
  min?: number;
  max?: number;
}

export interface TextFieldConfig extends BaseFieldConfig {
  type: "text";
  placeholder?: string;
}

export interface CounterFieldConfig extends BaseFieldConfig {
  type: "counter";
  min?: number;
  max?: number;
}

export interface CheckboxFieldConfig extends BaseFieldConfig {
  type: "checkbox";
}

export interface SelectFieldConfig extends BaseFieldConfig {
  type: "select" | "button-group";
  options: { id: string; label: string; description?: string }[];
}

export interface MultiSelectFieldConfig extends BaseFieldConfig {
  type: "multi-select";
  options: { id: string; label: string }[];
}

export type FieldConfig = 
  | NumberFieldConfig 
  | TextFieldConfig 
  | CounterFieldConfig 
  | CheckboxFieldConfig 
  | SelectFieldConfig
  | MultiSelectFieldConfig;

export interface SectionConfig {
  id: string;
  title: string;
  description?: string;
  fields: FieldConfig[];
  columns?: 1 | 2 | 3;
}

// =============================================================================
// SHARED FIELD COMPONENTS
// =============================================================================

interface NumberInputProps {
  value: number | null;
  onChange: (value: number | null) => void;
  placeholder?: string;
  unit?: string;
  min?: number;
  max?: number;
  required?: boolean;
}

export function NumberInput({ 
  value, 
  onChange, 
  placeholder, 
  unit,
  min,
  max,
  required 
}: NumberInputProps) {
  return (
    <div className="relative">
      <input
        type="number"
        value={value ?? ""}
        onChange={(e) => {
          const val = e.target.value ? parseInt(e.target.value) : null;
          if (val !== null && min !== undefined && val < min) return;
          if (val !== null && max !== undefined && val > max) return;
          onChange(val);
        }}
        placeholder={placeholder}
        min={min}
        max={max}
        className={cn(
          "w-full px-4 py-3 rounded-lg border border-gray-300",
          "focus:outline-none focus:ring-2 focus:ring-teal-500",
          unit && "pr-16"
        )}
      />
      {unit && (
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
          {unit}
        </span>
      )}
    </div>
  );
}

interface CounterInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label?: string;
}

export function CounterInput({ 
  value, 
  onChange, 
  min = 0, 
  max = 100,
  label 
}: CounterInputProps) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className={cn(
          "w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center",
          "hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        )}
      >
        <Minus className="w-4 h-4 text-gray-600" />
      </button>
      <span className="w-12 text-center font-semibold text-gray-900">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className={cn(
          "w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center",
          "hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        )}
      >
        <Plus className="w-4 h-4 text-gray-600" />
      </button>
      {label && <span className="text-sm text-gray-500 ml-2">{label}</span>}
    </div>
  );
}

interface CheckboxInputProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}

export function CheckboxInput({ checked, onChange, label, description }: CheckboxInputProps) {
  return (
    <label
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
        checked
          ? "border-teal-600 bg-teal-50"
          : "border-gray-200 hover:border-gray-300"
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 mt-0.5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
      />
      <div>
        <span className="text-sm font-medium text-gray-700 block">{label}</span>
        {description && (
          <span className="text-xs text-gray-500">{description}</span>
        )}
      </div>
    </label>
  );
}

interface ButtonGroupProps<T extends string> {
  value: T | null;
  onChange: (value: T) => void;
  options: { id: T; label: string; description?: string }[];
  columns?: 2 | 3 | 4;
}

export function ButtonGroup<T extends string>({ 
  value, 
  onChange, 
  options,
  columns = 4 
}: ButtonGroupProps<T>) {
  return (
    <div className={cn(
      "grid gap-3",
      columns === 2 && "grid-cols-2",
      columns === 3 && "grid-cols-3",
      columns === 4 && "grid-cols-2 sm:grid-cols-4"
    )}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          className={cn(
            "p-3 rounded-lg border-2 text-left transition-all",
            value === option.id
              ? "border-teal-600 bg-teal-50"
              : "border-gray-200 hover:border-gray-300"
          )}
        >
          <span className={cn(
            "block text-sm font-medium",
            value === option.id ? "text-teal-700" : "text-gray-900"
          )}>
            {option.label}
          </span>
          {option.description && (
            <span className="text-xs text-gray-500">{option.description}</span>
          )}
        </button>
      ))}
    </div>
  );
}

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function TextInput({ value, onChange, placeholder }: TextInputProps) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
    />
  );
}

// =============================================================================
// SECTION WRAPPER COMPONENT
// =============================================================================

interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function FormSection({ title, description, children }: FormSectionProps) {
  return (
    <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        {description && (
          <p className="text-sm text-gray-500 mt-0.5">{description}</p>
        )}
      </div>
      <div className="p-5 space-y-5">
        {children}
      </div>
    </section>
  );
}

// =============================================================================
// FIELD LABEL COMPONENT
// =============================================================================

interface FieldLabelProps {
  label: string;
  required?: boolean;
  description?: string;
}

export function FieldLabel({ label, required, description }: FieldLabelProps) {
  return (
    <div className="mb-2">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-orange-500 ml-0.5">*</span>}
      </label>
      {description && (
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      )}
    </div>
  );
}

// =============================================================================
// PAGE HEADER COMPONENT
// =============================================================================

interface PageHeaderProps {
  title: string;
  description: string;
}

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <div className="text-center mb-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
      <p className="text-gray-500">{description}</p>
    </div>
  );
}
