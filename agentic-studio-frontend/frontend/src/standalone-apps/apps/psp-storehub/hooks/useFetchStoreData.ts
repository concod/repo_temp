import { useEffect, useState, useMemo } from "react";
import { pspStoreHubService } from "../services/PspStoreHubService";
import type { StoreSentimentResponse } from "../types/dashboard.types";
import { queryCache } from "../utils/queryCache";

const CACHE_PREFIX = "storeData";

export const useFetchStoreData = (
  districtId: string,
  storeId: string,
  startDate: Date,
  endDate: Date
) => {
  const cacheKey = useMemo(
    () =>
      queryCache.generateKey([
        CACHE_PREFIX,
        districtId,
        storeId,
        startDate,
        endDate,
      ]),
    [districtId, storeId, startDate, endDate]
  );

  const cachedData = queryCache.get<StoreSentimentResponse>(cacheKey);

  const [data, setData] = useState<StoreSentimentResponse | null>(cachedData);
  const [loading, setLoading] = useState<boolean>(!cachedData);
  const [error, setError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState<boolean>(false);

  useEffect(() => {
    let isCancelled = false;

    const fetchStoreData = async () => {
      const existingCache = queryCache.get<StoreSentimentResponse>(cacheKey);

      if (existingCache) {
        setData(existingCache);
        setLoading(false);
      } else {
        setLoading(true);
      }

      setIsFetching(true);
      setError(null);

      try {
        const response = await pspStoreHubService.getStoreDashboardData(
          districtId,
          storeId,
          startDate,
          endDate
        );
        if (!isCancelled) {
          queryCache.set(cacheKey, response);
          setData(response);
        }
      } catch (err) {
        if (!isCancelled) {
          const errorMessage =
            err instanceof Error ? err.message : "Failed to fetch store data";
          setError(errorMessage);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
          setIsFetching(false);
        }
      }
    };

    fetchStoreData();

    return () => {
      isCancelled = true;
    };
  }, [cacheKey, districtId, storeId, startDate, endDate]);

  return { data, loading, error, isFetching };
};
