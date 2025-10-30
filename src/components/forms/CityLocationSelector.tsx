import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

export interface LocationValue {
  city: string;
  country: string;
  countryCode: string; // ISO alpha-2 (uppercase)
}

interface CityLocationSelectorProps {
  id?: string;
  label?: string;
  /** Optional node rendered to the right of the label (e.g., a help icon). */
  labelExtra?: ReactNode;
  placeholder?: string;
  value: LocationValue | null;
  onChange: (val: LocationValue | null) => void;
}

interface MapboxContext {
  id: string; // e.g. "country.12345"
  text: string; // e.g. "Germany"
  short_code?: string; // e.g. "de"
}
interface MapboxFeature {
  id: string;
  text?: string; // place name without region
  place_type?: string[];
  context?: MapboxContext[];
}
interface MapboxPlacesResponse {
  features?: MapboxFeature[];
}

/**
 * City autocomplete using Mapbox Places API if VITE_MAPBOX_TOKEN is present.
 * Degrades to plain text entry when missing (then NewClub shows manual fallback inputs).
 */
export default function CityLocationSelector({
  id = "club-location",
  label = "City",
  labelExtra,
  placeholder = "Start typing a city...",
  value,
  onChange,
}: CityLocationSelectorProps) {
  const [query, setQuery] = useState<string>(value?.city ?? "");
  const [options, setOptions] = useState<LocationValue[]>([]);
  const [open, setOpen] = useState(false);
  const token = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

  useEffect(() => {
    if (!query || query.length < 2 || !token) {
      setOptions([]);
      return;
    }

    let active = true;

    const fetchPlaces = async () => {
      const url = new URL(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          query
        )}.json`
      );
      url.searchParams.set("types", "place,locality");
      url.searchParams.set("language", "en");
      url.searchParams.set("limit", "5");
      url.searchParams.set("access_token", token);

      const res = await fetch(url.toString());
      if (!res.ok) return;
      const data = await res.json();

      const mapped: LocationValue[] = (
        (data as MapboxPlacesResponse).features ?? []
      )
        .map((f: MapboxFeature) => {
          const place = f.text ?? "";
          const countryCtx = (f.context ?? []).find((c: MapboxContext) =>
            c.id.startsWith("country")
          );
          const countryName: string = countryCtx?.text ?? "";
          const countryCode: string = (
            countryCtx?.short_code ?? ""
          ).toUpperCase();
          return { city: place, country: countryName, countryCode };
        })
        .filter((v: LocationValue) => v.city && v.country && v.countryCode);

      if (active) setOptions(mapped);
    };

    const t = setTimeout(fetchPlaces, 200);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [query, token]);

  return (
    <div className="space-y-2 relative">
      <div className="flex items-center justify-start">
        <Label htmlFor={id} className="m-0">
          {label}
        </Label>
        {labelExtra ? <div className="ml-2">{labelExtra}</div> : null}
      </div>

      <Input
        id={id}
        placeholder={placeholder}
        value={value?.city ?? query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          if (!e.target.value) onChange(null);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        autoComplete="off"
      />
      {open && options.length > 0 && (
        <Card className="absolute z-20 mt-1 w-full max-h-60 overflow-auto">
          <ul className="divide-y">
            {options.map((opt, idx) => (
              <li
                key={`${opt.city}-${opt.countryCode}-${idx}`}
                className="px-3 py-2 hover:bg-muted cursor-pointer"
                onMouseDown={() => {
                  onChange(opt);
                  setQuery(opt.city);
                  setOpen(false);
                }}
              >
                {opt.city}, {opt.country} ({opt.countryCode})
              </li>
            ))}
          </ul>
        </Card>
      )}
      {!token && (
        <p className="text-xs text-muted-foreground">
          Autocomplete disabled (missing VITE_MAPBOX_TOKEN). You can still type
          manually below.
        </p>
      )}
    </div>
  );
}
