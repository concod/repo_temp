import { useEffect, useState } from "react";
import { navigatorService } from "../services/NavigatorService";

export interface ProductRecommendation {
  explanation: string;
  productIds: string[];
  suggestedProductIds?: string[];
}

export const useFetchSearchResults = (query: string) => {
  const [data, setData] = useState<ProductRecommendation | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(false);
    setData(null);
    if (!query.trim()) return;
    const fetchData = async () => {
      try {
        setLoading(true);
        setData(null);
        const response = await navigatorService.getSearchRecommendations(query);
        if (isMounted) setData(response);
      } catch {
        if (isMounted) setError(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [query]);

  return {
    data,
    loading,
    error,
  };
};
