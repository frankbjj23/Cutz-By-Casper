"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import type { GalleryItem } from "@/lib/gallery";

type LightboxProps = {
  items: GalleryItem[];
  index: number;
  isOpen: boolean;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
};

export default function Lightbox({
  items,
  index,
  isOpen,
  returnFocusRef,
  onClose,
  onNext,
  onPrev,
}: LightboxProps) {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const prevRef = useRef<HTMLButtonElement | null>(null);
  const nextRef = useRef<HTMLButtonElement | null>(null);
  const touchStartX = useRef<number | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const item = items[index];

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const returnFocusNode = returnFocusRef.current ?? previousFocusRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      returnFocusNode?.focus();
    };
  }, [isOpen, returnFocusRef]);

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

      const nodes = [closeRef, prevRef, nextRef]
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
  }, [isOpen, onClose, onNext, onPrev]);

  if (!isOpen || !item) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/90 px-4 py-4 backdrop-blur-sm sm:py-10"
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
        className="relative my-auto max-h-[calc(100dvh-2rem)] w-full max-w-4xl overflow-x-hidden overflow-y-auto overscroll-contain border border-white/10 bg-graphite shadow-soft sm:max-h-[calc(100dvh-5rem)]"
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
        <div className="flex flex-col gap-3 border-t border-white/10 px-6 py-5">
          <div className="flex justify-end">
            <button
              ref={closeRef}
              type="button"
              className="border border-gold/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-pearl transition hover:bg-gold hover:text-ink"
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
              className="inline-flex min-h-11 items-center text-sm font-semibold uppercase tracking-[0.2em] text-pearl/60 transition hover:text-gold"
            >
              Prev
            </button>
            <button
              ref={nextRef}
              type="button"
              onClick={onNext}
              className="inline-flex min-h-11 items-center text-sm font-semibold uppercase tracking-[0.2em] text-pearl/60 transition hover:text-gold"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
