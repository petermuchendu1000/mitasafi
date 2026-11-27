import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { homeFont } from "@/components/landing/home-font";
import styles from "./auth.module.css";

export function AuthPanel({
  mode,
  children,
}: {
  mode: "login" | "signup";
  children: ReactNode;
}) {
  return (
    <div className={`${homeFont.variable} ${styles.page}`}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label="MitaSafi home">
          <Logo variant="icon" size="sm" />
          <span aria-hidden="true">MitaSafi</span>
        </Link>
        <Link href="/properties" className={styles.backLink}>
          <ChevronLeft size={17} aria-hidden="true" />
          Browse rentals
        </Link>
      </header>
      <div className={styles.layout}>
        <main className={styles.workspace}>
          <div className={styles.content}>{children}</div>
        </main>
        <aside className={styles.editorial} aria-label="About MitaSafi">
          <Image
            src="/images/homepage/nairobi-living-room.webp"
            alt=""
            fill
            sizes="(min-width: 1450px) 640px, (min-width: 900px) 46vw, 1px"
            className={styles.editorialImage}
          />
          <div className={styles.editorialCaption}>
            <p className={styles.editorialTitle}>{mode === "login" ? "Pick up where you left off." : "Make yourself at home."}</p>
            <p>{mode === "login"
              ? "Revisit saved homes, follow up on enquiries, or manage your services."
              : "Find a rental, list a property or offer a home service across Kenya."}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

export function AuthHeading({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className={styles.heading}>
      <h1>{title}</h1>
      <p>{children}</p>
    </div>
  );
}

export function AuthLoading({ mode }: { mode: "login" | "signup" }) {
  return (
    <AuthPanel mode={mode}>
      <AuthHeading title={mode === "login" ? "Welcome back" : "Create your account"}>
        <span role="status">Loading sign-in options…</span>
      </AuthHeading>
    </AuthPanel>
  );
}
