import React from "react";
import PropTypes from "prop-types";
import { ViewWrapper, ViewHeader, ViewBody } from "./common";

/**
 *
 * Generic container can be used for explore or other views
 *
 */
function Container({ headerOptions, id, children, className, style }) {
  return (
    <ViewWrapper className={className} style={style}>
      <ViewHeader
        className={headerOptions.className}
        style={headerOptions.style}
      >
        <div id={id + "Title"}>{headerOptions.headerTitle}</div>
        <div>{headerOptions.headerActions}</div>
      </ViewHeader>
      <ViewBody>{children}</ViewBody>
    </ViewWrapper>
  );
}

Container.propTypes = {
  id: PropTypes.string,
  headerOptions: PropTypes.object,
};

Container.defaultProps = {
  id: "container",
  headerOptions: {
    headerTitle: "",
    headerActions: [],
  },
};

export default Container;
