import { useEffect, forwardRef, useState, useRef } from "react";
import { connect } from "react-redux";
import { useLocation } from "react-router-dom-v5-compat";
import {
  getAllFilters,
  setSelectedFilters,
} from "../../../actions/filterAction";
import {
  fetchStoreGrpFilteredStores,
  setStoreGroupFilteredStores,
  ToggleLoader,
  setStoreGrpFilteredCols,
  resetFilterStores,
  addSelectedGroups,
  setSelectedStores,
  setSelectedStoresSelectAllState,
  setUnselectedStoresInSelectAll,
  setMultiChannelStatus,
} from "../services-store-grouping/custom-store-group-service";
import {
  getColumnsAg,
  resetTableRecentChanges,
} from "../../../actions/tableColumnActions";
import { fetchStoreFilters } from "./common-functions";
import globalStyles from "core/Styles/globalStyles";
import { addSnack } from "core/actions/snackbarActions";
import { setFilterConfiguration } from "core/actions/filterAction";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import {
  formattedFilterConfiguration,
  getCurrentApplicationDetails,
  updateDependencyData,
} from "core/commonComponents/coreComponentScreen/utils";
import { setSavedFilterData } from "../../../actions/filterAction";
import { cloneDeep, isEmpty } from "lodash";
import { getTenantConfigApplicationLevel } from "core/actions/tenantConfigActions";

const ManualGroup = forwardRef((props, ref) => {
  const globalClasses = globalStyles();
  let location = useLocation();
  //Temporarily save the user selection
  const existingSavedSelection = cloneDeep(props.savedFilterSelection);
  useEffect(() => {
    return () => {
      //On unmount, revert the saved selection to existing saved user's selection
      // props.setSavedFilterData(cloneDeep(existingSavedSelection));
      props.resetFilterStores();
      let store_filters_selection_obj = {};
      store_filters_selection_obj["store_filters_create_group"] = [];
      store_filters_selection_obj["product_filters_create_group"] = [];
      props.setSelectedFilters(store_filters_selection_obj);
    };
  }, []);
  useEffect(() => {
    props.setStoreGroupFilteredStores({ data: [], count: 0 });
    const fetchHierarchyData = async () => {
      let storeGroupAPIs = [];
      //API to check multi channel support
      storeGroupAPIs.push(
        getTenantConfigApplicationLevel(3, {
          attribute_name: "allow_multi_channel_flag",
        })()
      );
      storeGroupAPIs.push(props.getColumnsAg("table_name=store_group_filter"));
      const storeGrpAPIResp = await Promise.all(storeGroupAPIs);
      const allowMultiFlag = Boolean(
        storeGrpAPIResp[0].data?.data?.[0]?.attribute_value?.value
      );
      const cols = storeGrpAPIResp[1];
      props.setStoreGrpFilteredCols(cols);
      props.setMultiChannelStatus(allowMultiFlag);
      let dependency = props.savedFilterSelection || [];
      dependency = props.isEdit ? [] : dependency;
      // dependency = dependency.map((filter) => {
      //   //If the dependency is not empty and in modify screen, we keep the channel value to
      //   //selected group channel
      //   if (
      //     props.isEdit &&
      //     props?.grpObj?.channel &&
      //     filter.attribute_name === "channel"
      //   ) {
      //     filter.values = uniq([...filter.values, props.grpObj.channel]);
      //   }
      //   return filter;
      // });
      // //If it is modify screen we add channel dependency to preselected list if dependency is empty
      // //channel will be the channel value of the group selected
      // if (!dependency.length && props.isEdit && props?.grpObj?.channel) {
      //   //If there is no exisiting user saved selection, we append
      //   //new channel selection to the dependency
      //   dependency = [
      //     updateDependencyData({
      //       filter_id: "channel",
      //       dimension: "store",
      //       filter_type: "cascaded",
      //       display_type: "dropdown",
      //       values: [props.grpObj.channel],
      //     }),
      //   ];
      // }
      props.ToggleLoader(true);

      // returns filter data
      const applicationDetails = getCurrentApplicationDetails();
      const applicationName =
        applicationDetails.applicationCode === 3
          ? ""
          : props.applicationName || applicationDetails?.applicationName;
      let storeGroupFilters = await fetchStoreFilters(
        dependency,
        false,
        applicationName,
        props.screenName,
        allowMultiFlag
      );

      // storeGroupFilters = storeGroupFilters.map((filter) => {
      //   if (props.isEdit && filter.column_name === "channel") {
      //     //filter.initialData = filter.initialData.filter((channelValues) => channe)
      //   }
      //   return filter;
      // });

      if (isEmpty(props.filterDashboardConfiguration)) {
        let filterConfigData = [
          {
            filterDashboardData: storeGroupFilters,
            isCrossDimensionFilter: true,
            screen_name: props.screenName,
          },
        ];
        //Modifying the saved filter selection to keep
        //channel selection disabled and same as modify group
        // ref.storeFiltersRef.current = dependency;
        // props.setSavedFilterData(cloneDeep(dependency));
        const filterConfig = formattedFilterConfiguration(
          "storeGroupingManualFilterConfiguration",
          filterConfigData,
          "Store Grouping Manual"
        );
        props.setFilterConfiguration(filterConfig);
      }
      // const storeFilters = await fetchStoreFilters();
      // let currentAppName = location.pathname.includes("inventory-smart")
      //   ? "InventorySmart"
      //   : null;

      // const storeFilters = await fetchStoreFilters([], false, currentAppName);
      // dispatch({
      //   type: "FILTERED_STORES",
      //   payload: storeFilters,
      // });
      props.ToggleLoader(false);
    };

    fetchHierarchyData();
  }, []);

  const checkForCrossChannel = (dependencyData) => {
    const channelData = dependencyData.filter(
      (filter) => filter.attribute_name === "channel"
    );
    if (Array.isArray(channelData) && channelData.length > 1) {
      return true;
    }
    if (Array.isArray(channelData) && channelData.length === 1) {
      const channelVal = channelData[0]?.values;
      if (
        Array.isArray(channelVal) &&
        channelVal.length === 1 &&
        channelVal[0] !== props?.grpObj?.channel
      ) {
        return true;
      }
    }
    return false;
  };
  const onFilter = (dependencyData) => {
    if (
      props.isEdit &&
      !props?.allowMultiChannelFlag &&
      checkForCrossChannel(dependencyData)
    ) {
      props.addSnack({
        message: "Cross Channel is not supported",
        options: {
          variant: "error",
        },
      });
      return;
    }
    props.resetTableRecentChanges();
    ref.storeTableRef.current?.api?.setCheckConfiguration([]);
    ref.storeGroupTableRef.current?.api?.setCheckConfiguration([]);
    ref.storeTableRef.current?.api?.setPrevAction(null);
    ref.storeGroupTableRef.current?.api?.setPrevAction(null);
    ref.storeTableRef.current?.api?.setFilterModel(null);
    ref.storeGroupTableRef.current?.api?.setFilterModel(null);
    ref.storeFiltersRef.current = dependencyData;
    ref.storeGroupTableRef.current?.api?.refreshServerSideStore({
      purge: true,
    });
    ref.storeTableRef.current?.api?.refreshServerSideStore({ purge: true });
  };
  return (
    <>
      <div className={globalClasses.marginBottom}>
        <CoreComponentScreen
          // Filter dashboard props
          showFilterDashboard={true}
          filterConfigKey={"storeGroupingManualFilterConfiguration"}
          onApplyFilter={onFilter}
          hideNoDataFound
        />
      </div>
    </>
  );
});

const mapStateToProps = (state) => {
  return {
    filterDashboardConfiguration:
      state.filterReducer.filterDashboardConfiguration[
        "storeGroupingManualFilterConfiguration"
      ],
    savedFilterSelection: state.filterReducer.savedFilterSelection,
    allowMultiChannelFlag: state.storeGroupReducer.allowMultiChannelFlag,
  };
};

const mapActionsToProps = {
  fetchStoreGrpFilteredStores,
  setStoreGroupFilteredStores,
  getAllFilters,
  ToggleLoader,
  setStoreGrpFilteredCols,
  setSelectedFilters,
  resetFilterStores,
  addSelectedGroups,
  setSelectedStores,
  setSelectedStoresSelectAllState,
  setUnselectedStoresInSelectAll,
  addSnack,
  getColumnsAg,
  setFilterConfiguration,
  resetTableRecentChanges,
  setSavedFilterData,
  setMultiChannelStatus,
};
export default connect(mapStateToProps, mapActionsToProps, null, {
  forwardRef: true,
})(ManualGroup);
