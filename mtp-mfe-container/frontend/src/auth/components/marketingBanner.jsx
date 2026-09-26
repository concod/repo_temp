import { useState, useEffect, useRef } from "react";
import Typography from "@mui/material/Typography";
import marketingInfo from "./marketingInfo";
import BackgroundMonitor from "assets/monitor.webp";

const MarketingBanner = () => {
  const [intervalId, setIntervalId] = useState(0);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const slideLength = marketingInfo.length;
  const monitorImageRef = useRef(null);
  const sliderContainerRef = useRef(null);

  /**
   * Initial setup
   */
  useEffect(() => {
    if (slideLength) {
      setCurrentSlideIndex(0);
    }
  }, []);

  /**
   * @func
   * @desc Call on every slideIndex value change
   */
  useEffect(() => {
    clearInterval(intervalId);
    const id = setInterval(setNextSlide, 3000);
    setIntervalId(id);
  }, [currentSlideIndex, sliderContainerRef.current]);

  /**
   * @func
   * @desc Set the next slideIndex value
   */
  const setNextSlide = () => {
    const firstElement = sliderContainerRef?.current?.children?.[0];
    const marginSize = firstElement?.getBoundingClientRect().width;
    let nextSlideIndex = currentSlideIndex + 1;
    if (firstElement) {
      if (slideLength - 1 >= nextSlideIndex) {
        firstElement.style.marginLeft = `-${nextSlideIndex * marginSize}px`;
        setCurrentSlideIndex(nextSlideIndex);
      } else {
        firstElement.style.marginLeft = 0;
        setCurrentSlideIndex(0);
      }
    }
  };
  // function to handle onclick slider focus change
  const onClickSlide = (index) => {
    const firstElement = sliderContainerRef?.current?.children?.[0];
    const marginSize = firstElement?.getBoundingClientRect().width;
    if (firstElement) {
      firstElement.style.marginLeft = `-${index * marginSize}px`;
    }
  };

  return (
    <div className="marketing-container h-md-100">
      <Typography component="h2" variant="h2" className="marketing__header">
        Powering the AI in Retail
      </Typography>
      <div className="marketing__image-wrapper">
        <img
          className="marketing__image-background"
          src={BackgroundMonitor}
          alt="decorative-image"
          ref={monitorImageRef}
        />
        <div
          className="marketing__sliderContainer"
          style={{
            top: (monitorImageRef?.current?.offsetTop ?? 0) + 12,
            maxWidth:
              (monitorImageRef?.current?.getBoundingClientRect()?.width ?? 32) - 32,
          }}
          ref={sliderContainerRef}
        >
          {marketingInfo?.map((element, index) => (
            <img
              className={`marketing__sliderContainer-slidingImage`}
              src={element?.img}
              alt="decorative-image"
              key={"sliging-img-" + index}
              fetchpriority="high"
            />
          ))}
        </div>
      </div>
      <div className="marketing__indicators">
        {marketingInfo.map((_item, index) => (
          <span
            className={`indicator-dot ${currentSlideIndex === index ? "active" : ""}`}
            key={"indicator-dot-" + index}
            onClick={() => {
              setCurrentSlideIndex(index);
              onClickSlide(index)
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default MarketingBanner;
