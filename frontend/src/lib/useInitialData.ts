'use client';

import { useEffect, useState } from 'react';
import type { InitialDataResponse } from './optimizerApi';
import { fetchInitialData } from './optimizerApi';

export interface UseInitialDataOptions {
  scenario?: string;
  T?: number;
  limit_plants?: number;
  limit_routes?: number;
  seed?: number;
}

export function useInitialData(options: UseInitialDataOptions = {}) {
  const [data, setData] = useState<InitialDataResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isCancelled = false;

    setIsLoading(true);
    setError(null);

    fetchInitialData(options)
      .then((resp) => {
        if (!isCancelled) setData(resp);
      })
      .catch((err) => {
        if (!isCancelled) setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
    // Only re-fetch when options change
  }, [
    options.T,
    options.scenario,
    options.limit_plants,
    options.limit_routes,
    options.seed,
  ]);

  return { data, isLoading, error };
}
