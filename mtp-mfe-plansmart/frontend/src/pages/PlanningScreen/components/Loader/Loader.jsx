import PropTypes from "prop-types";
import colours from "../../../../core/Styles/colours";
import "./Loader.scss";

function Loader({ children, message = "Loading...", style = {}, loader }) {
  return (
    <div className="loader-container" 
    style={{ pointerEvents: loader ? "none" : "auto" }}
    >
      {/* Content behind the loader */}
      {children}

      {/* Loader overlay */}
      {loader && (
        <div
          className="loader-overlay"
          style={{
            ...style,
            display: loader ? "flex" : "none"
          }}
        >
          <div
            className="loading-spinner"
            style={{
              border: `5px solid ${colours.lightGray}`,
              borderTop: `5px solid ${colours.jordyBlue}`
            }}
          />
          <span>{message}</span>
        </div>
      )}
    </div>
  );
}

Loader.propTypes = {
  children: PropTypes.node,
  message: PropTypes.string,
  style: PropTypes.object,
  loader: PropTypes.bool
};
export default Loader;
