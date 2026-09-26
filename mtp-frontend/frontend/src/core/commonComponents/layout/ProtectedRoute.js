import LoadingOverlay from "../../Utils/Loader/loader";
import { Redirect, Route } from "react-router-dom";
import { connect } from "react-redux";
//import { ApmRoute } from "@elastic/apm-rum-react";
import { setActiveScreenName } from "../../pages/commonModulesServices/common-assort-service";
import { addSnack } from "core/actions/snackbarActions";
import { setCurrentScreenName } from "core/pages/tenant-config/access-user-management/services/TenantManagement/User-Role-Management/user-role-management-service";
import { setIsFilterApplied } from "core/actions/filterAction";
import { getScreenName } from "core/Utils/utils";
import { useEffect } from "react";
import { useLocation, CompatRoute } from "react-router-dom-v5-compat";
import NotFound from "core/commonComponents/notFound/NotFound";
import { find, isArray, isNil } from "lodash";
import {
  APPLICATION_URLS,
  WHITE_LISTED_URLS,
} from "./authenticationConstants.jsx";
import { extractParentUrl } from "core/Utils/functions/utils";
import IngestionLoader from "core/commonComponents/ingestionLoader";
import makeStyles from "@mui/styles/makeStyles";

const useStyles = makeStyles((theme) => ({
  layoutLoader: {
    zIndex: 10000,
    position: "absolute",
    width: `100%`,
    height: `100%`,
  },
  layoutOverlay: {
    marginLeft: theme.customVariables.closedNavWidth,
    marginRight: theme.customVariables.commentDrawerWidth,
  },
}));
export const ProtectedRoute = ({
  component: Component,
  ingestionEnabledScreens,
  ...rest
}) => {
  const classes = useStyles();
  try {
    let location = useLocation();

    useEffect(() => {
      const screenName = getScreenName(location);
      document.title = screenName;
      if (!location.pathname.includes("inventory-smart")) {
        rest.setIsFilterApplied(true);
      } else {
        rest.setIsFilterApplied(false);
      }
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
        isNil(enabledApplications) ||
        enabledApplications.length === 0 ||
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
            const isAccessible = isUserAccessible(
              rest?.location?.pathname,
              rest?.enabledApplications
            );
            if (isAccessible) {
              const allProps = { ...props, ...rest };
              allProps.setActiveScreenName(allProps.screenName);
              allProps.setCurrentScreenName(allProps.screenName);
              localStorage.setItem("currentScreenName", allProps.screenName);
              sessionStorage.setItem("activeScreenName", allProps.screenName);
              return (
                <>
                  {ingestionEnabledScreens.includes(allProps.screenName) ? (
                    <div className={classes.layoutLoader}>
                      <IngestionLoader />
                    </div>
                  ) : null}
                  <Component {...allProps} />
                </>
              );
            } else {
              return <NotFound />;
            }
          } else {
            if (rest.isTokenVerified) {
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
                      from: location,
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
                ></LoadingOverlay>
              );
            }
          }
        }}
      />
    );
  } catch (error) {
    console.error("ProtectedRoute error", error);
  }
};

const mapStateToProps = (state) => {
  return {
    isAuthenticated: state.authReducer.isAuthenticated,
    isTokenVerified: state.authReducer.isTokenVerified,
    isTenantFetchFailed: state.authReducer.isTenantFetchFailed,
    loaderText: state.authReducer.alertProperties.Text,
    enabledApplications: state.homePageReducer.userAppData,
    ingestionEnabledScreens: state.layoutReducer.ingestionEnabledScreens,
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
