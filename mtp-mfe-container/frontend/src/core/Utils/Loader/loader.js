import Loader from "react-loading-overlay";
import { Loader as ImpactLoader } from "impact-ui-v3";
import "./loader.css";

// const getTopPosition = (popUp, showingLoadingOnTop) => {
//   if (popUp) {
//     return "69%";
//   } else if (showingLoadingOnTop) {
//     return "50%";
//   } else {
//     return "50%";
//   }
// };

const defaultCenterLoaderStyles = {
  position: "fixed",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
};

const LoadingOverlay = ({
  loader,
  popUp,
  children,
  minHeight,
  gridLoader,
  text,
  showingLoadingOnTop,
  wrapperPosition = "relative",
  centerLoaderStyles = {},
  isCustomLoader,
  applyDefaultCenterStyle,
  size,
  showSkeleton,
  customZIndex
}) => {
  return (
    <Loader
      active={loader}
      spinner={<ImpactLoader text={text || "Loading..."} size={size || 'large'} showSkeleton={showSkeleton} />}
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
              ? "rgba(255, 255, 255, 0.5)"
              : "rgba(255, 255, 255, 1)",
          zIndex: customZIndex || 700,
        }),
        content: (base) => ({
          ...base,
          color: "rgb(0, 0, 0)",
          ...(applyDefaultCenterStyle
            ? defaultCenterLoaderStyles
            : centerLoaderStyles),
        }),
      }}
    >
      {children}
    </Loader>
  );
};

export default LoadingOverlay;
