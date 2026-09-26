import React, { useState, useEffect } from "react";
import { Typography } from "@mui/material";
import marketingInfo from "./marketingInfo";
import CircleIcon from "@mui/icons-material/Circle";

const MarketingBanner = () => {
  const [intervalId, setIntervalId] = useState(0);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const slideLength = marketingInfo.length;

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
  }, [currentSlideIndex]);

  /**
   * @func
   * @desc Set the next slideIndex value
   */
  const setNextSlide = () => {
    let nextSlideIndex = currentSlideIndex + 1;
    if (slideLength - 1 >= nextSlideIndex) {
      setCurrentSlideIndex(nextSlideIndex);
    } else {
      setCurrentSlideIndex(0);
    }
  };

  return (
    <div
      className="marketing-container h-md-100"
    >
      <Typography component="h2" variant="h2" className="marketing__header">
        Powering the AI in RetAlL
      </Typography>
      <div className="marketing__image-wrapper">
        {currentSlideIndex != null ? (
          <img
            className="marketing__image"
            src={marketingInfo[currentSlideIndex].img}
            alt="decorative-image"
          />
        ) : null}
      </div>
      <div className="marketing__description-wrapper" textAlign="center">
        {currentSlideIndex != null ? (
          <>
            <Typography className="marketing__title" component="p" variant="h4">
              {marketingInfo[currentSlideIndex].title}
            </Typography>
            <Typography
              className="marketing__description"
              component="p"
              variant="body"
            >
              {marketingInfo[currentSlideIndex].description}
            </Typography>
          </>
        ) : null}
      </div>
      <div className="marketing__indicators">
        {marketingInfo.map((_item, index) => (
          <CircleIcon
            onClick={() => setCurrentSlideIndex(index)}
            className={`icons ${currentSlideIndex == index ? "active" : ""}`}
          />
        ))}
      </div>
    </div>
  );
};

export default MarketingBanner;
