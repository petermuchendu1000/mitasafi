/**
 * Document Viewer — Client component
 *
 * Renders a single verification document card.
 * Supports images (with click-to-zoom) and PDFs (with download link).
 */

"use client";

import { useState } from "react";
import {
  FileText,
  ImageIcon,
  ExternalLink,
  X,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";

interface DocumentViewerProps {
  document: {
    id: string;
    documentType: string;
    documentUrl: string;
    status: string;
    rejectionReason: string | null;
    reviewedAt: string | null;
    createdAt: string;
  };
}

const statusConfig: Record<
  string,
  { icon: typeof Clock; label: string; className: string }
> = {
  pending: {
    icon: Clock,
    label: "Pending review",
    className: "text-amber-600 bg-amber-50",
  },
  approved: {
    icon: CheckCircle,
    label: "Approved",
    className: "text-green-600 bg-green-50",
  },
  rejected: {
    icon: XCircle,
    label: "Rejected",
    className: "text-red-600 bg-red-50",
  },
};

export function DocumentViewer({ document: doc }: DocumentViewerProps) {
  const [showLightbox, setShowLightbox] = useState(false);
  const isImage = /\.(jpg|jpeg|png|webp|gif|svg)(\?|$)/i.test(doc.documentUrl);
  const isPdf = /\.pdf(\?|$)/i.test(doc.documentUrl);

  const statusCfg = statusConfig[doc.status] ?? statusConfig.pending;
  const StatusIcon = statusCfg.icon;

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Document preview */}
        <div className="relative aspect-[4/3] bg-gray-50">
          {isImage ? (
            <button
              onClick={() => setShowLightbox(true)}
              className="block w-full h-full cursor-zoom-in"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={doc.documentUrl}
                alt={doc.documentType}
                className="w-full h-full object-contain"
              />
            </button>
          ) : isPdf ? (
            <div className="flex flex-col items-center justify-center h-full gap-2">
              <FileText className="w-12 h-12 text-gray-400" />
              <a
                href={doc.documentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700"
              >
                Open PDF <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-2">
              <ImageIcon className="w-12 h-12 text-gray-400" />
              <a
                href={doc.documentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700"
              >
                Open file <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </div>

        {/* Document info */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-gray-900 capitalize">
              {doc.documentType.replace(/_/g, " ")}
            </h3>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusCfg.className}`}
            >
              <StatusIcon className="w-3 h-3" />
              {statusCfg.label}
            </span>
          </div>

          <div className="text-xs text-gray-500">
            Uploaded{" "}
            {new Date(doc.createdAt).toLocaleDateString("en-KE", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>

          {doc.rejectionReason && (
            <div className="mt-2 p-2 bg-red-50 rounded-lg text-xs text-red-700">
              <span className="font-medium">Rejection reason:</span>{" "}
              {doc.rejectionReason}
            </div>
          )}

          {doc.reviewedAt && (
            <div className="text-xs text-gray-400 mt-1">
              Reviewed{" "}
              {new Date(doc.reviewedAt).toLocaleDateString("en-KE", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox for images */}
      {showLightbox && isImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setShowLightbox(false)}
        >
          <button
            onClick={() => setShowLightbox(false)}
            className="absolute top-4 right-4 text-white/80 hover:text-white"
          >
            <X className="w-8 h-8" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={doc.documentUrl}
            alt={doc.documentType}
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
