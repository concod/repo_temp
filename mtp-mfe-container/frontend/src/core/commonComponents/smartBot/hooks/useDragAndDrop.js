import { useRef } from "react";

export const useDragAndDrop = (minimizedBtnRef, setPosition) => {
  const grabPositionRef = useRef(null);
  const isDraggingRef = useRef(null);

  const handleMouseDown = (e) => {
    grabPositionRef.current = {
      x: e.clientX - minimizedBtnRef.current.offsetLeft,
      y: e.clientY - minimizedBtnRef.current.offsetTop,
    };
    setPosition({
      x: minimizedBtnRef.current.offsetLeft,
      y: minimizedBtnRef.current.offsetTop,
    });
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = (e) => {
    if (grabPositionRef.current) {
      isDraggingRef.current = true;
      setPosition({
        x: e.clientX - grabPositionRef.current.x,
        y: e.clientY - grabPositionRef.current.y,
      });
    }
  };

  const handleMouseUp = () => {
    grabPositionRef.current = null;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    isDraggingRef,
  };
};
