"use client";

import { useId, useRef, useState, type TouchEvent } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Images, X } from "lucide-react";
import { HomeIcon } from "@/components/landing/HomeIcons";
import type { ListingPhoto } from "@/lib/listings/types";
import styles from "./listing-gallery.module.css";

interface ListingGalleryProps {
  photos: ListingPhoto[];
  title: string;
  coverPhoto?: string | null;
}

const categoryLabels: Record<ListingPhoto["category"], string> = {
  cover: "Cover", living: "Living room", bedroom: "Bedroom", kitchen: "Kitchen",
  bathroom: "Bathroom", exterior: "Exterior", amenity: "Amenities", extra: "Other",
};

type PhotoCategory = ListingPhoto["category"] | "all";

function photoLabel(photo: ListingPhoto, index: number) {
  return `${categoryLabels[photo.category] ?? "Listing"} photo ${index + 1}`;
}

export function ListingGallery({ photos, title, coverPhoto }: ListingGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [category, setCategory] = useState<PhotoCategory>("all");
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);

  const sortedPhotos = photos.filter((photo) => photo.url).sort((a, b) => a.sort_order - b.sort_order);
  if (sortedPhotos.length === 0 && coverPhoto) {
    sortedPhotos.push({ id: "listing-cover", url: coverPhoto, path: "", category: "cover", sort_order: 0 });
  }
  const categories = Array.from(new Set(sortedPhotos.map((photo) => photo.category)));
  const filtered = category === "all" ? sortedPhotos : sortedPhotos.filter((photo) => photo.category === category);
  const mainIndex = Math.min(currentIndex, sortedPhotos.length - 1);
  const viewerPhoto = filtered[viewerIndex];

  function openViewer(index: number) {
    if (swiped.current) return;
    setCategory("all");
    setViewerIndex(index);
    dialog.current?.showModal();
    setViewerOpen(true);
  }

  function moveMain(step: number) {
    setCurrentIndex((index) => (Math.min(index, sortedPhotos.length - 1) + step + sortedPhotos.length) % sortedPhotos.length);
  }

  function moveViewer(step: number) {
    setViewerIndex((index) => (index + step + filtered.length) % filtered.length);
  }

  function startSwipe(event: TouchEvent<HTMLElement>) {
    swiped.current = false;
    const touch = event.touches[0];
    touchStart.current = event.touches.length === 1 ? { x: touch.clientX, y: touch.clientY } : null;
  }

  function finishSwipe(event: TouchEvent<HTMLElement>, move: (step: number) => void) {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start || event.touches.length) return;
    const touch = event.changedTouches[0];
    if (!touch) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) < 48 || Math.abs(dx) <= Math.abs(dy) * 1.3) return;
    swiped.current = true;
    move(dx > 0 ? -1 : 1);
  }

  if (sortedPhotos.length === 0) {
    return <div className={styles.placeholder}><HomeIcon name="home" size={30} /><p>No photos available</p></div>;
  }

  const photo = sortedPhotos[mainIndex];
  return (
    <section aria-label="Property photos" className={styles.gallery}>
      <div className={styles.mosaic} data-thumbnails={Math.min(sortedPhotos.length - 1, 2)}>
        <div className={styles.mainFrame}
          onTouchStart={sortedPhotos.length > 1 ? startSwipe : undefined}
          onTouchEnd={sortedPhotos.length > 1 ? (event) => finishSwipe(event, moveMain) : undefined}
          onTouchCancel={() => { touchStart.current = null; }}>
          <button type="button" className={styles.photo}
            onClick={() => openViewer(mainIndex)} onPointerDown={(event) => { if (event.pointerType !== "touch") swiped.current = false; }}
            onKeyDown={() => { swiped.current = false; }}
            aria-label={`Enlarge photo ${mainIndex + 1}`}>
            <Image key={photo.url} src={photo.url} alt={`${title}, ${photoLabel(photo, mainIndex)}`}
              fill priority={mainIndex === 0} sizes="(max-width: 720px) 100vw, (max-width: 950px) 70vw, 52vw"
              unoptimized draggable={false} />
          </button>
          {sortedPhotos.length > 1 && (
            <div className={styles.steps}>
              <button type="button" className={styles.photoControl} onClick={() => moveMain(-1)} aria-label="Previous photo"><ChevronLeft size={20} aria-hidden="true" /></button>
              <button type="button" className={styles.photoControl} onClick={() => moveMain(1)} aria-label="Next photo"><ChevronRight size={20} aria-hidden="true" /></button>
            </div>
          )}
          {sortedPhotos.length > 1 && <span className={styles.counter} role="status">{mainIndex + 1} of {sortedPhotos.length}</span>}
        </div>

        {sortedPhotos.slice(1, 3).map((thumbnail, index) => (
          <button key={thumbnail.id} type="button" className={styles.thumbnail} aria-label={`Enlarge photo ${index + 2}`}
            onClick={() => { swiped.current = false; openViewer(index + 1); }}>
            <Image src={thumbnail.url} alt={`${title}, ${photoLabel(thumbnail, index + 1)}`} fill sizes="280px" unoptimized />
          </button>
        ))}
        <button className={styles.viewPhotos} type="button" onClick={() => { swiped.current = false; openViewer(mainIndex); }}>
          <Images size={17} aria-hidden="true" /> {sortedPhotos.length === 1 ? "View photo" : "View all photos"}
        </button>
      </div>

      <dialog ref={dialog} className={styles.viewer} aria-labelledby={titleId}
        onClose={() => setViewerOpen(false)}
        onKeyDown={(event) => {
          if (filtered.length < 2 || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
          event.preventDefault();
          moveViewer(event.key === "ArrowLeft" ? -1 : 1);
        }}>
        <header className={styles.viewerHeader}>
          <h2 id={titleId}>Property photos</h2>
          <span role="status">{viewerIndex + 1} of {filtered.length}</span>
          <button type="button" className={styles.viewerControl} aria-label="Close photos" onClick={() => dialog.current?.close()}>
            <X size={23} aria-hidden="true" />
          </button>
        </header>
        {categories.length > 1 && (
          <div className={styles.categories} role="group" aria-label="Filter photos">
            {(["all", ...categories] as PhotoCategory[]).map((item) => (
              <button key={item} type="button" aria-pressed={category === item}
                onClick={() => { setCategory(item); setViewerIndex(0); }}>
                {item === "all" ? "All photos" : categoryLabels[item] ?? "Other"}
              </button>
            ))}
          </div>
        )}
        <div className={styles.viewerImage}
          onTouchStart={filtered.length > 1 ? startSwipe : undefined}
          onTouchEnd={filtered.length > 1 ? (event) => finishSwipe(event, moveViewer) : undefined}>
          {viewerOpen && viewerPhoto && <Image src={viewerPhoto.url} alt={`${title}, ${photoLabel(viewerPhoto, viewerIndex)}`}
            fill sizes="100vw" unoptimized draggable={false} />}
          {filtered.length > 1 && (
            <>
              <button type="button" className={styles.viewerControl} onClick={() => moveViewer(-1)} aria-label="Previous photo"><ChevronLeft size={24} aria-hidden="true" /></button>
              <button type="button" className={styles.viewerControl} onClick={() => moveViewer(1)} aria-label="Next photo"><ChevronRight size={24} aria-hidden="true" /></button>
            </>
          )}
        </div>
        {viewerOpen && filtered.length > 1 && (
          <div className={styles.filmstrip} role="group" aria-label="Photo thumbnails">
            {filtered.map((thumbnail, index) => (
              <button key={thumbnail.id} type="button" aria-label={`Show photo ${index + 1}`}
                aria-current={viewerIndex === index ? "true" : undefined} onClick={() => setViewerIndex(index)}>
                <Image src={thumbnail.url} alt="" fill sizes="68px" unoptimized />
              </button>
            ))}
          </div>
        )}
      </dialog>
    </section>
  );
}

export default ListingGallery;
