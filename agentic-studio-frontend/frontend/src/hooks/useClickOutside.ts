import { useEffect } from "react";

const useClickOutside = <T extends HTMLElement | null>(
  ref: React.RefObject<T>,
  handler: () => void
) => {
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        handler();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [ref, handler]);
};

export default useClickOutside;
