"use client";

import { useState } from "react";
import { mediaUrl } from "@/lib/api";
import { cn } from "@/lib/utils";

export function AuctionGallery({
  images,
  title,
}: {
  images?: string[] | string | null;
  title: string;
}) {
  const list = (Array.isArray(images) ? images : images ? [images] : []).filter(
    Boolean
  );
  const [active, setActive] = useState(0);
  const src = mediaUrl(list[active] || list[0] || "");

  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-border bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={title}
          className="aspect-[4/3] w-full object-cover"
        />
      </div>
      {list.length > 1 ? (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {list.map((img, index) => (
            <button
              key={`${img}-${index}`}
              type="button"
              onClick={() => setActive(index)}
              className={cn(
                "overflow-hidden rounded-md border",
                index === active ? "border-primary" : "border-border"
              )}
              aria-label={`Show image ${index + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mediaUrl(img)}
                alt=""
                className="h-16 w-20 object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
