"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef } from "react";
import type { GalleryItem } from "@/lib/gallery";

type LightboxProps = {
  items: GalleryItem[];
  index: number;
  isOpen: boolean;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
};

export default function Lightbox({
  items,
  index,
  isOpen,
  onClose,
  onNext,
  onPrev,
}: LightboxProps) {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const prevRef = useRef<HTMLButtonElement | null>(null);
  const nextRef = useRef<HTMLButtonElement | null>(null);
  const touchStartX = useRef<number | null>(null);

  const item = items[index];

  const focusables = useMemo(
    () => [closeRef, prevRef, nextRef],
    []
  );

  useEffect(() => {
    if (!isOpen) return;
    closeRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key === "ArrowRight") {
        onNext();
        return;
      }
      if (event.key === "ArrowLeft") {
        onPrev();
        return;
      }
      if (event.key !== "Tab") return;

      const nodes = focusables
        .map((ref) => ref.current)
        .filter(Boolean) as HTMLButtonElement[];
      if (!nodes.length) return;

      const currentIndex = nodes.indexOf(document.activeElement as HTMLButtonElement);
      if (event.shiftKey) {
        if (currentIndex <= 0) {
          nodes[nodes.length - 1].focus();
          event.preventDefault();
        }
      } else if (currentIndex === nodes.length - 1) {
        nodes[0].focus();
        event.preventDefault();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [focusables, isOpen, onClose, onNext, onPrev]);

  if (!isOpen || !item) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 px-4 py-10"
      role="dialog"
      aria-modal="true"
      aria-label={`${item.name} expanded`}
      onClick={onClose}
      onTouchStart={(event) => {
        touchStartX.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        const startX = touchStartX.current;
        if (startX === null) return;
        const endX = event.changedTouches[0]?.clientX ?? startX;
        const delta = startX - endX;
        if (Math.abs(delta) > 50) {
          if (delta > 0) onNext();
          else onPrev();
        }
        touchStartX.current = null;
      }}
    >
      <div
        className="relative w-full max-w-4xl overflow-hidden rounded-3xl bg-pearl shadow-soft"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative aspect-[4/5] w-full sm:aspect-[16/10]">
          <Image
            src={item.src}
            alt={item.alt}
            fill
            sizes="100vw"
            className="object-cover"
          />
        </div>
        <div className="flex flex-col gap-2 border-t border-fog px-6 py-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-lg font-semibold text-ink">{item.name}</p>
              <p className="text-sm text-ink/70">{item.alt}</p>
            </div>
            <button
              ref={closeRef}
              type="button"
              className="rounded-full border border-ink px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink transition hover:bg-ink hover:text-pearl"
              onClick={onClose}
            >
              Close
            </button>
          </div>
          <div className="flex items-center justify-between">
            <button
              ref={prevRef}
              type="button"
              onClick={onPrev}
              className="text-sm font-semibold uppercase tracking-[0.2em] text-ink/70 transition hover:text-ink"
            >
              Prev
            </button>
            <button
              ref={nextRef}
              type="button"
              onClick={onNext}
              className="text-sm font-semibold uppercase tracking-[0.2em] text-ink/70 transition hover:text-ink"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
