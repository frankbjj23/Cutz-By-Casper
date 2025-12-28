"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
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

  const tags = useMemo(() => getUniqueTags(items), [items]);
  const hasTags = tags.length > 1;

  const filteredItems = useMemo(() => {
    if (!hasTags || activeTag === "All") return items;
    return items.filter((item) => item.tags?.includes(activeTag));
  }, [activeTag, hasTags, items]);

  const openLightbox = (index: number) => {
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
                className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                  isActive
                    ? "border-ink bg-ink text-pearl"
                    : "border-fog text-ink/70 hover:border-ink hover:text-ink"
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
            onClick={() => openLightbox(index)}
            className="group text-left"
          >
            <div className="lux-card overflow-hidden transition duration-300 group-hover:-translate-y-1 group-hover:shadow-lg">
              <div className="relative aspect-[4/5] w-full">
                <Image
                  src={item.src}
                  alt={item.alt}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="object-cover transition duration-500 group-hover:scale-[1.03]"
                />
              </div>
              <div className="space-y-1 px-4 py-3">
                <p className="text-sm font-semibold text-ink">{item.name}</p>
                {item.tags?.length ? (
                  <p className="text-xs uppercase tracking-[0.2em] text-ink/60">
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
