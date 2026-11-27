"use client";

import { useEffect, useRef, type ChangeEventHandler, type FormEventHandler } from "react";
import { CircleAlert, LoaderCircle } from "lucide-react";
import styles from "./auth.module.css";

export function formatPhoneNumber(value: string) {
  const digits = value.replace(/\D/g, "").replace(/^(?:2540?|0)/, "");
  return [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6)].filter(Boolean).join(" ");
}

export function validateKenyanPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "Enter your mobile number.";
  if (!/^[17]\d{8}$/.test(digits)) return "Enter a Kenyan mobile number with 9 digits after +254.";
  return null;
}

export function AuthError({ id, children }: { id?: string; children: string }) {
  return (
    <p id={id} className={styles.error} role="alert">
      <CircleAlert size={18} aria-hidden="true" />
      {children}
    </p>
  );
}

export function AuthSpinner() {
  return <LoaderCircle size={18} className={styles.spin} aria-hidden="true" />;
}

function GoogleMark() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C15.45 2.09 12.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

export function AuthMethods({
  phone,
  phoneError,
  busy,
  onGoogle,
  onChange,
  onBlur,
  onSubmit,
  restoreFocus,
}: {
  phone: string;
  phoneError: string | null;
  busy: boolean;
  onGoogle: () => void;
  onChange: ChangeEventHandler<HTMLInputElement>;
  onBlur: () => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
  restoreFocus?: boolean;
}) {
  const field = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (restoreFocus) field.current?.focus();
  }, [restoreFocus]);

  return (
    <div className={styles.methods}>
      <button type="button" className={styles.secondary} onClick={onGoogle} disabled={busy}>
        <GoogleMark />
        Continue with Google
      </button>
      <div className={styles.divider}><span>or use your phone</span></div>
      <form className={styles.form} onSubmit={onSubmit}>
        <div className={styles.field}>
          <label htmlFor="phone">Mobile number</label>
          <div className={styles.phoneField} data-invalid={Boolean(phoneError)}>
            <span aria-label="Kenya country code">+254</span>
            <input
              ref={field}
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              placeholder="712 345 678"
              value={phone}
              onChange={onChange}
              onBlur={onBlur}
              readOnly={busy}
              aria-invalid={Boolean(phoneError)}
              aria-describedby={phoneError ? "phone-error" : undefined}
            />
          </div>
          {phoneError && <p id="phone-error" className={styles.fieldError} role="alert">{phoneError}</p>}
        </div>
        <button type="submit" className={styles.primary} disabled={busy}>Text me a code</button>
      </form>
      {busy && <span className={styles.status} role="status"><AuthSpinner /> Please wait…</span>}
    </div>
  );
}

export function AuthCode({
  code,
  busy,
  verifyLabel,
  status,
  invalid,
  onCode,
  onChangeNumber,
  onResend,
  onSubmit,
}: {
  code: string;
  busy: boolean;
  verifyLabel: string;
  status: string;
  invalid: boolean;
  onCode: (value: string) => void;
  onChangeNumber: () => void;
  onResend: () => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
}) {
  const field = useRef<HTMLInputElement>(null);
  useEffect(() => { field.current?.focus(); }, []);

  return (
    <form onSubmit={onSubmit} className={styles.form}>
      <div className={styles.field}>
        <label htmlFor="verification-code">Verification code</label>
        <input
          ref={field}
          id="verification-code"
          className={styles.codeField}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="000000"
          value={code}
          readOnly={busy}
          aria-invalid={invalid}
          aria-describedby={invalid ? "verification-error" : undefined}
          onChange={(event) => onCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
        />
      </div>
      <button type="submit" className={styles.primary} disabled={busy || code.length !== 6}>
        {busy && <AuthSpinner />}
        {verifyLabel}
      </button>
      <div className={styles.codeActions}>
        <button type="button" onClick={onChangeNumber} disabled={busy}>Change number</button>
        <button type="button" onClick={onResend} disabled={busy}>Resend code</button>
      </div>
      {status && <p role="status" className={styles.status}>{status}</p>}
    </form>
  );
}
