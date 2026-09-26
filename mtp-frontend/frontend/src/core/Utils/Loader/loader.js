import React from "react";
import Loader from "react-loading-overlay";
import "./loader.css";

const getTopPosition = (popUp, showingLoadingOnTop) => {
  if (popUp) {
    return "69%";
  } else if (showingLoadingOnTop) {
    return "50%";
  } else {
    return "50%";
  }
};

const LoadingOverlay = ({
  loader,
  popUp,
  children,
  minHeight,
  gridLoader,
  text = "Loading...",
  showingLoadingOnTop,
  wrapperPosition = "relative",
  centerLoaderStyles = {},
  isCustomLoader,
  customLoaderopacity = 0.5,
  spinner = true,
}) => {
  return (
    <Loader
      active={loader}
      spinner={spinner}
      text={text}
      styles={{
        wrapper: (base) => ({
          ...base,
          minHeight: minHeight || "100%",
          position: wrapperPosition,
          overflow: loader ? "hidden" : "unset", // -> Loader
        }),
        overlay: (base) => ({
          ...base,
          background:
            loader && isCustomLoader
              ? `rgba(255, 255, 255, ${customLoaderopacity})`
              : "rgba(255, 255, 255, 1)",
        }),
        content: (base) => ({
          ...base,
          color: "rgb(0, 0, 0)",
          ...centerLoaderStyles,
        }),
        spinner: (base) => ({
          ...base,
          "& svg circle": {
            stroke: "#44677b",
          },
        }),
      }}
    >
      {children}
    </Loader>
  );
};

export default LoadingOverlay;
