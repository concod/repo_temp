import { useCallback, useEffect, useRef } from "react";

interface InfiniteScrollProps {
  list: React.ReactNode[];
  isLoading: boolean;
  onPageEnd: () => void; //Note: Make sure onPageEnd's reference is stable, as it is used as dependency in useEffect
  loader?: React.ReactNode;
  direction?: "down" | "up";
  className?: string;
}

export const InfiniteScroll = ({
  list,
  isLoading,
  onPageEnd,
  loader,
  direction = "down",
  className,
}: InfiniteScrollProps) => {
  const observerRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const previousScrollHeight = useRef<number>(0);

  const isScrollPresent = useCallback(() => {
    if (!containerRef.current) return false;
    const clientHeight = containerRef.current.clientHeight;
    const scrollHeight = containerRef.current.scrollHeight;
    return scrollHeight > clientHeight;
  }, []);

  useEffect(() => {
    if (direction !== "up") return;
    if (!containerRef.current) return;

    const container = containerRef.current;
    const diff = container.scrollHeight - previousScrollHeight.current;

    if (diff > 0) {
      container.scrollTop += diff;
    }
  }, [list.length, direction]);

  useEffect(() => {
    if (!observerRef.current) return;

    let observer: IntersectionObserver | null = null;
    const observerElement = observerRef.current;

    if (list.length > 0 && isScrollPresent()) {
      observer = new IntersectionObserver((entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          if (direction === "up" && containerRef.current) {
            previousScrollHeight.current = containerRef.current.scrollHeight;
          }
          onPageEnd();
        }
      });
      observer.observe(observerElement);
    }

    if (list.length > 0 && !isScrollPresent()) {
      onPageEnd();
    }

    return () => {
      if (observer && observerElement) {
        observer.unobserve(observerElement);
        observer.disconnect();
      }
    };
  }, [direction, isScrollPresent, list.length, onPageEnd]);

  return (
    <div
      ref={containerRef}
      className={className ? `inf_container ${className}` : "inf_container"}
    >
      {list.length > 0 && direction === "up" && (
        <div ref={observerRef} className="inf_observer">
          {isLoading && loader && <>{loader}</>}
        </div>
      )}
      {list}
      {list.length > 0 && direction === "down" && (
        <div ref={observerRef} className="inf_observer">
          {isLoading && loader && <>{loader}</>}
        </div>
      )}
    </div>
  );
};
