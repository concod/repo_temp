import { useEffect, useState, useMemo } from "react";
import { pspStoreHubService } from "../services/PspStoreHubService";
import type { DashboardData } from "../types/dashboard.types";
import { queryCache } from "../utils/queryCache";

const CACHE_PREFIX = "dashboard";

export const useFetchDashboard = (
  districtId: string,
  startDate: Date,
  endDate: Date
) => {
  const cacheKey = useMemo(
    () =>
      queryCache.generateKey([CACHE_PREFIX, districtId, startDate, endDate]),
    [districtId, startDate, endDate]
  );

  const cachedData = queryCache.get<DashboardData>(cacheKey);

  const [data, setData] = useState<DashboardData | null>(cachedData);
  const [loading, setLoading] = useState<boolean>(!cachedData);
  const [error, setError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState<boolean>(false);

  useEffect(() => {
    let isCancelled = false;

    const fetchDashboard = async () => {
      const existingCache = queryCache.get<DashboardData>(cacheKey);

      if (existingCache) {
        setData(existingCache);
        setLoading(false);
      } else {
        setLoading(true);
      }

      setIsFetching(true);
      setError(null);

      try {
        const response = await pspStoreHubService.getDashboardData(
          districtId,
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
            err instanceof Error
              ? err.message
              : "Failed to fetch dashboard data";
          setError(errorMessage);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
          setIsFetching(false);
        }
      }
    };

    fetchDashboard();

    return () => {
      isCancelled = true;
    };
  }, [cacheKey, districtId, startDate, endDate]);

  return { data, loading, error, isFetching };
};
