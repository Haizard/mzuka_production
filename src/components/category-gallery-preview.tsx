"use client";

import { useState, useEffect } from "react";

type CategoryImage = {
  filename: string;
  alt: string;
};

type CategoryGallery = {
  name: string;
  folder: string;
  images: CategoryImage[];
};

type CategoryGalleryPreviewProps = {
  categories: CategoryGallery[];
};

export function CategoryGalleryPreview({ categories }: CategoryGalleryPreviewProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeCategory = categories[activeIndex];
  const [isSmall, setIsSmall] = useState(false);

  useEffect(() => {
    function update() {
      setIsSmall(typeof window !== "undefined" ? window.innerWidth < 640 : false);
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-[var(--surface)]">
      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-12">
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--gold)] mb-3">Client Galleries</p>
          <h2 className="text-4xl sm:text-5xl font-bold text-white">Browse by category</h2>
          <p className="mt-4 text-zinc-400 text-lg max-w-2xl mx-auto">
            Click a category to preview the actual gallery imagery for that collection.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-10">
          <div className="space-y-4 lg:w-[38%]">
            <div className="rounded-3xl border border-white/10 bg-black/40 p-6">
              <p className="text-sm uppercase tracking-[0.3em] text-[var(--gold)] mb-4">Popular categories</p>
              <div className="flex gap-3 overflow-x-auto py-1 px-1 lg:flex-col lg:overflow-visible">
                <div className="-mx-6 px-6 lg:mx-0 lg:px-0">
                  <div className="flex gap-3 overflow-x-auto lg:block">
                    {categories.map((category, index) => {
                      const active = index === activeIndex;
                      return (
                        <button
                          key={category.name}
                          type="button"
                          onClick={() => setActiveIndex(index)}
                          className={`rounded-2xl px-4 py-3 transition flex-shrink-0 ${isSmall ? 'min-w-[140px]' : 'w-full text-left'} ${active ? 'bg-white/10 border border-[var(--gold)]/20 text-white' : 'bg-white/5 text-zinc-300 hover:bg-white/10'}`}
                        >
                          <div className={`flex items-center justify-between gap-3 ${isSmall ? 'flex-col items-start gap-2' : ''}`}>
                            <span className="font-medium">{category.name}</span>
                            <span className="text-xs uppercase tracking-[0.25em] text-zinc-400">{category.images.length} photos</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/40 p-6">
              <p className="text-sm uppercase tracking-[0.3em] text-[var(--gold)] mb-4">Featured gallery</p>
              <p className="text-zinc-300 text-base leading-relaxed">
                Selected category previews come directly from the matching folder in the project image library.
              </p>
            </div>
          </div>

          <div className="lg:flex-1">
            <div className="rounded-[2.5rem] overflow-hidden border border-white/10 bg-black/20 shadow-2xl shadow-black/20">
              <div className="p-2 bg-zinc-950/90">
                {activeCategory.images.length > 0 ? (
                  isSmall ? (
                    <div className="grid grid-cols-2 gap-2">
                      {activeCategory.images[0] && (
                        <div className="relative col-span-2 aspect-[4/3] overflow-hidden rounded-3xl bg-zinc-900">
                          <img
                            src={`/api/gallery-image?category=${encodeURIComponent(activeCategory.name)}&file=${encodeURIComponent(activeCategory.images[0].filename)}`}
                            alt={activeCategory.images[0].alt}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      )}
                      {activeCategory.images.slice(1, 4).map((image) => (
                        <div key={image.filename} className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-zinc-900">
                          <img
                            src={`/api/gallery-image?category=${encodeURIComponent(activeCategory.name)}&file=${encodeURIComponent(image.filename)}`}
                            alt={image.alt}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {activeCategory.images.slice(0, 4).map((image) => (
                        <div key={image.filename} className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-zinc-900">
                          <img
                            src={`/api/gallery-image?category=${encodeURIComponent(activeCategory.name)}&file=${encodeURIComponent(image.filename)}`}
                            alt={image.alt}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  <div className="flex h-72 items-center justify-center rounded-3xl bg-white/5 p-6 text-center text-zinc-400">
                    No preview images were found for this category.
                  </div>
                )}
              </div>
              <div className="p-6 bg-black/80">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.3em] text-[var(--gold)]">{activeCategory.name}</p>
                    <p className="mt-2 text-white text-xl font-semibold">{activeCategory.images.length} images available</p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveIndex((prev) => (prev + 1) % categories.length)}
                      className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--gold)] px-5 text-sm font-semibold text-black hover:bg-yellow-400 transition"
                    >
                      Next category
                    </button>
                    <LinkButton href="#gallery">View full work</LinkButton>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function LinkButton({ href }: { href: string }) {
  return (
    <a
      href={href}
      className="inline-flex h-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-5 text-sm font-semibold text-white hover:bg-white/10 transition"
    >
      Explore gallery
    </a>
  );
}
