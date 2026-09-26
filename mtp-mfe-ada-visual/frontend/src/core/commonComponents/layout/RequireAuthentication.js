import { useDispatch, useSelector } from "react-redux";
import { setActiveScreenName } from "../../pages/commonModulesServices/common-assort-service";
import { setCurrentScreenName } from "core/pages/tenant-config/access-user-management/services/TenantManagement/User-Role-Management/user-role-management-service";
import { addSnack } from "core/actions/snackbarActions";
import { useLocation } from "react-router-dom-v5-compat";
import LoadingOverlay from "core/Utils/Loader/loader";
import { Redirect } from "react-router";
import React from "react";

const RequireAuthentication = (props) => {
  const { children, rest } = props;
  let location = useLocation();
  let dispatch = useDispatch();
  const {
    isAuthenticated,
    isTokenVerified,
    isTenantFetchFailed,
    alertProperties,
  } = useSelector((store) => store?.authReducer);

  if (isTenantFetchFailed) {
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
  if (isAuthenticated) {
    dispatch(setActiveScreenName(props.screenName));
    dispatch(setCurrentScreenName(props.screenName));
    localStorage.setItem("currentScreenName", props.screenName);
    sessionStorage.setItem("activeScreenName", props.screenName);
    return React.Children.map(children, (child) =>
      React.cloneElement(child, { rest })
    );
  } else {
    if (isTokenVerified) {
      dispatch(
        addSnack({
          message: "Please Login to continue...",
          options: {
            variant: "error",
            doNotHide: true,
            autoHideDuration: 1500,
          },
        })
      );
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
          text={alertProperties.Text}
        ></LoadingOverlay>
      );
    }
  }
};

export default RequireAuthentication;
