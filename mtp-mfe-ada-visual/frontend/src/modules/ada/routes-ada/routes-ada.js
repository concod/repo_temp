import React, { useEffect, useState } from "react";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import DashboardIcon from "@mui/icons-material/Dashboard";
import {
  ADA_DASHBOARD,
  ADA_FORECAST_MANGEMENT,
  ADA_UPLOAD_VALIDATION,
  KEYBOARD_SHORTCUTS_REDIRECT,
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
  setCommentConfig,
} from "modules/ada/services-ada/ada-dashboard/ada-dashboard-services";
import {
  setModuleConfiguratorData,
  setModuleConfigsLoader,
} from "modules/ada/services-ada/ada-dashboard/ada-module-configurator-service";
import { getLanguagePreference } from "core/actions/tenantConfigActions";
import { getCurrentApplicationDetails } from "core/commonComponents/coreComponentScreen/utils";
import { getModuleCodes } from "../../../core/pages/file-upload-validation/file-upload-service";
import FileUploadValidation from "../../../core/pages/file-upload-validation/index";
import _ from "lodash";
import { getModuleBasedTenantConfig } from "../utils-ada/utilityFunctions.js";
import KeyboardShortcutIcon from "coreAssets/keyboardShortcutIcon.svg";
import KeyboardShortcutsRedirect from "../pages-ada/KeyboardShortcutsRedirect/index.jsx";

export const sideBarOptions = [
  {
    link: ADA_DASHBOARD,
    screenName: "ada-visual",
    title: "ADA Visual",
    icon: React.createElement(DashboardIcon),
    order: 1,
    reloadOnSameRouteClick: true,
  },
  {
    link: ADA_FORECAST_MANGEMENT,
    screenName: "ada-visual",
    title: "ADA Visual Dashboard",
    icon: React.createElement(CalendarTodayIcon),
    order: 2,
    reloadOnSameRouteClick: true,
  },
  {
    link: KEYBOARD_SHORTCUTS_REDIRECT,
    title: "Keyboard Shortcuts",
    icon: React.createElement(KeyboardShortcutIcon),
    order: 99,
    screenName: "Keyboard Shortcuts",
    module: "keyboard_shortcuts",
    childList: [],
    isPositionBottom: true,
    openInNewPage: true,
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
  {
    path: KEYBOARD_SHORTCUTS_REDIRECT,
    component: KeyboardShortcutsRedirect,
    title: "Keyboard Shortcuts",
    screenName: "Keyboard Shortcuts",
    module: "keyboard_shortcuts",
  },
];

const RoutesADA = (props) => {
  const [navBarOptions, setNavBarOptions] = useState([]);
  const [navRoutes, setNavRoutes] = useState([]);

  const dispatch = useDispatch();

  const adaReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );

  const moduleConfiguratorReducer = useSelector(
    (store) => store?.adaReducer?.adaModuleConfiguratorReducer
  );

  const keyboardShortcutsVisible = useSelector(
    (store) => store?.sideBarReducer?.keyboardShortcutsVisible
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
        dispatch(setModuleConfigsLoader(true));
        const [
          configuratorData,
          { data },
          commentingConfig,
        ] = await Promise.all([
          getModuleBasedTenantConfig({
            module_name: "Ada Visual Module Configurator",
            app_code: 1,
          })(),
          getClientConfig(),
          getModuleBasedTenantConfig({
            module_name: "commenting_configuration",
            app_code: 1,
          })(),
        ]);
        // Store configurator data in Redux
        dispatch(setModuleConfiguratorData(configuratorData));
        dispatch(setCommentConfig(commentingConfig || {}));
        let clientConfigData = data?.data?.[0];
        if (configuratorData?.hasOwnProperty("mfp")) {
          clientConfigData.attribute_value.mfp = configuratorData.mfp;
        }
        if (configuratorData?.hasOwnProperty("client_forecast_name")) {
          clientConfigData.attribute_value.show_features.custom_mfp_label =
            configuratorData.client_forecast_name;
        }
        dispatch(setClientConfig(clientConfigData));
        if (configuratorData?.hasOwnProperty("default_eligible_skus")) {
          dispatch(setEligibilityFlag(configuratorData?.default_eligible_skus));
        } else if (clientConfigData?.attribute_value?.hasOwnProperty("only_eligible")) {
          dispatch(setEligibilityFlag(clientConfigData?.attribute_value?.only_eligible));
        } else {
          dispatch(setEligibilityFlag(true));
        }
      } catch (error) {
        console.log(error);
      } finally {
        dispatch(setClientConfigLoader(false));
        dispatch(setModuleConfigsLoader(false));
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

  //Fetching Language Preference from server
  useEffect(() => {
    const fetchLanguagePreference = async () => {
      try {
        const response = await getLanguagePreference(11);
        const langCode = response?.data?.data?.language_code;
        if (langCode) {
          localStorage.setItem(`languagePreference_11`, langCode);
          // Also store with the application code from localStorage so the header can read it
          const applicationDetails = getCurrentApplicationDetails();
          if (applicationDetails?.applicationCode) {
            localStorage.setItem(
              `languagePreference_${applicationDetails.applicationCode}`,
              langCode
            );
          }
        }
      } catch (error) {
        console.error("Failed to fetch language preference", error);
      }
    };
    fetchLanguagePreference();
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
    // Add keyboard shortcuts option if visible
    if (keyboardShortcutsVisible) {
      const kbOption = sideBarOptions.find(
        (opt) => opt.module === "keyboard_shortcuts"
      );
      if (kbOption) {
        navOptions.push(kbOption);
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
  }, [adaReducer?.clientConfig, keyboardShortcutsVisible]);

  return (
    <>
      {adaReducer?.clientConfig?.attribute_value && (
        <Layout
          routes={navRoutes}
          loading={
            adaReducer?.clientConfigLoader ||
            adaReducer?.tenantConfigLoader ||
            adaReducer?.userConfigLoader ||
            moduleConfiguratorReducer?.moduleConfigsLoader
          }
          sideBarOptions={navBarOptions}
          app="ada"
        />
      )}
    </>
  );
};

export default RoutesADA;
