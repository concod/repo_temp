import React, { useEffect, useState } from "react";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import DashboardIcon from "@mui/icons-material/Dashboard";
import {
  ADA_DASHBOARD,
  ADA_FORECAST_MANGEMENT,
  ADA_UPLOAD_VALIDATION,
} from "../constants-ada/routesContants";
import "core/commonComponents/layout/layout.css";
import Layout from "core/commonComponents/layout";
import AdaDashboardComponent from "../pages-ada/Dashboard";
import AdaMFPDashboardComponent from "../pages-ada/MFP-Dashboard";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchTenantFilters,
  getClientConfig,
  getUserConfig,
  setClientConfig,
  setClientConfigLoader,
  setTenantConfigLoader,
  setTenantFilters,
  setUserConfig,
  setUserConfigLoader,
  AdaUploadValidationData,
  AdaGetKeyToLabelMapping,
  setEligibilityFlag,
} from "modules/ada/services-ada/ada-dashboard/ada-dashboard-services";
import { getModuleCodes } from "../../../core/pages/file-upload-validation/file-upload-service";
import FileUploadValidation from "../../../core/pages/file-upload-validation/index";
import _ from "lodash";

export const sideBarOptions = [
  {
    link: ADA_DASHBOARD,
    screenName: "ada-visual",
    title: "ADA Visual",
    icon: React.createElement(DashboardIcon),
    order: 1,
  },
  {
    link: ADA_FORECAST_MANGEMENT,
    screenName: "ada-visual",
    title: "ADA Visual Dashboard",
    icon: React.createElement(CalendarTodayIcon),
    order: 2,
  },
];
const customAPIHandler = async (reportCode) => {
  return await Promise.all([
    AdaUploadValidationData(reportCode),
    AdaGetKeyToLabelMapping(),
    getModuleCodes(),
  ]);
};

const routes = [
  {
    path: ADA_DASHBOARD,
    screenName: "ada-visual",
    component: AdaMFPDashboardComponent,
    title: "ADA Dashboard",
  },
  {
    path: ADA_FORECAST_MANGEMENT,
    screenName: "ada-visual",
    component: AdaDashboardComponent,
    title: "ADA Visual",
  },
];

const Routes = (props) => {
  const [navBarOptions, setNavBarOptions] = useState([]);
  const [navRoutes, setNavRoutes] = useState([]);

  const dispatch = useDispatch();

  const adaReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );

  //Fetching Tenant Based Filters
  useEffect(() => {
    const getTenantFilters = async () => {
      try {
        dispatch(setTenantConfigLoader(true));
        const { data } = await fetchTenantFilters();
        dispatch(setTenantFilters(data?.data));
      } catch (error) {
      } finally {
        dispatch(setTenantConfigLoader(false));
      }
    };

    getTenantFilters();
  }, []);

  //Fetching Client Based Configs
  useEffect(() => {
    const getClientBasedConfig = async () => {
      try {
        dispatch(setClientConfigLoader(true));
        const { data } = await getClientConfig();
        dispatch(setClientConfig(data?.data?.[0]));

        const config = data?.data?.[0]?.attribute_value;
        if (config.hasOwnProperty("only_eligible")) {
          dispatch(setEligibilityFlag(config?.only_eligible));
        } else {
          dispatch(setEligibilityFlag(true));
        }
      } catch (error) {
      } finally {
        dispatch(setClientConfigLoader(false));
      }
    };

    getClientBasedConfig();
  }, []);

  //Fetching User Based Configs
  useEffect(() => {
    const getUserBasedConfig = async () => {
      try {
        dispatch(setUserConfigLoader(true));
        const { data } = await getUserConfig();
        dispatch(setUserConfig(data?.data));
      } catch (error) {
      } finally {
        dispatch(setUserConfigLoader(false));
      }
    };
    getUserBasedConfig();
  }, []);

  useEffect(() => {
    let navOptions = [];
    let finalRoutes = [];

    if (!_.isEmpty(adaReducer?.clientConfig)) {
      if (!adaReducer?.clientConfig?.attribute_value?.mfp) {
        navOptions.push(sideBarOptions[1]);
        finalRoutes.push(routes[1]);
      } else {
        if (
          adaReducer?.clientConfig?.attribute_value?.show_ada_dashboard_route
        ) {
          navOptions = [...sideBarOptions];
          finalRoutes = [...routes];
        } else {
          navOptions.push(sideBarOptions[0]);
          finalRoutes = [...routes];
        }
      }
    }
    setNavBarOptions([...navOptions]);

    let uploadRoute = {
      path: ADA_UPLOAD_VALIDATION,
      screenName: "ada-visual",
      component: () => (
        <FileUploadValidation
          customAPIHandler={customAPIHandler}
          isCustomAPI={true}
        />
      ),
      title: "ADA Visual File Upload Validations",
    };
    setNavRoutes([...finalRoutes, uploadRoute]);
  }, [adaReducer?.clientConfig]);

  return (
    <>
      {adaReducer?.clientConfig?.attribute_value && (
        <Layout routes={navRoutes} sideBarOptions={navBarOptions} app="ada" />
      )}
    </>
  );
};

export default Routes;
