import { useEffect, useRef, useState } from 'react';

import {
  fetchAddressSuggestions,
  type AddressSuggestion,
  type FetchAddressSuggestionsOptions,
} from '@/lib/api';

const DEBOUNCE_MS = 250;
const MIN_QUERY_LENGTH = 2;

export function useAddressSuggestions(
  query: string,
  enabled: boolean,
  options: FetchAddressSuggestionsOptions = {},
) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const requestIdRef = useRef(0);
  const { sessionToken, origin, limit } = options;

  useEffect(() => {
    if (!enabled) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    setLoading(true);

    const timer = setTimeout(() => {
      void fetchAddressSuggestions(trimmed, { sessionToken, origin, limit })
        .then((items) => {
          if (requestIdRef.current !== requestId) return;
          setSuggestions(items);
        })
        .catch(() => {
          if (requestIdRef.current !== requestId) return;
          setSuggestions([]);
        })
        .finally(() => {
          if (requestIdRef.current !== requestId) return;
          setLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [enabled, limit, origin, query, sessionToken]);

  return { suggestions, loading };
}
