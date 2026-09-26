import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useDispatch, connect } from "react-redux";
import PropTypes from "prop-types";
import { useLocation, useNavigate } from "react-router-dom-v5-compat";
import { logoutUser } from "../../actions/authActions";
import { setPlanSmartLogoutStatus } from "core/actions/sideBarActions";
import { Sidebar } from "impact-ui-v3";
import { isNull, isEqual } from "lodash";
import { ITEM_SMART_QUICK_NAVIGATOR } from "./constants";
import { handleRedirection, stripQuery } from "./utils";

const SideBar = ({ options, pathPrefix, logoutUser, setUserPlatformScreen, displayPlanSmartAlert, showItemSmartIcon }) => {
  const [isActive, setisActive] = useState(false);
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeParent, setActiveParent] = useState("");
  const [activeChild, setActiveChild] = useState("");

  // Derive routes from options without state — no effect cascade
  const sidebarOptions = useMemo(() => {
    return options?.filter(data => !data?.isPositionBottom) || [];
  }, [options]);

  const actionRoutes = useMemo(() => {
    return options?.filter(data => data?.isPositionBottom) || [];
  }, [options]);

  useEffect(() => {
    setUserPlatformScreen?.(`${location.pathname.split("/")[2]}`);
  }, [location.pathname, activeParent, activeChild]);

  /**
   * handler for Logout Event
   */
  const handleLogout = useCallback(() => {
    if (displayPlanSmartAlert) {
      dispatch(setPlanSmartLogoutStatus({ status: true, cb: logoutUser }));
    } else {
      logoutUser();
    }
  }, [logoutUser, displayPlanSmartAlert]);

  const handleParentRouteChange = useCallback((parent) => {
    if (parent?.reloadOnSameRouteClick) {
      return window.open(parent.link, "_self");
    }
    if (parent.value !== "support") setActiveParent(parent.value);
    if (parent?.openInNewPage) {
      window.open(parent.link, "_blank", "noopener,noreferrer");
    } else navigate(parent.link);
  }, []);

  const handleChildRouteChange = useCallback((parent, child) => {
    setActiveChild(child.value);
    if (child?.openInNewPage) {
      window.open(child.link, "_blank", "noopener,noreferrer");
    } else navigate(child.link);
  }, []);

  // Listen for URL changes and check both `options` and `actionRoutes`
  useEffect(() => {
    const currentPath = location.pathname;
    let foundParent = "";
    let foundChild = null;

    const allRoutes = [...sidebarOptions, ...actionRoutes];
    for (const parent of allRoutes) {
      const url = stripQuery(parent.link);
      if (url === currentPath) {
        foundParent = parent.value;
        foundChild = null;
        break;
      }
      if (parent.children?.length) {
        let matched = false;
        for (const child of parent.children) {
          const childUrl = stripQuery(child.link);
          if (childUrl === currentPath || currentPath.includes(childUrl)) {
            foundParent = parent.value;
            foundChild = child.value;
            matched = true;
            break;
          }
        }
        if (matched) break;
      }
    }

    setActiveParent((prev) => (prev !== foundParent ? foundParent : prev));
    setActiveChild((prev) => (prev !== foundChild ? foundChild : prev));
  }, [location.pathname, sidebarOptions, actionRoutes]);

  // Block to handle redirection via email link click
  useEffect(() => {
    const redirectUrl = sessionStorage.getItem("redirectUrl");
    if (window?.location?.href?.includes("redirect")) {
      if (isNull(redirectUrl)) {
        sessionStorage.setItem("redirectUrl", window?.location?.href);
      } else {
        handleRedirection(navigate)
      }
    } else if (!isNull(redirectUrl)) {
      handleRedirection(navigate)
    }
  }, []); // Empty dependency since this only needs to run once on load

  const handleClose = useCallback(() => setisActive((prev) => !prev), []);

  const sidebarRoutes = useMemo(() => {
    return showItemSmartIcon
      ? [...sidebarOptions, ITEM_SMART_QUICK_NAVIGATOR]
      : sidebarOptions;
  }, [sidebarOptions, showItemSmartIcon]);

  return (
    <>
      <Sidebar
        isOpen={isActive}
        setIsOpen={setisActive}
        handleClose={handleClose}
        routes={sidebarRoutes}
        actionRoutes={actionRoutes}
        parentActive={activeParent}
        childActive={activeChild}
        handleParentRouteChange={handleParentRouteChange}
        handleChildRouteChange={handleChildRouteChange}
        handleLogOut={handleLogout}
      />
    </>
  );
};

SideBar.defaultProps = {
  options: [],
  pathPrefix: "",
};

SideBar.propTypes = {
  options: PropTypes.array,
  pathPrefix: PropTypes.string,
  logoutUser: PropTypes.func,
};

const mapStateToProps = (state) => {
  return {
    keyboardShortcuts: state.tenantConfigReducer?.keyboardShortcuts,
  };
};

const MemoizedSideBar = React.memo(SideBar, (prevProps, nextProps) => {
  return isEqual(prevProps.options, nextProps.options)
    && prevProps.pathPrefix === nextProps.pathPrefix
    && prevProps.logoutUser === nextProps.logoutUser
    && prevProps.setUserPlatformScreen === nextProps.setUserPlatformScreen
    && prevProps.displayPlanSmartAlert === nextProps.displayPlanSmartAlert
    && prevProps.showItemSmartIcon === nextProps.showItemSmartIcon;
});

export default connect(mapStateToProps, { logoutUser })(MemoizedSideBar);
