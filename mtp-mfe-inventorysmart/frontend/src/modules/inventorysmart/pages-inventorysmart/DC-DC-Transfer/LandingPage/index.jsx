import React, { useState, useEffect, useRef } from "react";
import globalStyles from "core/Styles/globalStyles";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import { ERROR_MESSAGE, } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { getModuleLevelAccessUtility } from "core/actions/userAccessActions";
import {
  setInventorySmartModulesPermissions,
  setInventorySmartPermissionLoader,
} from "modules/inventorysmart/services-inventorysmart/common/inventory-smart-common-services";
import {
  ROLES_ACCESS_MODULES_MAPPING,
  APP_NAME,
  FULL_ACCESS_PERMISSIONS_LIST,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { cloneDeep, isEmpty } from "lodash";
import {
  handleErrorMessage,
  displaySnackMessages,
  fetchFilterConfig,
  fetchFilterOptions,
  getFilterDimensions,
} from "../../inventorysmart-utility";
import { formattedFilterConfiguration } from "core/commonComponents/coreComponentScreen/utils";
import { setFilterConfiguration } from "core/actions/filterAction";
import { connect } from "react-redux";
import {
  setDcTransferFilterConfig,
  setDcTransferDataLoader,
} from "modules/inventorysmart/services-inventorysmart/DC-TO-DC/dc-to-dc-landing-page-service.js";
import { Grid, Paper } from "@mui/material";
import { useStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";
import DcTransferTable from "./DcTransferTable";
import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";

const DcToDcTrasferComponent = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const [isModuleAccessFetched, setIsModuleAccessFetched] = useState(false);
  const [filterValuesOnRender, setFilterValuesOnRender] = useState([]);
  const [showReview, setShowReview] = useState(false)
  const [showTable, setShowTable] = useState(false)

  useEffect(() => {
    const getInitialFilterConfiguration = async () => {
      try {
        let response = await fetchFilterConfig("Inventory-Dc-To-DC-Transfer");
        if (response?.data?.show_message) {
          displaySnackMessages(response?.data?.message, "success", props);
        }
        props?.setDcTransferFilterConfig(response);
      } catch (e) {
        handleErrorMessage(e, props);
      }
    };
    getInitialFilterConfiguration();
    return () => { };
  }, []);

  useEffect(() => {
    const fetchModulesAccess = async () => {
      try {
        props.setInventorySmartPermissionLoader(true);
        const moduleName = props?.module;
        const subModules = ROLES_ACCESS_MODULES_MAPPING[props?.module];

        let rolesBasedModulesPermission = {};
        if (props?.inventorysmartScreenConfig?.roleBasedAccess) {
          let accessDataResponse = null;
          accessDataResponse = await getModuleLevelAccessUtility({
            app: APP_NAME,
            module: subModules,
          })();
          rolesBasedModulesPermission = Object.fromEntries(
            Object.entries(accessDataResponse).map(([module, actions]) => [
              module,
              Object.keys(actions),
            ])
          );
        } else {
          subModules.map(async (subModule) => {
            rolesBasedModulesPermission[
              subModule
            ] = FULL_ACCESS_PERMISSIONS_LIST;
          });
        }
        props?.setInventorySmartModulesPermissions({
          [moduleName]: rolesBasedModulesPermission,
        });
        setIsModuleAccessFetched(true);
      } catch (error) {
        console.log(error, "e");
      } finally {
        props.setInventorySmartPermissionLoader(false);
      }
    };
    if (props.inventorysmartScreenConfig) {
      fetchModulesAccess();
    }
  }, [props.inventorysmartScreenConfig])

  useEffect(() => {
    if (
      isEmpty(props.filterDashboardConfiguration) &&
      !isEmpty(props.dcTransferFilterConfigs)
    ) {
      getFilterValues(props.savedFilterSelection);
    }
  }, [props.dcTransferFilterConfigs, props.savedFilterSelection]);

  const getFilterValues = async (selected, current) => {
    props.setDcTransferDataLoader(true);
    try {
      let requiredFilterObjParams = {
        allFilters: cloneDeep(props.dcTransferFilterConfigs),
        appliedFilters: selected,
        current: current,
        rolesBasedAccess: props.inventorysmartScreenConfig?.roleBasedAccess,
        screenName: props.screenName,
        tenantFilterUamConfig: props.tenantFilterUamConfig,
      };
      const response = await fetchFilterOptions(requiredFilterObjParams);
      const filterConfigData = [
        {
          filterDashboardData: response,
          expectedFilterDimensions: getFilterDimensions(response),
          isCrossDimensionFilter: true,
          screen_name: props.screenName,
          saved_filter_screen_name: "Inventory-Dc-To-DC-Transfer",
          update_filter_dimension_on_apply: !props.inventorysmart_product_supersession_v3,
        },
      ];
      const filterConfig = formattedFilterConfiguration(
        "dcTransferFilterConfigs",
        filterConfigData,
        "Inventory-Dc-To-DC-Transfer"
      );
      props.setFilterConfiguration(filterConfig);
      props.setDcTransferDataLoader(false);
    } catch (err) {
      props.setDcTransferDataLoader(false);
      handleErrorMessage(err);
    }
  };


  const onFilterDashboardClick = (dependencyData, filterData) => {
    setShowTable(false)
    setShowReview(false)
    applyFilters(filterData, dependencyData);
  };

  const applyFilters = async (_filterElements, dependency) => {
    setFilterValuesOnRender([])
    props.setDcTransferDataLoader(true);
    try {
      setFilterValuesOnRender(dependency);
      props.setDcTransferDataLoader(false);
    } catch (e) {
      handleErrorMessage(e);
    }
    finally{
      setShowTable(true)
    }
  };

  return (
    <div className={globalClasses.paddingAround}>
        <CoreComponentScreen
         headerBreadCrumb = {<HeaderBreadCrumbs
          options={[
            {
              label: "Home",
              to: "/home",
            },
            {
              label: "DC To DC Transfer",
              id: 1,
            },
          ]}
        ></HeaderBreadCrumbs>}
          showFilterDashboard={true}
          filterConfigKey={"dcTransferFilterConfigs"}
          onApplyFilter={(dependencyData, filterData) =>
            onFilterDashboardClick(dependencyData, filterData)
          }
          showChipsOnLoad={true}
        >
          {filterValuesOnRender.length > 0 && showTable &&(
            <Grid>
            {<div className={globalClasses.marginVertical1rem}>
              <DcTransferTable
                showReview={showReview}
                setShowReview={setShowReview}
                selectedFilters={filterValuesOnRender}
                history={props?.history}
                module={"inventorysmart_dc_to_dc_transfer"}
              />
            </div>}
            </Grid>
          )}
        </CoreComponentScreen>
    </div>

  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer, filterReducer } = store;
  return {
    filterDashboardConfiguration:
      filterReducer.filterDashboardConfiguration[
      "dcTransferFilterConfigs"
      ],
    dcTransferFilterConfigs:
      inventorysmartReducer.inventorySmartDcTransferService
        .dcTransferFilterConfigs,
    savedFilterSelection: filterReducer.savedFilterSelection,
    inventorysmartScreenConfig:
      store.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig,
    inventorysmartModulesPermission:
      store.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartModulesPermission,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    setDcTransferFilterConfig: (body) =>
      dispatch(setDcTransferFilterConfig(body)),
    setFilterConfiguration: (filterConfiguration) =>
      dispatch(setFilterConfiguration(filterConfiguration)),
    setDcTransferDataLoader: (body) =>
      dispatch(setDcTransferDataLoader(body)),
    setInventorySmartModulesPermissions: (payload) =>
      dispatch(setInventorySmartModulesPermissions(payload)),
    setInventorySmartPermissionLoader: (payload) =>
      dispatch(setInventorySmartPermissionLoader(payload)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(DcToDcTrasferComponent);
