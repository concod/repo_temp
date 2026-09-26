import LoadingOverlay from "../../Utils/Loader/loader";
import { Redirect, Route } from "react-router-dom";
import { connect } from "react-redux";
//import { ApmRoute } from "@elastic/apm-rum-react";
import { setActiveScreenName } from "../../pages/commonModulesServices/common-assort-service";
import { addSnack } from "core/actions/snackbarActions";
import { setCurrentScreenName } from "core/pages/tenant-config/access-user-management/services/TenantManagement/User-Role-Management/user-role-management-service";
import { useLocation } from "react-router-dom-v5-compat";
import { setIsFilterApplied } from "core/actions/filterAction";
import { useEffect, lazy, Suspense } from "react";
import NotFound from "core/commonComponents/notFound/NotFound";
import { find, isArray } from "lodash";
import {
  APPLICATION_URLS,
  WHITE_LISTED_URLS,
} from "./authenticationConstants.js";
import { extractParentUrl } from "core/Utils/functions/utils";
import { useSelector } from "react-redux";

const ShortcutsDemo = lazy(() => import("./ShortcutsDemo"));
export const ProtectedRoute = ({ component: Component, ...rest }) => {
  let location = useLocation();
  const keyboardShortcutsVisible = useSelector(
    (state) => state?.sideBarReducer?.keyboardShortcutsVisible
  );
  const enableKeyboardShortcutsUI = useSelector(
    (state) => state?.sideBarReducer?.shortcutsUiException?.demo
  );

  useEffect(() => {
    if (!location.pathname.includes("inventory-smart")) {
      rest.setIsFilterApplied(true);
    } else {
      rest.setIsFilterApplied(false);
    }
    // Force layout recalculation
    window.requestAnimationFrame(() => {
      document.body.style.display = "none";
      document.body.offsetHeight; // Force reflow
      document.body.style.display = "";
    });
  }, [location]);

  const isUserAccessible = (path, enabledApplications) => {
    /**
     * if enabledApplications is not defined we're allowing access
     * since we need to allow sidebar to load and set the
     * userAccessData in reducer
     */
    const applicationUrl = extractParentUrl(path);
    if (
      WHITE_LISTED_URLS.includes(applicationUrl) ||
      !rest.isUserDataSet ||
      /**
       * enableAllAccess- for internal use only
       */
      JSON.parse(localStorage.getItem("enableAllAccess"))
    ) {
      return true;
    } else {
      const data = find(APPLICATION_URLS, (app) => {
        if (isArray(app.application_url)) {
          return app.application_url.includes(applicationUrl);
        }
        return app.application_url === applicationUrl;
      });
      if (enabledApplications?.includes(data?.application_name)) {
        return true;
      }
    }
    return false;
  };

  // MFA gate: if login requires MFA and it hasn't been verified, force to /mfa
  const shouldRedirectToMFA = () => {
    // Require authenticated + token-verified user and backend-driven MFA
    if (!rest.isAuthenticated || !rest.isTokenVerified || !rest.mfaRequired) {
      return false;
    }
    // Require app token present
    if (!localStorage.getItem("token")) {
      return false;
    }
    const mfaFlow = sessionStorage.getItem("mfaFlow");
    const mfaVerified = sessionStorage.getItem("mfaVerified") === "true";
    const mfaPending = sessionStorage.getItem("mfaPending") === "true";
    // Freshness (default 5 minutes)
    const createdAtStr = sessionStorage.getItem("mfaCreatedAt");
    const createdAt = createdAtStr ? parseInt(createdAtStr, 10) : 0;
    const maxAgeMs = 5 * 60 * 1000;
    const isFresh = createdAt > 0 && Date.now() - createdAt <= maxAgeMs;

    // Only enforce during login MFA flow; allow password reset flow elsewhere
    if (mfaFlow === "login" && mfaPending && !mfaVerified) {
      if (!isFresh) {
        // Stale challenge → clear flags and do not redirect to MFA
        sessionStorage.removeItem("mfaFlow");
        sessionStorage.removeItem("mfaVerified");
        sessionStorage.removeItem("mfaEmail");
        sessionStorage.removeItem("mfaResendRemaining");
        sessionStorage.removeItem("mfaCreatedAt");
        sessionStorage.removeItem("mfaPending");
        return false;
      }
      // Avoid loops if already on /mfa
      const pathname = rest?.location?.pathname || location.pathname;
      if (pathname !== "/mfa") {
        return true;
      }
    }
    return false;
  };

  return (
    <Route
      {...rest}
      render={(props) => {
        if (rest.isTenantFetchFailed) {
          return (
            <Redirect
              to={{
                pathname: "/",
                state: {
                  from: location,
                },
              }}
            />
          );
        }
        if (rest.isAuthenticated) {
          // Enforce MFA if pending
          if (shouldRedirectToMFA()) {
            return (
              <Redirect
                to={{
                  pathname: "/mfa",
                }}
              />
            );
          }
          const isAccessible = isUserAccessible(
            rest?.location?.pathname,
            rest?.enabledApplications
          );
          if (isAccessible) {
            const allProps = { ...props, ...rest };
            allProps.setActiveScreenName(allProps.screenName);
            allProps.setCurrentScreenName(allProps.screenName);
            if (allProps.screenName) {
              localStorage.setItem("currentScreenName", allProps.screenName);
              sessionStorage.setItem("activeScreenName", allProps.screenName);
            }

            return (
              <>
                <Component {...allProps} />
                {keyboardShortcutsVisible && enableKeyboardShortcutsUI && (
                  <Suspense fallback={null}>
                    <ShortcutsDemo />
                  </Suspense>
                )}
              </>
            );
          } else {
            console.log("sourcesmart debug", rest)
            return !rest.isUserDataSet ? "" : <NotFound />;
          }
        } else {
          const fromLoginFlow = props.location?.state?.from?.pathname === "/login" || sessionStorage.getItem("isLoggingIn") === "true";
          if (rest.isTokenVerified) {
            if (fromLoginFlow) {
              return (
                <LoadingOverlay
                  loader={true}
                  text="Authenticating..."
                  applyDefaultCenterStyle={true}
                ></LoadingOverlay>
              );
            }
            rest.addSnack({
              message: "Please Login to continue...",
              options: {
                variant: "error",
                doNotHide: true,
                autoHideDuration: 1500,
              },
            });
            return (
              <Redirect
                to={{
                  pathname: "/",
                  state: {
                    from: props.location,
                  },
                }}
              />
            );
          } else {
            return (
              <LoadingOverlay
                loader={true}
                spinner
                text={rest.loaderText}
                applyDefaultCenterStyle={true}
              ></LoadingOverlay>
            );
          }
        }
      }}
    />
  );
};

const mapStateToProps = (state) => {
  return {
    isAuthenticated: state.authReducer.isAuthenticated,
    isTokenVerified: state.authReducer.isTokenVerified,
    isTenantFetchFailed: state.authReducer.isTenantFetchFailed,
    loaderText: state.authReducer.alertProperties.Text,
    enabledApplications: state.homePageReducer.userAppData,
    isUserDataSet: state.homePageReducer.isUserDataSet,
    mfaRequired: state.authReducer.mfaRequired,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    setActiveScreenName: (data) => dispatch(setActiveScreenName(data)),
    addSnack: (snackMsg) => dispatch(addSnack(snackMsg)),
    setCurrentScreenName: (data) => dispatch(setCurrentScreenName(data)),
    setIsFilterApplied: (data) => dispatch(setIsFilterApplied(data)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(ProtectedRoute);
