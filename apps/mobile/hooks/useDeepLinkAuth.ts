import { useEffect, useRef, useState } from "react";
import { useURL } from "expo-linking";
import { supabase } from "@/constants/supabase";

export type DeepLinkAuthStatus = "idle" | "processing" | "success" | "error";

export type DeepLinkAuthResult = {
  status: DeepLinkAuthStatus;
  /** Supabase link type when present in the URL, e.g. "recovery" | "signup" | "magiclink". */
  linkType: string | null;
  /** Error message when status === "error". */
  error: string | null;
};

/**
 * Parses auth params from both the query string and the hash fragment of a URL.
 * Supabase links carry either `?code=...` (PKCE flow) or
 * `#access_token=...&refresh_token=...&type=recovery` (implicit flow).
 */
function parseAuthParams(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  const collect = (raw: string | undefined) => {
    if (!raw) return;
    for (const pair of raw.split("&")) {
      const eq = pair.indexOf("=");
      if (eq <= 0) continue;
      try {
        params[decodeURIComponent(pair.slice(0, eq))] = decodeURIComponent(
          pair.slice(eq + 1).replace(/\+/g, " ")
        );
      } catch {
        // Ignore malformed URI components.
      }
    }
  };

  const hashIndex = url.indexOf("#");
  const hash = hashIndex >= 0 ? url.slice(hashIndex + 1) : undefined;
  const beforeHash = hashIndex >= 0 ? url.slice(0, hashIndex) : url;
  const queryIndex = beforeHash.indexOf("?");
  const query = queryIndex >= 0 ? beforeHash.slice(queryIndex + 1) : undefined;

  collect(query);
  collect(hash);
  return params;
}

/**
 * Self-contained deep-link auth handler for screens opened from Supabase email
 * links (password recovery, etc.) via the `volleysmart://` scheme or Expo web URL.
 *
 * Establishes a session from the incoming URL:
 * - `?code=` → supabase.auth.exchangeCodeForSession(code)
 * - `#access_token=&refresh_token=` → supabase.auth.setSession(...)
 *
 * Known limitations (documented for the AuthProvider owner):
 * - AuthProvider redirects any authenticated user out of the (auth) group to
 *   (tabs); once the recovery session is established it may navigate the user
 *   away from reset-password. AuthProvider should gain a PASSWORD_RECOVERY
 *   guard (via supabase.auth.onAuthStateChange) in a later work package.
 * - useURL() only reports the URL that opened/foregrounded the app; links
 *   tapped while the app is already on the screen with unchanged URL are
 *   deduplicated by design.
 */
export function useDeepLinkAuth(): DeepLinkAuthResult {
  const url = useURL();
  const processedUrls = useRef<Set<string>>(new Set());
  const [result, setResult] = useState<DeepLinkAuthResult>({
    status: "idle",
    linkType: null,
    error: null,
  });

  useEffect(() => {
    if (!url || processedUrls.current.has(url)) return;
    processedUrls.current.add(url);

    const params = parseAuthParams(url);
    const linkType = params.type ?? null;
    const errorDescription = params.error_description ?? params.error;
    const code = params.code;
    const accessToken = params.access_token;
    const refreshToken = params.refresh_token;

    if (errorDescription) {
      setResult({ status: "error", linkType, error: errorDescription });
      return;
    }

    if (!code && !(accessToken && refreshToken)) {
      // Not an auth link; leave status untouched.
      return;
    }

    let cancelled = false;
    setResult({ status: "processing", linkType, error: null });

    (async () => {
      const { error } = code
        ? await supabase.auth.exchangeCodeForSession(code)
        : await supabase.auth.setSession({
            access_token: accessToken as string,
            refresh_token: refreshToken as string,
          });
      if (cancelled) return;
      setResult({
        status: error ? "error" : "success",
        linkType,
        error: error?.message ?? null,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [url]);

  return result;
}
