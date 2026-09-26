import { useState, useRef } from "react";

const list = Array.from({ length: 1000 }, (_, index) => index);

export default function Virtualization({ items = 50, containerHeight = 500 }) {
  //   const [visibleItems, setVisibleItems] = useState(list.slice(0, items));
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef(null);

  const itemHeight = 50;
  const totalHeight = list.length * itemHeight;

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    setScrollTop(scrollTop);
  };

  // Compute visible window
  const itemsToShow = Math.ceil(containerHeight / itemHeight);
  const start = Math.floor(scrollTop / itemHeight);
  const end = start + itemsToShow + 2;

  const visibleItems = list.slice(start, end);

  const offsetY = start * itemHeight;

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      style={{
        height: `${containerHeight}px`,
        overflowY: "scroll",
        width: "200px",
        border: "1px solid #ccc",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ height: `${totalHeight}px`, position: "relative" }}>
        <div
          style={{
            position: "absolute",
            top: offsetY,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map((item, index) => (
            <div
              key={index}
              style={{
                height: `${itemHeight}px`,
                borderBottom: "1px solid #eee",
                display: "flex",
                alignItems: "center",
                paddingLeft: "8px",
                background: "#f9f9f9",
              }}
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
