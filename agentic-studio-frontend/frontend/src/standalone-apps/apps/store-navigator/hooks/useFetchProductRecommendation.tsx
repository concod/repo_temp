import { useEffect, useState } from "react";
import type { ProductRecommendation } from "./useFetchSearchResults";
import { navigatorService } from "../services/NavigatorService";

export const useFetchProductRecommendation = (productId: string) => {
  const [data, setData] = useState<ProductRecommendation | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await navigatorService.getProductRecommendations(
          productId
        );
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
  }, [productId]);

  return {
    data,
    loading,
    error,
  };
};
