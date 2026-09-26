import { useEffect, useState } from "react";

export const useDebounce = (query: string, delay?: number): string => {
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, delay || 500);

    return () => clearTimeout(timer);
  }, [delay, query]);

  return debouncedQuery;
};
