/**
 * Identity Verification Form
 * 
 * Step 3 of verification: Upload ID documents
 * - Individual: National ID + Selfie
 * - Business: Business Registration + KRA Certificate
 */

"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, Camera, X, Check, AlertCircle } from "lucide-react";
import { uploadVerificationDocument, completeIdentityVerification } from "./actions";

interface IdentityVerificationFormProps {
  userId: string;
  providerId: string;
  providerType: "individual" | "company";
}

interface UploadedFile {
  name: string;
  url: string;
  type: string;
}

// Document requirements by provider type
const documentRequirements = {
  individual: [
    {
      id: "national_id",
      label: "National ID",
      description: "Front side of your Kenyan National ID card",
      icon: FileText,
      accept: "image/*,.pdf",
      required: true,
    },
    {
      id: "selfie_with_id",
      label: "Selfie with ID",
      description: "A clear photo of you holding your ID",
      icon: Camera,
      accept: "image/*",
      required: true,
    },
  ],
  company: [
    {
      id: "business_registration",
      label: "Business Registration",
      description: "Certificate of incorporation or business registration",
      icon: FileText,
      accept: "image/*,.pdf",
      required: true,
    },
    {
      id: "kra_certificate",
      label: "KRA PIN Certificate",
      description: "Your business KRA PIN certificate",
      icon: FileText,
      accept: "image/*,.pdf",
      required: true,
    },
  ],
};

export function IdentityVerificationForm({ 
  userId, 
  providerId, 
  providerType 
}: IdentityVerificationFormProps) {
  const router = useRouter();
  const requirements = documentRequirements[providerType];
  
  const [uploads, setUploads] = useState<Record<string, UploadedFile | null>>({});
  const [uploading, setUploading] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Check if all required documents are uploaded
  const allRequiredUploaded = requirements
    .filter(r => r.required)
    .every(r => uploads[r.id]);

  const handleFileSelect = async (docId: string, file: File) => {
    if (!file) return;
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("File size must be less than 5MB");
      return;
    }

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!validTypes.includes(file.type)) {
      setError("Please upload an image (JPG, PNG) or PDF file");
      return;
    }

    setUploading(docId);
    setError(null);

    try {
      const result = await uploadVerificationDocument(
        providerId,
        docId,
        file,
        userId
      );

      if (result.success && result.url) {
        setUploads(prev => ({
          ...prev,
          [docId]: {
            name: file.name,
            url: result.url!,
            type: file.type,
          }
        }));
      } else {
        setError(result.error || "Upload failed. Please try again.");
      }
    } catch (err) {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(null);
    }
  };

  const handleRemoveFile = (docId: string) => {
    setUploads(prev => {
      const newUploads = { ...prev };
      delete newUploads[docId];
      return newUploads;
    });
  };

  const handleSubmit = async () => {
    if (!allRequiredUploaded) return;
    
    setIsSubmitting(true);
    setError(null);

    try {
      const documentUrls = Object.entries(uploads).reduce((acc, [key, value]) => {
        if (value) acc[key] = value.url;
        return acc;
      }, {} as Record<string, string>);

      const result = await completeIdentityVerification(
        providerId,
        providerType,
        documentUrls,
        userId
      );

      if (result.success) {
        // Refresh the page so the server component re-evaluates the pending state
        router.refresh();
      } else {
        setError(result.error || "Verification failed. Please try again.");
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Document Upload Cards */}
      {requirements.map((doc) => {
        const Icon = doc.icon;
        const uploaded = uploads[doc.id];
        const isUploading = uploading === doc.id;

        return (
          <div
            key={doc.id}
            className={`
              bg-white rounded-xl border-2 p-5 transition-all
              ${uploaded ? "border-teal-200 bg-teal-50/30" : "border-gray-200"}
            `}
          >
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className={`
                w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                ${uploaded ? "bg-teal-100 text-teal-600" : "bg-gray-100 text-gray-500"}
              `}>
                {uploaded ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-gray-900">{doc.label}</h3>
                  {doc.required && !uploaded && (
                    <span className="text-xs text-red-500">Required</span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-0.5">{doc.description}</p>

                {/* Upload Status / Actions */}
                {uploaded ? (
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-sm text-teal-700 truncate flex-1">
                      {uploaded.name}
                    </span>
                    <button
                      onClick={() => handleRemoveFile(doc.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                      disabled={isSubmitting}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="mt-3">
                    <input
                      ref={(el) => { fileInputRefs.current[doc.id] = el; }}
                      type="file"
                      accept={doc.accept}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileSelect(doc.id, file);
                      }}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRefs.current[doc.id]?.click()}
                      disabled={isUploading || isSubmitting}
                      className={`
                        inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors
                        ${isUploading
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }
                      `}
                    >
                      {isUploading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          Choose file
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={!allRequiredUploaded || isSubmitting}
        className={`
          w-full py-3 rounded-lg font-medium transition-colors mt-4
          ${!allRequiredUploaded || isSubmitting
            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
            : "bg-teal-600 text-white hover:bg-teal-700"
          }
        `}
      >
        {isSubmitting ? "Submitting..." : "Submit for Review"}
      </button>

      {/* Info Note */}
      <div className="text-xs text-gray-500 text-center space-y-1 mt-4">
        <p>Your documents will be reviewed within 24 hours.</p>
        <p>All information is encrypted and stored securely.</p>
      </div>
    </div>
  );
}
