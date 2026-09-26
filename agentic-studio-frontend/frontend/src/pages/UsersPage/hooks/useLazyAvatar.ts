import AvatarLoadQueue from "../utils/AvatarLoadQueue";
import type { UseLazyAvatarOptions } from "../Users";
import { useState, useEffect, useRef } from 'react';

const avatarQueue = new AvatarLoadQueue();

export const useLazyAvatar = (
    avatarUrl: string | undefined,
    options: UseLazyAvatarOptions
  ) => {
    const { fallbackSrc, rootMargin = '50px', threshold = 0.01 } = options;
    const [imgSrc, setImgSrc] = useState(fallbackSrc);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const imgRef = useRef<HTMLImageElement>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (!imgRef.current || !avatarUrl) return;
    
        const observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                setIsVisible(true);
                observer.disconnect();
              }
            });
          },
          { rootMargin, threshold }
        );
        observer.observe(imgRef.current);

        return () => {
        observer.disconnect();
        };
    }, [avatarUrl, rootMargin, threshold]);
    
    useEffect(() => {
        if (!isVisible || !avatarUrl) return;
    
        let isMounted = true;
        setIsLoading(true);
    
        avatarQueue
          .add(avatarUrl)
          .then((url) => {
            if (isMounted) {
              setImgSrc(url);
              setError(null);
            }
          })
          .catch((err) => {
            if (isMounted) {
              setError(err);
              setImgSrc(fallbackSrc);
            }
          })
          .finally(() => {
            if (isMounted) {
              setIsLoading(false);
            }
          });
    
        return () => {
          isMounted = false;
        };
      }, [isVisible, avatarUrl, fallbackSrc]);
    
    return { imgRef, imgSrc, isLoading, error };
  };
