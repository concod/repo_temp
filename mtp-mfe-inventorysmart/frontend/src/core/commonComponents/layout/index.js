import LoadingOverlay from "core/Utils/Loader/loader";
import {
  getAccessHierarchy,
  hasSuperUserAccess,
} from "core/Utils/filter-accessible-data";
import {
  getFilterUserConfiguration,
  getPlanningHierarchy,
  setSavedFilterData,
  setSavedFilterSelectionLoading,
} from "core/actions/filterAction";
import layoutActions from "core/actions/layoutActions";
import {
  activeSideBarData,
  setActiveUserApp,
  setUserPlatformScreen,
  sideBarActions,
  sideBarData,
  sideBarDataDispatch,
} from "core/actions/sideBarActions";
import { addSnack } from "core/actions/snackbarActions";
import { setIsSmartBotRestricted } from "core/actions/smartBotActions";
import {
  getFilterExclusionValues,
  getModuleConfiguratorConfig,
  getTenantTimeConfig,
  getTicketingConfig,
  getUamConfig,
  getKeyboardShortcut,
  setKeyboardShortcut,
  getCommentingConfig,
  setCommentingConfig,
  getCrossFilterVersionConfig,
  getCustomAppRedirectConfig,
  getNotificationsVersion,
  getKeyboardShortcutVisibility,
  getLanguageConfig,
  getLanguagePreference,
} from "core/actions/tenantConfigActions";
import { APP_PLATFORM, appName } from "config/constants";
import { SET_KEYBOARD_SHORTCUTS_VISIBLE } from "core/constants";
// import { sideBarDataSet } from "config/sidebar";
import { cloneDeep, has, isEmpty, isNil, isNumber } from "lodash";
import {
  getFilterConfiguration,
  setAllAPIsIncludedInFilterExclusion,
  setFilterMappingeConfig,
  setIsSuperUser,
  setPlanningLevelHierarchy,
  setTenantTimeconfig,
  setTenantUamconfig,
  setTicketingModuleConfig,
  setUserAccessList,
  setUserLevelHierarchy,
  setfilterAttributeExclusionValues,
  setClientSpecificSuperUsers,
  enableMandatoryProductAutoPopulate,
  setFilterHierarchyOrder,
  setShowModuleConfigurator,
  setCustomAppRedirects
} from "core/pages/tenant-config/access-user-management/services/TenantManagement/User-Role-Management/user-role-management-service";
import React, { Suspense, useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { unstable_batchedUpdates } from "react-dom";
import { connect, useDispatch, useSelector } from "react-redux";
import { Switch } from "react-router-dom";
import { setActiveScreenName } from "../../pages/commonModulesServices/common-assort-service";
import Header from "../header";
import SideBar from "../sidebar/SideBar";
import ProtectedRoute from "./ProtectedRoute";
import { autoPopulateMandatoryProduct } from "core/commonComponents/coreComponentScreen/constants";
import makeStyles from "@mui/styles/makeStyles";
import "./layout.css";
import { useLocation } from "react-router-dom-v5-compat";
import { homePageActions } from "core/actions/homePageActions";
import { getFormattedApplicationName } from "core/Utils/functions/utils";
import { getModuleLevelAccessUtility } from "core/actions/userAccessActions";
import {
  getFiltersHierarchyOrder,
  getMappingConfig,
  tenantConfigApiCache,
} from "core/actions/tenantConfigActions";
import UseApplicationCodeScreenCode from "core/Utils/hooks/UseApplicationCodeScreenCode";
import { parseHTMLFromString, serializeSidebarData } from "./utils";
import { getShortcutKeys } from "core/Utils/utils";
import { storeTenantCurrencySymbol } from "core/commonComponents/coreComponentScreen/utils";
import { useShortcut, ShortcutsProvider } from "impact-ui-v3";
import { getCurrentApplicationDetails } from "core/commonComponents/coreComponentScreen/utils";
import { SET_SHORTCUTS_UI_EXCEPTIONS, SET_LANGUAGE_CONFIG } from "core/actions/types";

const NotFound = React.lazy(() => import("../notFound/NotFound"));
const IngestionLoader = React.lazy(() => import("core/commonComponents/ingestionLoader"));

const useStyles = makeStyles((theme) => ({
  layoutLoader: {
    position: "absolute",
    width: `calc(100% - ${theme.customVariables.closedNavWidth})`,
    height: `calc(100% - ${theme.customVariables.headerHeight})`,
  },
  layoutOverlay: {
    marginLeft: theme.customVariables.closedNavWidth,
  },
}));

const Layout = (props) => {
  let location = useLocation();
  const classes = useStyles();
  const dispatch = useDispatch();
  const [layoutState, updateLayoutState] = useReducer(
    (prev, next) => ({ ...prev, ...next }),
    { screens: [], routes: [], requiredApisCalled: false }
  );
  const { screens, routes, requiredApisCalled } = layoutState;
  const [languageLoaded, setLanguageLoaded] = useState(false);
  const keyboardShortcutsVisible = useSelector(
        (state) => state?.sideBarReducer?.keyboardShortcutsVisible
      );
  const openShortcutModuleShortcut = useSelector(getShortcutKeys("general", "openKeyboardShortcutsSettings"));
  useShortcut(openShortcutModuleShortcut, () => window.open("/keyboard-shortcuts", "_blank", "noopener,noreferrer"));
  
  UseApplicationCodeScreenCode();
  const userScreenDataRef = useRef(props.userScreenData);
  userScreenDataRef.current = props.userScreenData;

  const restrictChatbotForSpecificApp = useCallback(async () => {
    try {
      if (props.setIsSmartBotRestricted){
        let applicationURL = window.location.pathname.split("/")?.[1];
        if (applicationURL === "home") {
          // give access
          props.setIsSmartBotRestricted(false);
          return;
        }
        let applicationName = getFormattedApplicationName(
          applicationURL
        ).toLowerCase();
        let accessDataResponse = await getModuleLevelAccessUtility({
          app: applicationName,
          module: ["ChatbotModule"],
          skipHierarchyCall: true,
        })();
        if (!isEmpty(accessDataResponse)) {
          // give access
          props.setIsSmartBotRestricted(false);
        } else {
          // restrict
          props.setIsSmartBotRestricted(true);
        }
      }
    } catch (error) {
      console.error("restrictChatbotForSpecificApp error", error);
    }
  }, [props.setIsSmartBotRestricted]);

  /**
   * @func
   * @desc
   * Update component state routes and screens based on store data and props,
   * The dependent store and props to watch are routes, screens, userScreenData.
   * This sideBarDataDispatch sets the userScreenData.
   * It updates from the state again with the latest routes if userScreenData changes.
   */

  useEffect(() => {
    const setSideBarOption = async () => {
      try {
        let screenArray;
        let activeSideBarData = props?.activeSideBarStoreData;
        let activeAppName = props.activeAppName
          ? props.activeAppName
          : sessionStorage.getItem("currentApp");
        let currentSideBarData =
          activeSideBarData?.length > 0 ? activeSideBarData : [];

        let updatedRoute = [...props.routes];
        let appName = props.app || getAppName();
        let updatedScreens = [];

        if (
          activeAppName !== appName &&
          activeAppName &&
          window.location.pathname.includes("/product-grouping")
        ) {
          if (!activeSideBarData.length > 0) {
            let existingSideBar = JSON.parse(
              sessionStorage.getItem("currentSideBar")
            );
            const existingSideBarModuleSet = new Set(existingSideBar.map(
              (item) => item.module
            ));
            if (currentSideBarData.length === 0) {
              currentSideBarData = existingSideBar;
            }
            currentSideBarData = currentSideBarData
              .filter((item) => existingSideBarModuleSet.has(item.module))
              .map((item) => {
                let sideBarItemData = existingSideBar.find(
                  (e) => e.module === item.module
                );
                item.title = sideBarItemData.title;
                if (typeof item.icon === "string") {
                  item.icon = parseHTMLFromString(item.icon);
                }
                return item;
              });
          } else {
            currentSideBarData = currentSideBarData.map((item) => {
              if (typeof item.icon === "string") {
                item.icon = parseHTMLFromString(item.icon);
              }
              return item;
            });
          }

            updatedScreens = currentSideBarData;
            appName = activeAppName;
          } else {
            updatedScreens = props.sideBarOptions
              ? props.sideBarOptions
              : currentSideBarData;
          }
          // Check userScreenData first, then determine final appName
          let finalAppName = appName;
          if (
            (window.location.pathname === "/ada" ||
              window.location.pathname === "/ada/dashboard") &&
              sessionStorage.getItem("isRedirectedFromInventorySmart") === "true"
          ) {
            finalAppName = "inventorysmart";
          }

          const currentUserScreenData = userScreenDataRef.current;
          if (currentUserScreenData[finalAppName]?.screens) {
            screenArray = currentUserScreenData[finalAppName]?.screens;
          } else {
            const screenData = await sideBarData(finalAppName);
            /**
             * Structure of the api has changed to make screen accessible based on roles and screns assigned to a user
             * Default Value is "All", in case a user hasn't been given an access to a particular app, it comes as blank object and Home page fails to load
             */
            screenData?.data?.data?.data?.length > 0
              ? screenData?.data?.data?.data?.forEach((e) => {
                  screenArray = e.users.screen.map((item) => item.name);
                })
              : (screenArray = ["All"]);

            /** Changing userScreenData structure as comparison for active and accessible apps are changing in Homepage */
            dispatch(
              sideBarDataDispatch({
                [finalAppName]: { screens: screenArray, finalAppName },
              })
            );
          }

          const screenSet = new Set(screenArray);
          if (!screenSet.has("All")) {
            const accessibleRouteOptions = props.routes?.filter((e) => {
              if (Array.isArray(e?.screenName)) {
                return e.screenName.some((r) => screenSet.has(r));
              } else {
                return screenSet.has(e?.screenName);
              }
            });
            const activeOptions = activeSideBarOptions(
              screenArray,
              updatedScreens
            );
            updatedRoute =
              accessibleRouteOptions.length > 0
                ? accessibleRouteOptions
                : updatedRoute;
            updatedScreens = activeOptions ? activeOptions : updatedScreens;
          }

        if (window.location.pathname !== "/home") {
          const serializedData = serializeSidebarData(updatedScreens);
          sessionStorage.setItem("currentSideBar", JSON.stringify(serializedData));
        }
        sessionStorage.setItem("currentApp", appName);
        updatedScreens.forEach((data) => {
          data.label = data.title;
          data.tooltip = data.title;
          data.value = data.title.charAt(0).toLowerCase() + data.title.slice(1);
          if (data.disabled) {
            data.isDisabled = data.disabled;
          }
          if (data.childList) {
            data.children = data.childList;
          }
          data?.children?.forEach((child) => {
            child.label = child.title;
            child.tooltip = child.title;
            child.value =
              child.title.charAt(0).toLowerCase() + child.title.slice(1);
            if (child.disabled) {
              child.isDisabled = child.disabled;
            }
          });
        });
        unstable_batchedUpdates(() => {
          props.setActiveUserApp(appName);
          props.setActiveSideBarData(updatedScreens);
          updateLayoutState({ screens: updatedScreens, routes: updatedRoute });
        });
      } catch (error) {
        console.error("Error in setSideBarOption ", error);
      }
    };
    setSideBarOption();
  }, [props.routes, props.sideBarOptions]);

  useEffect(() => {
    const setConfiguration = async () => {
      try {
        const currentAppCode = isNumber(getCurrentApplicationDetails()?.applicationCode) ? getCurrentApplicationDetails()?.applicationCode : 3 
        const routeBasedAppCode = window.location.pathname.startsWith("/ada") ? 11 : currentAppCode;
        let tenantConfigAPITasks = {};
        await Promise.all([
          tenantConfigApiCache(3, {})(),
          tenantConfigApiCache(1, {})(),
        ]);
        // Array of tasks with attribute names and corresponding functions
        const taskList = [
          {
            key: "fuc_mapping_config_type",
            func: getMappingConfig,
            params: [3, {}],
            attribute: "fuc_mapping_config_type",
          },
          {
            key: "filters_hierarchy_order",
            func: getFiltersHierarchyOrder,
            params: [3, {}],
            attribute: "filters_hierarchy_order",
          },
          {
            key: "filter_configuration",
            func: getFilterConfiguration(),
            params: [],
            attribute: "filter_configuration",
          },
          {
            key: "access_hierarchy",
            func: getAccessHierarchy,
            params: [],
            attribute: "access_hierarchy",
          },
          {
            key: "tenant_time_config",
            func: getTenantTimeConfig,
            params: [],
            attribute: "tenant_time_config",
          },
          {
            key: "uam_config",
            func: getUamConfig,
            params: [],
            attribute: "uam_config",
          },
          {
            key: "ticketing_config",
            func: getTicketingConfig,
            params: [],
            attribute: "ticketing_config",
          },
          {
            key: "filter_exclusion_values",
            func: getFilterExclusionValues,
            params: [routeBasedAppCode],
            attribute: "filter_exclusion_values",
          },
          {
            key: "show_module_configurator",
            func: getModuleConfiguratorConfig,
            params: [],
            attribute: "show_module_configurator",
          },
          {
            key: "keyboard_shortcut",
            func: getKeyboardShortcut,
            params: [],
            attribute: "keyboard_shortcut",
          },
          {
            key: "user_apps",
            func: props.setUserApps,
            params: [],
            attribute: "user_apps",
          },
          {
            key: "commenting_configuration",
            func: getCommentingConfig,
            params: [],
            attribute: "commenting_configuration",
          },
          {
            key: "cross_filter_version",
            func: getCrossFilterVersionConfig,
            params: [],
            attribute: "cross_filter_version",
          },
          {
            key: "planning_level_hierarchy",
            func: props.getPlanningHierarchy,
            params: [2, { attribute_name: "planning_level_hierarchy" }],
            attribute: "planning_level_hierarchy",
          },
          {
            key: "app_redirects",
            func: getCustomAppRedirectConfig,
            params: [3, { attribute_name: "app_redirects" }],
            attribute: "app_redirects",
          },
          {
            key: "notifications_version",
            func: getNotificationsVersion,
            params: [3],
            attribute: "notifications_version",
          },
          {
            key: "keyboardShortcutsVisibility",
            func: getKeyboardShortcutVisibility,
            params: [currentAppCode],
            attribute: "keyboardShortcuts",
          },
          {
            key: "language_config",
            func: getLanguageConfig,
            params: [currentAppCode],
            attribute: "language_config",
          },
        ];

        // Loop through each task and either fetch from Redux cache or make API call
        for (let task of taskList) {
          const { key, func, params, attribute } = task;
          const result = func(...params);
          tenantConfigAPITasks[key] = result;
        }
        // Once all the tasks are completed, handle the results
        const tenantConfigsData = await Promise.all(
          Object.values(tenantConfigAPITasks)
        );
        const filterMappingeConfig = tenantConfigsData?.[0];
        const filterHierarchyOrderConfig = tenantConfigsData?.[1];
        let filterConfiguration = tenantConfigsData?.[2];
        const accessData = tenantConfigsData?.[3];
        const tenantTimeconfig = tenantConfigsData?.[4];
        let tenantUamConfig = tenantConfigsData?.[5];
        const ticketingModuleConfig = tenantConfigsData?.[6];
        const excludedValues = tenantConfigsData?.[7];
        const showConfigurator = tenantConfigsData?.[8];
        const keyboardShortcuts = tenantConfigsData?.[9];
        const commentingConfiguration = tenantConfigsData?.[11]?.[0]?.attribute_value || {}
        const crossFilterVersion = tenantConfigsData?.[12]?.attribute_value || {}
        sessionStorage.setItem("crossFilterVersion", JSON.stringify(crossFilterVersion))
        const planningHierarchyResponse = tenantConfigsData?.[13];
        const notificationVersion = tenantConfigsData?.[15] ?? false;
        const isKeyboardShortcutsModuleVisible = tenantConfigsData?.[16]?.enabled ?? false;
        sessionStorage.setItem("notificationVersion", notificationVersion)
        dispatch({ type: SET_KEYBOARD_SHORTCUTS_VISIBLE, payload: isKeyboardShortcutsModuleVisible });
        if (isKeyboardShortcutsModuleVisible && tenantConfigsData?.[16]?.hasOwnProperty('ui_view_exception')) {
          dispatch({ type: SET_SHORTCUTS_UI_EXCEPTIONS, payload: tenantConfigsData?.[16]?.ui_view_exception });
        }
        const languageConfig = tenantConfigsData?.[17] ?? null;
        dispatch({ type: SET_LANGUAGE_CONFIG, payload: languageConfig });
        // Fetch user's language preference
        if (languageConfig?.enable_header) {
          try {
            const applicationCode = isNumber(getCurrentApplicationDetails()?.applicationCode)
              ? getCurrentApplicationDetails()?.applicationCode
              : 3;
            // Then fetch from API to get latest
            const response = await getLanguagePreference(applicationCode);
            const langCode = response?.data?.data?.language_code;

            if (langCode) {
              localStorage.setItem(`languagePreference_${applicationCode}`, langCode);
            }
          } catch (error) {
            console.error("Failed to fetch language preference", error);
          }
        }
        setLanguageLoaded(true)
        const filterUserConfig = filterMappingeConfig?.[0]?.attribute_value;
        localStorage.setItem(
          "quickFilterLoad",
          filterUserConfig?.quick_filter_load
            ? filterUserConfig?.quick_filter_load
            : false
        );

        const filterHierarchyOrder =
          filterHierarchyOrderConfig[0]?.attribute_value;

        filterConfiguration = filterConfiguration?.data?.data.map((filter) => {
          return filter.column_name;
        });

        /**
         * filter config type is not "screen" we assume it as "global"
         * screen name sent as "All" for global finlter config
         * storing global filter in savedFilterSelection- filterReducer
         */
        let savedFilterSelection = null;
        let useSavedFilterLoading = false;
        if (
          filterUserConfig?.config_type === "global" ||
          isNil(filterUserConfig?.config_type)
        ) {
          savedFilterSelection = await getFilterUserConfiguration(
            "All"
          ).catch(() => {
            useSavedFilterLoading = true;
          });
          // if global saved filter, store in savedFilterSelection
          savedFilterSelection = savedFilterSelection?.[0]
            ?.saved_filter_preference
            ? savedFilterSelection?.[0]?.saved_filter_preference
            : [];
        } else {
          useSavedFilterLoading = true;
        }

        localStorage.setItem(
          "tenantDateFormat",
          tenantTimeconfig[0]?.attribute_value?.value?.time_format
        );
        localStorage.setItem(
          "tenantTimeZone",
          tenantTimeconfig[0]?.attribute_value?.value?.time_zone
        );

        const tenantCurrencyCode =
          tenantTimeconfig[0]?.attribute_value?.value?.currency;
        storeTenantCurrencySymbol(tenantCurrencyCode);

        let uamConfig = tenantUamConfig[0]?.attribute_value;
        let client_specific_super_users_val = [];
        if (has(uamConfig, "super_users")) {
          client_specific_super_users_val = cloneDeep(
            uamConfig["super_users"]
          );
          delete uamConfig["super_users"];
          tenantUamConfig = cloneDeep([{ attribute_value: uamConfig }]);
        }
        let tenantUamConfigDefaultData = {
          table_uam: false,
          filter_uam: true,
        };
        localStorage.setItem(
          "tenantUamConfig",
          JSON.stringify(tenantUamConfigDefaultData)
        );
        if (!isNil(uamConfig?.table_uam) && !isNil(uamConfig?.filter_uam)) {
          localStorage.setItem("tenantUamConfig", JSON.stringify(uamConfig));
        }

        // added excluded filter values as dependency in redux
        const l_currentApp = sessionStorage
          .getItem("currentApp")
          ?.toLowerCase()
          ?.toLowerCase();
        const l_currentAppFromPath = location.pathname;

        let finalDependency = [];
        if (excludedValues[0]?.attribute_value?.value) {
          let filterData = excludedValues[0]?.attribute_value?.value;
          Object.keys(filterData).forEach((key) => {
            let filtersData = Object.keys(filterData[key]).map((item) => {
              return {
                attribute_name: item,
                operator: "not in",
                values: filterData[key][item],
                filter_type: "cascaded",
                dimension: key,
                system_filter: true,
              };
            });
            finalDependency = [...finalDependency, ...filtersData];
          });
          localStorage.setItem(
            "filter_attribute_exclusion_values",
            JSON.stringify(finalDependency)
          );
        }


        // Batch all Redux dispatches into a single synchronous update
        unstable_batchedUpdates(() => {
          props.setCommentingConfig(commentingConfiguration);
          props?.setCustomAppRedirects(tenantConfigsData?.[14] || {});
          props.setKeyboardShortcut(keyboardShortcuts);
          props.setShowModuleConfigurator(
            showConfigurator?.[0]?.attribute_value?.value
          );
          props.setFilterMappingeConfig(filterUserConfig);
          if (filterUserConfig?.auto_populate_mandatory) {
            props.enableMandatoryProductAutoPopulate(
              autoPopulateMandatoryProduct
            );
          }
          if (filterHierarchyOrder) {
            props.setFilterHierarchyOrder(filterHierarchyOrder);
          }
          props.setPlanningLevelHierarchy(
            planningHierarchyResponse.data.data[0]?.attribute_value.value
          );
          props.setUserLevelHierarchy(filterConfiguration);

          if (useSavedFilterLoading) {
            props.setSavedFilterSelectionLoading();
          } else {
            props.setSavedFilterData(savedFilterSelection);
          }

          props.setUserAccessList(accessData);
          props.setIsSuperUser(hasSuperUserAccess(accessData));
          props.setTenantTimeconfig(tenantTimeconfig);

          if (client_specific_super_users_val?.length > 0) {
            props.setClientSpecificSuperUsers(client_specific_super_users_val);
          }
          props.setTenantUamconfig(tenantUamConfig);

          //Get the ticketing config, to check for role based status
          if (!isEmpty(ticketingModuleConfig)) {
            props.setTicketingModuleConfig(
              ticketingModuleConfig[0]?.["attribute_value"]
            );
          }

          if (
            l_currentApp === "inventorysmart" ||
            l_currentAppFromPath.includes("inventory-smart")
          ) {
            props.setAllAPIsIncludedInFilterExclusion(
              excludedValues?.[0]?.attribute_value
                ?.allAPIsIncludedInFilterExclusion || false
            );
          } else {
            sessionStorage.removeItem("grouping-active-tab");
          }
          if (finalDependency.length > 0) {
            props.setfilterAttributeExclusionValues(finalDependency);
          }

          updateLayoutState({ requiredApisCalled: true });
        });
      } catch (error) {
        console.error("Error in setConfiguration ", error);
        setLanguageLoaded(true);
          props.addSnack({
            message: "Something went wrong",
            options: {
              variant: "error",
            },
          });
      }
    };
    setConfiguration();
    restrictChatbotForSpecificApp();
  }, []);

  /**
   * @func
   * @desc Check if the route matches the workflow input center and set session to workflow
   * @returns return the current app as 'workflow input center'
   */
  const getAppName = useCallback(() => {
    let isWorkFlowCenter = false;
    props.routes.forEach((item) => {
      if (item.path === window.location.pathname) {
        isWorkFlowCenter = true;
        sessionStorage.setItem("currentApp", appName.WORKFLOW_INPUT_CENTER);
        return;
      }
    });
    return isWorkFlowCenter ? appName.WORKFLOW_INPUT_CENTER : "";
  }, [props.routes]);

  /**
   * @func
   * @desc Filter Sidebar Options based on the screenArray Provided
   * @param {Object} screenArray
   * @returns {Object} active sidebar Options
   */
  const activeSideBarOptions = useCallback((screenArray, sideBarOptions) => {
    const accessibleSideBarOptions = sideBarOptions
      ? cloneDeep(sideBarOptions)
      : [...props.sideBarOptions];
    const screenNameOption = [];
    accessibleSideBarOptions?.forEach((e) => {
      if (e?.isParent && e?.childList?.length > 0) {
        e.childList?.forEach((r) => {
          if (e.customDisable) {
            r.disabled = r.disabled;
          } else {
            r.disabled = !screenArray.includes(
              r.title.replace("SKU", "Product")
            );
          }
        });
        let filteredChildList = e.childList?.filter((child) => {
          if (child?.screenName && screenArray.includes(child?.screenName)) {
            return child;
          }
        });
        if (filteredChildList?.length > 0) {
          screenNameOption.push({ ...e, childList: filteredChildList });
        }
      } else if (e.screenName && screenArray.includes(e.screenName)) {
        screenNameOption.push(e);
      } else if (e.module === "keyboard_shortcuts") {
        // Always include keyboard shortcuts if it exists
        screenNameOption.push(e);
      } else {
        e.disabled =
          !screenArray.includes(e.title.replace("SKU", "Product")) &&
          e.title !== "Home" &&
          e.title !== "Keyboard Shortcuts";
      }
    });
    return screenNameOption.length
      ? screenNameOption
      : accessibleSideBarOptions;
  }, [props.sideBarOptions]);

  const isLoading = props.overlayLoaderState ||
    props.loading ||
    !requiredApisCalled ||
    isEmpty(routes) ||
    !languageLoaded;


  const suspenseFallback = useMemo(() => (
      <LoadingOverlay loader={true} spinner applyDefaultCenterStyle={true} minHeight={"calc(100vh - 64px)"} customZIndex={800} />
  ), []);

  const renderedRoutes = useMemo(() => {
    if (!routes?.length) return null;
    return routes.map((route) => (
      <ProtectedRoute
        key={`${route.path}`}
        exact
        path={`${route.path}`}
        component={route.component}
        screenName={route.screenName}
        module={route.module}
      />
    ));
  }, [routes]);

  return (
    <LoadingOverlay
      loader={isLoading}
      spinner
      applyDefaultCenterStyle={true}
    >
      <ShortcutsProvider enabled={keyboardShortcutsVisible} >
      {routes?.length > 0 && (
        <div className="wrapper">
          {requiredApisCalled && screens?.length && (
              <SideBar
                options={screens}
                setUserPlatformScreen={props.setUserPlatformScreen}
                displayPlanSmartAlert={props.displayPlanSmartAlert}
                showItemSmartIcon={props.showItemSmartIcon}
                setActivePlanStep={props.setActivePlanStep}
              />
          )}
          <div className={`layout ${classes.layoutOverlay}`}>
            {requiredApisCalled && screens?.length && (
                <Header
                  title={APP_PLATFORM.APP_NAME}
                  enableSmartBot={props.enableSmartBot}
                />
            )}
            <div className="main-content" id="content">
              <div id="sub-content">
                <Suspense fallback={suspenseFallback}>
                  {requiredApisCalled && (
                    <Switch>
                      {renderedRoutes}
                      <ProtectedRoute exact path="*" component={NotFound} />
                    </Switch>
                  )}
                </Suspense>
              </div>
            </div>
            {props.ingestionEnabled ? (
              <Suspense fallback={null}>
                <div className={classes.layoutLoader}>
                  <IngestionLoader />
                </div>
              </Suspense>
            ) : null}
          </div>
        </div>
      )}
        </ShortcutsProvider>
    </LoadingOverlay>
  );
};

const mapStateToProps = (state) => ({
  overlayLoaderState: state.loaderReducer.overlayLoaderState,
  userScreenData: state.sideBarReducer.userScreenData,
  activeAppName: state.sideBarReducer.activeAppName,
  activeSideBarStoreData: state.sideBarReducer.activeSideBarData,
  ingestionEnabled: state.layoutReducer.ingestionEnabled,
  displayPlanSmartAlert: state.sideBarReducer.displayPlanSmartAlert,
  userAppData: state.homePageReducer.userAppData,
});

const mapActionsToProps = {
  setUserScreen: sideBarActions,
  setActiveSideBarData: activeSideBarData,
  setLayout: layoutActions.setLayout,
  setIsSuperUser,
  getPlanningHierarchy,
  setPlanningLevelHierarchy,
  setUserLevelHierarchy,
  setUserAccessList,
  setUserPlatformScreen,
  setActiveScreenName,
  setTenantTimeconfig,
  setfilterAttributeExclusionValues,
  setAllAPIsIncludedInFilterExclusion,
  setSavedFilterData,
  setSavedFilterSelectionLoading,
  setActiveUserApp,
  addSnack,
  setTicketingModuleConfig,
  setFilterMappingeConfig,
  setTenantUamconfig,
  setClientSpecificSuperUsers,
  enableMandatoryProductAutoPopulate,
  setFilterHierarchyOrder,
  setShowModuleConfigurator,
  setUserApps: homePageActions,
  setIsSmartBotRestricted,
  setKeyboardShortcut,
  setCommentingConfig,
  setCustomAppRedirects
};

export default connect(mapStateToProps, mapActionsToProps)(Layout);
