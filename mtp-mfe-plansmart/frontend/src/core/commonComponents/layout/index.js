import Skeleton from "@mui/material/Skeleton";
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
  getTenantConfigApplicationLevel,
  getTenantTimeConfig,
  getTicketingConfig,
  getUamConfig,
  getKeyboardShortcut,
  setKeyboardShortcut,
} from "core/actions/tenantConfigActions";
import CommentBar from "core/commonComponents/commentbar/CommentBar";
import { APP_PLATFORM, appName } from "config/constants";
// import { sideBarDataSet } from "config/sidebar";
import { cloneDeep, has, isEmpty, isNil } from "lodash";
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
} from "core/pages/tenant-config/access-user-management/services/TenantManagement/User-Role-Management/user-role-management-service";
import { Suspense, useEffect, useState } from "react";
import { connect, useDispatch } from "react-redux";
import { Switch } from "react-router-dom";
import { setActiveScreenName } from "../../pages/commonModulesServices/common-assort-service";
import Header from "../header";
import NotFound from "../notFound/NotFound";
import SideBar from "../sidebar/SideBar";
import ProtectedRoute from "./ProtectedRoute";
import { autoPopulateMandatoryProduct } from "core/commonComponents/coreComponentScreen/constants";
import makeStyles from "@mui/styles/makeStyles";
import "./layout.css";
import IngestionLoader from "core/commonComponents/ingestionLoader";
import { CompatRoute, useLocation } from "react-router-dom-v5-compat";
import { homePageActions } from "core/actions/homePageActions";
import { getFormattedApplicationName } from "core/Utils/functions/utils";
import { getModuleLevelAccessUtility } from "core/actions/userAccessActions";
import { formatKeyboardShortcuts } from "core/Utils/keyboard-shorcuts/utils";

const useStyles = makeStyles((theme) => ({
  layoutLoader: {
    position: "absolute",
    width: `calc(100% - ${theme.customVariables.closedNavWidth})`,
    height: `calc(100% - ${theme.customVariables.headerHeight})`,
  },
  layoutOverlay: {
    marginLeft: theme.customVariables.closedNavWidth,
    marginRight: theme.customVariables.commentDrawerWidth,
  },
}));

const Layout = (props) => {
  let location = useLocation();
  const classes = useStyles();
  const dispatch = useDispatch();
  const [screens, setScreens] = useState();
  const [routes, setRoutes] = useState();
  const [requiredApisCalled, setRequiredApisCalled] = useState(false);

  const restrictChatbotForSpecificApp = async () => {
    try {
      let applicationURL = window.location.pathname.split("/")?.[1];
      if (applicationURL === "home") {
        // give access
        props.setIsSmartBotRestricted(false);
        return;
      }
      let applicationName =
        getFormattedApplicationName(applicationURL).toLowerCase();
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
    } catch (error) {
      console.error("restrictChatbotForSpecificApp error", error);
    }
  };

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
        let activeSideBarData = props?.sideBarReducer?.activeSideBarData;
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
            let existingSideBarModule = existingSideBar.map(
              (item) => item.module
            );
            currentSideBarData = currentSideBarData
              .filter((item) => existingSideBarModule.indexOf(item.module) > -1)
              .map((item) => {
                let sideBarItemData = existingSideBar.filter(
                  (e) => e.module === item.module
                )[0];
                item.title = sideBarItemData.title;
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

        if (props.userScreenData[appName]?.screens) {
          screenArray = props.userScreenData[appName]?.screens;
        } else {
          const screenData = await sideBarData(appName);
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
              [appName]: { screens: screenArray, appName },
            })
          );
        }
        if (!screenArray.includes("All")) {
          const accessibleRouteOptions = props.routes?.filter((e) => {
            if (Array.isArray(e.screenName)) {
              const found = screenArray.some((r) => e.screenName.includes(r));
              return found;
            } else {
              return screenArray.includes(e.screenName);
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
          sessionStorage.setItem(
            "currentSideBar",
            JSON.stringify(updatedScreens)
          );
        }
        sessionStorage.setItem("currentApp", appName);
        props.setActiveUserApp(appName);
        props.setActiveSideBarData(updatedScreens);
        setScreens(updatedScreens);
        setRoutes(updatedRoute);
      } catch (error) {
        console.log(error);
      }
    };
    setSideBarOption();
  }, [props.routes, props.sideBarOptions, props.userScreenData]);

  useEffect(() => {
    const setConfiguration = async () => {
      try {
        let tenantConfigAPITasks = [];

        //Task 1
        tenantConfigAPITasks.push(
          getTenantConfigApplicationLevel(3, {
            attribute_name: "fuc_mapping_config_type",
          })()
        );

        //Task 2
        tenantConfigAPITasks.push(
          getTenantConfigApplicationLevel(3, {
            attribute_name: "filters_hierarchy_order",
          })()
        );

        //Task 3
        tenantConfigAPITasks.push(
          props.getPlanningHierarchy(2, {
            attribute_name: "planning_level_hierarchy",
          })
        );

        //Task 4
        tenantConfigAPITasks.push(getFilterConfiguration()());

        //Task 5
        tenantConfigAPITasks.push(getAccessHierarchy());

        //Task 6
        tenantConfigAPITasks.push(getTenantTimeConfig());

        //Task 7
        tenantConfigAPITasks.push(getUamConfig());

        //Task 8
        tenantConfigAPITasks.push(getTicketingConfig());

        //Task 9
        tenantConfigAPITasks.push(getFilterExclusionValues());

        //Task 10
        tenantConfigAPITasks.push(getModuleConfiguratorConfig());

        // Task 11
        tenantConfigAPITasks.push(getKeyboardShortcut());

        //keep this conditional task in last, otherwise index would be disturbed
        //do not remove from tenantConfigAPITasks as pushing ensures Promise resolution
        if (!props.userAppData.length) {
          tenantConfigAPITasks.push(props.setUserApps());
        }

        const tenantConfigsData = await Promise.all(tenantConfigAPITasks);

        const filterMappingeConfig = tenantConfigsData[0];
        const filterHierarchyOrderConfig = tenantConfigsData[1];
        let planningHierarchyResponse = tenantConfigsData[2];
        let filterConfiguration = tenantConfigsData[3];
        const accessData = tenantConfigsData[4];
        const tenantTimeconfig = tenantConfigsData[5];
        let tenantUamConfig = tenantConfigsData[6];
        const ticketingModuleConfig = tenantConfigsData[7];
        const excludedValues = tenantConfigsData[8];
        const showConfigurator = tenantConfigsData[9];
        const keyboardShortcuts = tenantConfigsData[10];

        const formattedKeyboardShortcuts =
          formatKeyboardShortcuts(keyboardShortcuts);
        props.setKeyboardShortcut(formattedKeyboardShortcuts);

        props.setShowModuleConfigurator(
          showConfigurator?.[0]?.attribute_value?.value
        );

        const filterUserConfig =
          filterMappingeConfig.data?.data?.[0]?.attribute_value;
        props.setFilterMappingeConfig(filterUserConfig);
        localStorage.setItem(
          "quickFilterLoad",
          filterUserConfig?.quick_filter_load
            ? filterUserConfig?.quick_filter_load
            : false
        );
        if (filterUserConfig?.auto_populate_mandatory) {
          props.enableMandatoryProductAutoPopulate(
            autoPopulateMandatoryProduct
          );
        }

        const filterHierarchyOrder =
          filterHierarchyOrderConfig.data?.data?.[0]?.attribute_value;
        if (filterHierarchyOrder) {
          props.setFilterHierarchyOrder(filterHierarchyOrder);
        }

        props.setPlanningLevelHierarchy(
          planningHierarchyResponse.data.data[0].attribute_value.value
        );

        filterConfiguration = filterConfiguration?.data?.data.map((filter) => {
          return filter.column_name;
        });
        props.setUserLevelHierarchy(filterConfiguration);

        /**
         * filter config type is not "screen" we assume it as "global"
         * screen name sent as "All" for global finlter config
         * storing global filter in savedFilterSelection- filterReducer
         */
        if (
          filterUserConfig?.config_type === "global" ||
          isNil(filterUserConfig?.config_type)
        ) {
          let savedFilterSelection = await getFilterUserConfiguration(
            "All"
          ).catch(() => {
            props.setSavedFilterSelectionLoading();
          });
          // if global saved filter, store in savedFilterSelection
          savedFilterSelection = savedFilterSelection?.[0]
            ?.saved_filter_preference
            ? savedFilterSelection?.[0]?.saved_filter_preference
            : [];
          props.setSavedFilterData(savedFilterSelection);
        } else {
          props.setSavedFilterSelectionLoading();
        }

        props.setUserAccessList(accessData);
        props.setIsSuperUser(hasSuperUserAccess(accessData));

        props.setTenantTimeconfig(tenantTimeconfig);
        localStorage.setItem(
          "tenantDateFormat",
          tenantTimeconfig[0]?.attribute_value?.value?.time_format
        );
        localStorage.setItem(
          "tenantTimeZone",
          tenantTimeconfig[0]?.attribute_value?.value?.time_zone
        );

        let uamConfig = tenantUamConfig[0]?.attribute_value;
        if (has(uamConfig, "super_users")) {
          const client_specific_super_users = cloneDeep(
            uamConfig["super_users"]
          );
          props.setClientSpecificSuperUsers(client_specific_super_users);
          delete uamConfig["super_users"];
          tenantUamConfig = cloneDeep([{ attribute_value: uamConfig }]);
        }
        props.setTenantUamconfig(tenantUamConfig);
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

        //Get the ticketing config, to check for role based status
        if (!isEmpty(ticketingModuleConfig)) {
          props.setTicketingModuleConfig(
            ticketingModuleConfig[0]["attribute_value"]
          );
        }

        // added excluded filter values as dependency in redux
        const l_currentApp = sessionStorage
          .getItem("currentApp")
          ?.toLowerCase()
          ?.toLowerCase();
        const l_currentAppFromPath = location.pathname;
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
        if (excludedValues[0]?.attribute_value?.value) {
          let filterData = excludedValues[0]?.attribute_value?.value;
          let finalDependency = [];
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
          props.setfilterAttributeExclusionValues(finalDependency);
          localStorage.setItem(
            "filter_attribute_exclusion_values",
            JSON.stringify(finalDependency)
          );
        }
        setRequiredApisCalled(true);
      } catch (error) {
        console.log(error);
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
  const getAppName = () => {
    let isWorkFlowCenter = false;
    props.routes.forEach((item) => {
      if (item.path === window.location.pathname) {
        isWorkFlowCenter = true;
        sessionStorage.setItem("currentApp", appName.WORKFLOW_INPUT_CENTER);
        return;
      }
    });
    return isWorkFlowCenter ? appName.WORKFLOW_INPUT_CENTER : "";
  };

  /**
   * @func
   * @desc Filter Sidebar Options based on the screenArray Provided
   * @param {Object} screenArray
   * @returns {Object} active sidebar Options
   */
  const activeSideBarOptions = (screenArray, sideBarOptions) => {
    const accessibleSideBarOptions = sideBarOptions
      ? cloneDeep(sideBarOptions)
      : [...props.sideBarOptions];
    const screenNameOption = [];
    accessibleSideBarOptions?.forEach((e) => {
      if (e.screenName && screenArray.includes(e.screenName)) {
        screenNameOption.push(e);
      } else if (e.isParent || e.isParentBottom) {
        e.childList?.forEach((r) => {
          r.disabled = !screenArray.includes(r.title.replace("SKU", "Product"));
        });
      } else {
        e.disabled =
          !screenArray.includes(e.title.replace("SKU", "Product")) &&
          e.title !== "Home";
      }
    });
    return screenNameOption.length
      ? screenNameOption
      : accessibleSideBarOptions;
  };

  return (
    <LoadingOverlay
      loader={props.overlayLoaderState || props.loading || !requiredApisCalled}
      spinner
    >
      {routes && (
        <div className="wrapper">
          {requiredApisCalled && (
            <SideBar
              options={screens}
              props={props}
              setActivePlanStep={props.setActivePlanStep}
            />
          )}
          <div className={`layout ${classes.layoutOverlay}`}>
            {requiredApisCalled && <Header title={APP_PLATFORM.APP_NAME} />}
            <div className="main-content" id="content">
              <div id="sub-content">
                <Suspense
                  fallback={
                    <div>
                      <Skeleton> </Skeleton>
                    </div>
                  }
                >
                  {requiredApisCalled && (
                    <Switch>
                      {routes.map((route) => (
                        <ProtectedRoute
                          key={`${route.path}`}
                          exact
                          path={`${route.path}`}
                          component={route.component}
                          screenName={route.screenName}
                          module={route.module}
                        />
                      ))}
                      <ProtectedRoute exact path="*" component={NotFound} />
                    </Switch>
                  )}
                </Suspense>
              </div>
            </div>
            {props.ingestionEnabled ? (
              <div className={classes.layoutLoader}>
                <IngestionLoader />
              </div>
            ) : null}
          </div>
          {requiredApisCalled && (
            <CommentBar
              showCommentScreenNameOption={props.showCommentScreenNameOption}
              commentBarPlaceholder={props.commentBarPlaceholder}
            />
          )}
        </div>
      )}
    </LoadingOverlay>
  );
};

const mapStateToProps = (state) => ({
  overlayLoaderState: state.loaderReducer.overlayLoaderState,
  userScreenData: state.sideBarReducer.userScreenData,
  activeAppName: state.sideBarReducer.activeAppName,
  sideBarReducer: state.sideBarReducer,
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
};

export default connect(mapStateToProps, mapActionsToProps)(Layout);
