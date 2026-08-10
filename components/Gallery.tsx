"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import type { GalleryItem } from "@/lib/gallery";
import Lightbox from "./Lightbox";

type GalleryProps = {
  items: GalleryItem[];
  title?: string;
  showFilter?: boolean;
};

const getUniqueTags = (items: GalleryItem[]) => {
  const tags = new Set<string>();
  for (const item of items) {
    item.tags?.forEach((tag) => tags.add(tag));
  }
  return ["All", ...Array.from(tags)];
};

export default function Gallery({ items, title, showFilter = true }: GalleryProps) {
  const [activeTag, setActiveTag] = useState("All");
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const lightboxTriggerRef = useRef<HTMLButtonElement | null>(null);

  const tags = useMemo(() => getUniqueTags(items), [items]);
  const hasTags = tags.length > 1;

  const filteredItems = useMemo(() => {
    if (!hasTags || activeTag === "All") return items;
    return items.filter((item) => item.tags?.includes(activeTag));
  }, [activeTag, hasTags, items]);

  const openLightbox = (index: number, trigger: HTMLButtonElement) => {
    lightboxTriggerRef.current = trigger;
    setLightboxIndex(index);
    setIsLightboxOpen(true);
  };

  return (
    <section className="space-y-6">
      {title ? <h2 className="section-title">{title}</h2> : null}

      {showFilter && hasTags ? (
        <div className="flex flex-wrap gap-3">
          {tags.map((tag) => {
            const isActive = tag === activeTag;
            return (
              <button
                key={tag}
                type="button"
                onClick={() => setActiveTag(tag)}
                className={`border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold ${
                  isActive
                    ? "border-gold bg-gold text-ink"
                    : "border-white/15 text-pearl/60 hover:border-gold hover:text-gold"
                }`}
                aria-pressed={isActive}
              >
                {tag}
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {filteredItems.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={(event) => openLightbox(index, event.currentTarget)}
            aria-label={`Open ${item.name}`}
            className="group text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold"
          >
            <div className="lux-card overflow-hidden transition duration-500 group-hover:-translate-y-1 group-hover:border-gold/45 group-hover:shadow-lg group-focus-visible:border-gold/70">
              <div className="relative aspect-[4/5] w-full">
                <Image
                  src={item.src}
                  alt=""
                  fill
                  sizes="(max-width: 639px) 50vw, (max-width: 1023px) 33vw, 25vw"
                  className="object-cover transition duration-700 group-hover:scale-[1.03]"
                />
              </div>
              <div className="space-y-1 border-t border-white/10 px-4 py-4">
                <p className="font-display text-base leading-snug text-pearl">{item.name}</p>
                {item.tags?.length ? (
                  <p className="text-[0.7rem] uppercase tracking-[0.22em] text-gold/80">
                    {item.tags.slice(0, 2).join(" · ")}
                  </p>
                ) : null}
              </div>
            </div>
          </button>
        ))}
      </div>

      <Lightbox
        items={filteredItems}
        index={Math.min(lightboxIndex, Math.max(filteredItems.length - 1, 0))}
        isOpen={isLightboxOpen}
        returnFocusRef={lightboxTriggerRef}
        onClose={() => setIsLightboxOpen(false)}
        onNext={() =>
          setLightboxIndex((current) =>
            filteredItems.length ? (current + 1) % filteredItems.length : 0
          )
        }
        onPrev={() =>
          setLightboxIndex((current) =>
            filteredItems.length
              ? (current - 1 + filteredItems.length) % filteredItems.length
              : 0
          )
        }
      />
    </section>
  );
}
