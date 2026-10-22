"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";

/**
 * Privacy-friendly map: Google Maps is only contacted after the visitor
 * clicks, so no third-party request happens on page load.
 */
export function ConsentMap({ query, labels }: { query: string; labels: { load: string; note: string } }) {
  const [loaded, setLoaded] = useState(false);
  if (loaded) {
    return (
      <iframe
        title="Map"
        src={`https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`}
        className="size-full min-h-80 rounded-3xl border-0"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        sandbox="allow-scripts allow-same-origin allow-popups"
      />
    );
  }
  return (
    <div className="bg-grid relative grid size-full min-h-80 place-items-center rounded-3xl bg-mist text-center">
      <div className="max-w-xs p-6">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-forest text-lime shadow-lg">
          <MapPin className="size-6" />
        </span>
        <button type="button" onClick={() => setLoaded(true)} className="mt-5 inline-flex h-11 items-center rounded-full bg-forest px-5 text-sm font-semibold text-white hover:bg-pine">
          {labels.load}
        </button>
        <p className="mt-3 text-xs text-stone">{labels.note}</p>
      </div>
    </div>
  );
}
