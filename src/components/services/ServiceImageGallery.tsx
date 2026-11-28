"use client";

import { useEffect, useRef, useState, type TouchEvent } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";
import styles from "./service-image-gallery.module.css";

interface ServiceImageGalleryProps {
  images: string[];
  title: string;
}

export function ServiceImageGallery({ images, title }: ServiceImageGalleryProps) {
  const [selected, setSelected] = useState(images[0]);
  const [failed, setFailed] = useState<Set<string>>(new Set());
  const [isOpen, setIsOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const swipeEndedAt = useRef(0);
  const photos = images.filter((url) => !failed.has(url));
  const activeIndex = Math.max(0, photos.indexOf(selected));
  const activePhoto = photos[activeIndex];

  function step(direction: number) {
    if (photos.length > 1) {
      setSelected(photos[(activeIndex + direction + photos.length) % photos.length]);
    }
  }

  function markFailed(url: string) {
    if (photos.length === 1) dialog.current?.close();
    setFailed((previous) => new Set(previous).add(url));
  }

  function finishSwipe(event: TouchEvent<HTMLButtonElement>) {
    const start = touchStart.current;
    touchStart.current = null;
    const end = event.changedTouches[0];
    if (!start || !end || photos.length < 2) return;

    const horizontal = end.clientX - start.x;
    const vertical = end.clientY - start.y;
    if (Math.abs(horizontal) >= 44 && Math.abs(horizontal) > Math.abs(vertical) * 1.3) {
      swipeEndedAt.current = Date.now();
      step(horizontal < 0 ? 1 : -1);
    }
  }

  useEffect(() => {
    const strip = rail.current;
    const thumbnail = strip?.querySelector<HTMLButtonElement>('[aria-pressed="true"]');
    if (!strip || !thumbnail) return;

    const inset = 3;
    const left = thumbnail.offsetLeft - inset;
    const right = thumbnail.offsetLeft + thumbnail.offsetWidth + inset;
    if (left < strip.scrollLeft) strip.scrollLeft = left;
    if (right > strip.scrollLeft + strip.clientWidth) strip.scrollLeft = right - strip.clientWidth;
  }, [activeIndex, activePhoto, photos.length]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!activePhoto) return null;

  return (
    <div className={styles.gallery} role="group" aria-label="Service photos">
      <div className={styles.stage}>
        <button
          type="button"
          className={styles.preview}
          onClick={(event) => {
            if (event.detail > 0 && Date.now() - swipeEndedAt.current < 400) return;
            dialog.current?.showModal();
            setIsOpen(true);
          }}
          onTouchStart={(event) => {
            const finger = event.touches[0];
            touchStart.current = event.touches.length === 1 && finger ? { x: finger.clientX, y: finger.clientY } : null;
          }}
          onTouchEnd={finishSwipe}
          onTouchCancel={() => { touchStart.current = null; }}
          aria-label="Enlarge photo"
          aria-haspopup="dialog"
        >
          <Image
            src={activePhoto}
            alt={title + " photo " + (activeIndex + 1)}
            fill
            sizes="(max-width: 844px) 90vw, 760px"
            loading={activeIndex === 0 ? "eager" : undefined}
            fetchPriority={activeIndex === 0 ? "high" : undefined}
            className={styles.previewImage}
            unoptimized={activePhoto.startsWith("/images/services-landing/optimized/")}
            onError={() => markFailed(activePhoto)}
          />
          <span className={styles.enlarge}><Maximize2 size={17} aria-hidden="true" /></span>
        </button>
        {photos.length > 1 && (
          <div className={`${styles.navigation} ${styles.stageNavigation}`}>
            <button type="button" onClick={() => step(-1)} aria-label="Previous photo"><ChevronLeft size={20} aria-hidden="true" /></button>
            <span role="status">{activeIndex + 1} / {photos.length}</span>
            <button type="button" onClick={() => step(1)} aria-label="Next photo"><ChevronRight size={20} aria-hidden="true" /></button>
          </div>
        )}
      </div>

      {photos.length > 1 && (
        <div ref={rail} className={styles.thumbnails} role="group" aria-label="Photo thumbnails">
          {photos.map((photo, index) => (
            <button type="button" key={photo} onClick={() => setSelected(photo)}
              aria-label={"Show photo " + (index + 1)} aria-pressed={index === activeIndex}
              className={styles.thumbnail}>
              <Image src={photo} alt="" fill sizes="72px" className={styles.previewImage}
                unoptimized={photo.startsWith("/images/services-landing/optimized/")} onError={() => markFailed(photo)} />
            </button>
          ))}
        </div>
      )}

      <dialog
        ref={dialog}
        className={styles.dialog}
        aria-label={title + " photos"}
        onClose={() => setIsOpen(false)}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            step(event.key === "ArrowRight" ? 1 : -1);
          }
        }}
      >
        <div className={styles.dialogTop}>
          <span>{title}</span>
          <button type="button" onClick={() => dialog.current?.close()} aria-label="Close photo">
            <X size={22} aria-hidden="true" />
          </button>
        </div>
        {isOpen && (
          <div className={styles.fullPhoto}>
            <Image src={activePhoto} alt={title + " photo " + (activeIndex + 1)} fill
              sizes="(max-width: 1000px) 100vw, 950px" className={styles.fullImage}
              unoptimized={activePhoto.startsWith("/images/services-landing/optimized/")}
              onError={() => markFailed(activePhoto)} />
          </div>
        )}
        {photos.length > 1 && (
          <div className={styles.navigation}>
            <button type="button" onClick={() => step(-1)} aria-label="Previous photo"><ChevronLeft size={20} aria-hidden="true" /></button>
            <span role="status">{activeIndex + 1} / {photos.length}</span>
            <button type="button" onClick={() => step(1)} aria-label="Next photo"><ChevronRight size={20} aria-hidden="true" /></button>
          </div>
        )}
      </dialog>
    </div>
  );
}
