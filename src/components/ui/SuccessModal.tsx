/**
 * Success Modal Component
 * 
 * Celebratory modal shown after successful actions like publishing a listing.
 * Includes confetti animation option and clear next-step CTAs.
 */

"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { CheckCircle, ExternalLink, Eye, Pencil, X } from "lucide-react";
import Link from "next/link";

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  primaryAction?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  secondaryAction?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  showConfetti?: boolean;
}

export function SuccessModal({
  isOpen,
  onClose,
  title,
  message,
  primaryAction,
  secondaryAction,
  showConfetti = true,
}: SuccessModalProps) {
  const [confettiPieces, setConfettiPieces] = useState<Array<{ id: number; style: React.CSSProperties }>>([]);

  // Generate confetti on mount
  useEffect(() => {
    if (isOpen && showConfetti) {
      const pieces = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        style: {
          left: `${Math.random() * 100}%`,
          animationDelay: `${Math.random() * 0.5}s`,
          backgroundColor: [
            "#14b8a6", // teal-500
            "#f97316", // orange-500
            "#eab308", // yellow-500
            "#3b82f6", // blue-500
            "#a855f7", // purple-500
            "#ec4899", // pink-500
          ][Math.floor(Math.random() * 6)],
        },
      }));
      setConfettiPieces(pieces);

      // Clear confetti after animation
      const timer = setTimeout(() => setConfettiPieces([]), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, showConfetti]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-50 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div 
          className={cn(
            "relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 pointer-events-auto",
            "animate-in zoom-in-95 fade-in duration-300"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Confetti */}
          {showConfetti && confettiPieces.length > 0 && (
            <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
              {confettiPieces.map((piece) => (
                <div
                  key={piece.id}
                  className="absolute w-2 h-2 rounded-sm animate-confetti"
                  style={piece.style}
                />
              ))}
            </div>
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Content */}
          <div className="text-center">
            {/* Success Icon */}
            <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-teal-600" />
            </div>

            {/* Title */}
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {title}
            </h2>

            {/* Message */}
            <p className="text-gray-600 mb-6">
              {message}
            </p>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              {secondaryAction && (
                secondaryAction.href ? (
                  <Link
                    href={secondaryAction.href}
                    className={cn(
                      "flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg",
                      "text-gray-700 bg-gray-100 hover:bg-gray-200",
                      "text-sm font-medium transition-colors"
                    )}
                  >
                    <Pencil className="w-4 h-4" />
                    {secondaryAction.label}
                  </Link>
                ) : (
                  <button
                    onClick={secondaryAction.onClick}
                    className={cn(
                      "flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg",
                      "text-gray-700 bg-gray-100 hover:bg-gray-200",
                      "text-sm font-medium transition-colors"
                    )}
                  >
                    <Pencil className="w-4 h-4" />
                    {secondaryAction.label}
                  </button>
                )
              )}

              {primaryAction && (
                primaryAction.href ? (
                  <Link
                    href={primaryAction.href}
                    className={cn(
                      "flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg",
                      "text-white bg-teal-600 hover:bg-teal-700",
                      "text-sm font-semibold transition-colors shadow-sm"
                    )}
                  >
                    <Eye className="w-4 h-4" />
                    {primaryAction.label}
                  </Link>
                ) : (
                  <button
                    onClick={primaryAction.onClick}
                    className={cn(
                      "flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg",
                      "text-white bg-teal-600 hover:bg-teal-700",
                      "text-sm font-semibold transition-colors shadow-sm"
                    )}
                  >
                    <Eye className="w-4 h-4" />
                    {primaryAction.label}
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
