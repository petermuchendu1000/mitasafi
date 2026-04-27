/**
 * Phone Verification Form
 * 
 * Client component handling the phone verification flow:
 * 1. Enter/confirm phone number
 * 2. Send OTP
 * 3. Enter OTP code
 * 4. Verify and proceed
 * 
 * Uses optimistic UI and handles all edge cases.
 */

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { sendPhoneOTP, verifyPhoneOTP } from "./actions";

interface PhoneVerificationFormProps {
  initialPhone: string | null;
  userId: string;
}

type Step = "phone" | "otp" | "success";

// Kenyan phone number formatting
function formatKenyanPhone(value: string): string {
  // Remove all non-digits
  const digits = value.replace(/\D/g, "");
  
  // Handle different input formats
  if (digits.startsWith("254")) {
    // Already has country code
    return "+" + digits;
  } else if (digits.startsWith("0")) {
    // Kenyan local format (07...)
    return "+254" + digits.slice(1);
  } else if (digits.startsWith("7") || digits.startsWith("1")) {
    // Just the number without 0
    return "+254" + digits;
  }
  
  return digits ? "+" + digits : "";
}

// Validate Kenyan phone number
function isValidKenyanPhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, "");
  // Must be 12 digits starting with 254
  return cleaned.length === 12 && cleaned.startsWith("254");
}

// Format for display
function formatPhoneDisplay(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 12 && cleaned.startsWith("254")) {
    return `+${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9)}`;
  }
  return phone;
}

export function PhoneVerificationForm({ initialPhone, userId }: PhoneVerificationFormProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState(initialPhone ? formatKenyanPhone(initialPhone) : "");
  const [displayPhone, setDisplayPhone] = useState(
    initialPhone ? formatPhoneDisplay(formatKenyanPhone(initialPhone)) : ""
  );
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [canResend, setCanResend] = useState(false);
  // DEV MODE: Show OTP when SMS is disabled
  const [devOtp, setDevOtp] = useState<string | null>(null);
  
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && step === "otp") {
      setCanResend(true);
    }
  }, [countdown, step]);

  // Handle phone input change
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only digits, +, and spaces for display
    const cleaned = value.replace(/[^\d+\s]/g, "");
    setDisplayPhone(cleaned);
    
    // Store clean version
    const formatted = formatKenyanPhone(cleaned);
    setPhone(formatted);
    setError(null);
  };

  // Handle phone submission
  const handleSendOTP = async () => {
    setError(null);
    
    if (!isValidKenyanPhone(phone)) {
      setError("Please enter a valid Kenyan phone number (e.g., 0712 345 678)");
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await sendPhoneOTP(phone, userId);
      
      if (result.success) {
        setStep("otp");
        setCountdown(60); // 60 second countdown
        setCanResend(false);
        // DEV MODE: Store OTP for display
        if (result.devOtp) {
          setDevOtp(result.devOtp);
        }
        // Focus first OTP input
        setTimeout(() => otpRefs.current[0]?.focus(), 100);
      } else {
        setError(result.error || "Failed to send verification code");
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle OTP input
  const handleOtpChange = (index: number, value: string) => {
    // Only allow single digit
    const digit = value.replace(/\D/g, "").slice(-1);
    
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    setError(null);
    
    // Auto-advance to next input
    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
    
    // Auto-submit when all digits entered
    if (digit && index === 5 && newOtp.every(d => d)) {
      handleVerifyOTP(newOtp.join(""));
    }
  };

  // Handle OTP paste
  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    
    if (pastedData.length === 6) {
      const newOtp = pastedData.split("");
      setOtp(newOtp);
      // Focus last input and auto-submit
      otpRefs.current[5]?.focus();
      handleVerifyOTP(pastedData);
    }
  };

  // Handle backspace in OTP
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  // Handle OTP verification
  const handleVerifyOTP = useCallback(async (code: string) => {
    if (code.length !== 6) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await verifyPhoneOTP(code, phone, userId);
      
      if (result.success) {
        setStep("success");
        // Redirect after brief success message
        setTimeout(() => {
          router.push("/dashboard/provider");
          router.refresh();
        }, 1500);
      } else {
        setError(result.error || "Invalid verification code");
        // Clear OTP on error
        setOtp(["", "", "", "", "", ""]);
        otpRefs.current[0]?.focus();
      }
    } catch (err) {
      setError("Verification failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [phone, userId, router]);

  // Handle resend
  const handleResend = async () => {
    if (!canResend) return;
    
    setIsLoading(true);
    setError(null);
    setOtp(["", "", "", "", "", ""]);
    setDevOtp(null);
    
    try {
      const result = await sendPhoneOTP(phone, userId);
      
      if (result.success) {
        setCountdown(60);
        setCanResend(false);
        // DEV MODE: Store OTP for display
        if (result.devOtp) {
          setDevOtp(result.devOtp);
        }
        otpRefs.current[0]?.focus();
      } else {
        setError(result.error || "Failed to resend code");
      }
    } catch (err) {
      setError("Failed to resend. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Render phone input step
  if (step === "phone") {
    return (
      <div className="space-y-5">
        {/* Phone Input */}
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1.5">
            Phone Number
          </label>
          <input
            id="phone"
            type="tel"
            value={displayPhone}
            onChange={handlePhoneChange}
            placeholder="0712 345 678"
            className={`
              block w-full px-4 py-2.5
              border rounded-lg
              text-gray-900 placeholder-gray-400
              focus:ring-2 focus:ring-teal-500 focus:border-teal-500
              ${error ? "border-red-300" : "border-gray-300"}
            `}
            autoComplete="tel"
            autoFocus
          />
        </div>

        {/* Error Message */}
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        {/* Submit Button */}
        <button
          onClick={handleSendOTP}
          disabled={isLoading || !phone}
          className={`
            w-full py-2.5 rounded-lg font-medium transition-colors
            ${isLoading || !phone
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-teal-600 text-white hover:bg-teal-700"
            }
          `}
        >
          {isLoading ? "Sending..." : "Send code"}
        </button>

        {/* Skip Option */}
        <p className="text-center text-sm text-gray-500">
          <a href="/auth/signout" className="hover:text-gray-700">
            I&apos;ll do this later
          </a>
        </p>
      </div>
    );
  }

  // Render OTP input step
  if (step === "otp") {
    return (
      <div className="space-y-5">
        {/* Phone Display */}
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Code sent to <span className="font-medium text-gray-900">{formatPhoneDisplay(phone)}</span>
          </p>
          <button
            onClick={() => setStep("phone")}
            className="text-teal-600 text-sm hover:underline"
          >
            Change
          </button>
        </div>

        {/* DEV MODE: Show OTP for testing */}
        {devOtp && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
            <p className="text-xs text-amber-600 font-medium">DEV MODE - SMS DISABLED</p>
            <p className="text-lg font-mono font-bold text-amber-800 tracking-wider mt-1">{devOtp}</p>
          </div>
        )}

        {/* OTP Input Grid */}
        <div className="flex justify-center gap-2">
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => { otpRefs.current[index] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleOtpChange(index, e.target.value)}
              onKeyDown={(e) => handleOtpKeyDown(index, e)}
              onPaste={handleOtpPaste}
              className={`
                w-10 h-12 text-center text-lg font-semibold
                border rounded-lg
                focus:ring-2 focus:ring-teal-500 focus:border-teal-500
                ${error ? "border-red-300" : digit ? "border-teal-500" : "border-gray-300"}
              `}
              disabled={isLoading}
            />
          ))}
        </div>

        {/* Error Message */}
        {error && (
          <p className="text-sm text-red-600 text-center">{error}</p>
        )}

        {/* Verify Button */}
        <button
          onClick={() => handleVerifyOTP(otp.join(""))}
          disabled={isLoading || otp.some(d => !d)}
          className={`
            w-full py-2.5 rounded-lg font-medium transition-colors
            ${isLoading || otp.some(d => !d)
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-teal-600 text-white hover:bg-teal-700"
            }
          `}
        >
          {isLoading ? "Verifying..." : "Verify"}
        </button>

        {/* Resend Option */}
        <p className="text-center text-sm text-gray-500">
          {canResend ? (
            <button
              onClick={handleResend}
              disabled={isLoading}
              className="text-teal-600 hover:underline"
            >
              Resend code
            </button>
          ) : (
            <>Resend in {countdown}s</>
          )}
        </p>
      </div>
    );
  }

  // Render success step
  return (
    <div className="text-center py-6">
      <div className="w-12 h-12 mx-auto mb-3 bg-green-100 rounded-full flex items-center justify-center">
        <CheckCircle2 className="w-6 h-6 text-green-600" />
      </div>
      <p className="font-medium text-gray-900">Phone verified</p>
      <p className="text-sm text-gray-500 mt-1">Redirecting...</p>
    </div>
  );
}
