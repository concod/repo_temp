/**
 * GeneratedOrdersCarousel
 *
 * Horizontally scrollable row of GeneratedOrderCard components shown in step 2.
 * Includes prev/next navigation buttons matching Figma frame 3141:81100.
 *
 * Props:
 *   orders    — array of generated order summary objects
 *   onEdit    — (cardIndex) => void
 *   onDelete  — (cardIndex) => void
 */
import React, { useRef, useState, useCallback } from "react";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { useExpediteOrdersCardsStyles } from "./styles.js";
import GeneratedOrderCard from "./GeneratedOrderCard";

const SCROLL_STEP = 450;

const GeneratedOrdersCarousel = ({ orders, onEdit, onDelete }) => {
  const classes = useExpediteOrdersCardsStyles();
  const trackRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateScrollState = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  const scrollBy = (delta) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: delta, behavior: "smooth" });
    setTimeout(updateScrollState, 320);
  };

  if (!orders || orders.length === 0) return null;

  return (
    <div className={classes.carouselRoot}>
      <button
        className={classes.carouselNavBtn}
        onClick={() => scrollBy(-SCROLL_STEP)}
        disabled={!canScrollLeft}
        aria-label="Scroll left"
        type="button"
      >
        <ChevronLeftIcon fontSize="small" />
      </button>

      <div
        ref={trackRef}
        className={classes.carouselTrack}
        onScroll={updateScrollState}
      >
        {orders.map((order, index) => (
          <GeneratedOrderCard
            key={order.revisionId || index}
            order={order}
            onEdit={() => onEdit(index)}
            onDelete={() => onDelete(index)}
          />
        ))}
      </div>

      <button
        className={classes.carouselNavBtn}
        onClick={() => scrollBy(SCROLL_STEP)}
        disabled={orders.length <= 1 && !canScrollRight}
        aria-label="Scroll right"
        type="button"
      >
        <ChevronRightIcon fontSize="small" />
      </button>
    </div>
  );
};

export default GeneratedOrdersCarousel;
