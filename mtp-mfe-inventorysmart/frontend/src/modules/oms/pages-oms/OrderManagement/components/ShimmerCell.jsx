import React from "react";

const shimmerStyle = {
  display: "inline-block",
  width: "80%",
  height: 14,
  borderRadius: 4,
  background:
    "linear-gradient(90deg, #e0e0e0 25%, #f5f5f5 50%, #e0e0e0 75%)",
  backgroundSize: "200% 100%",
  animation: "oms-shimmer-wave 1.6s linear infinite",
};

const keyframes = `
@keyframes oms-shimmer-wave {
  0%   { background-position: 200% center; }
  100% { background-position: -200% center; }
}
`;

let _injected = false;
function injectKeyframes() {
  if (_injected || typeof document === "undefined") return;
  const style = document.createElement("style");
  style.textContent = keyframes;
  document.head.appendChild(style);
  _injected = true;
}

const ShimmerCell = () => {
  injectKeyframes();
  return <span style={shimmerStyle} />;
};

export default ShimmerCell;
