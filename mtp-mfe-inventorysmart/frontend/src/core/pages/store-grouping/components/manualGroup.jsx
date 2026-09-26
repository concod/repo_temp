import { useEffect, forwardRef, useState } from "react";
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
  setMultiChannelStatus
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
} from "core/commonComponents/coreComponentScreen/utils";
import { setSavedFilterData } from "../../../actions/filterAction";
import { getGroupingConfig } from "../../../actions/tenantConfigActions";
import { capitalize, cloneDeep, isEmpty } from "lodash";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import { getTenantConfigApplicationLevel } from "core/actions/tenantConfigActions";
import  HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";

const ManualGroup = forwardRef((props, ref) => {
  const globalClasses = globalStyles();
  let location = useLocation();
  const [isChannelExist, setIsChannelExist] = useState(true);
  const [restrictedFilters, setRestrictedFilters] = useState([]);

  useEffect(() => {
    return () => {
      //On unmount, revert the saved selection to existing saved user's selection
      // props.setSavedFilterData(cloneDeep(existingSavedSelection));
      props.resetFilterStores();
      let store_filters_selection_obj = {};
      store_filters_selection_obj["store_filters_create_group"] = [];
      store_filters_selection_obj["product_filters_create_group"] = [];
      props.setSelectedFilters(store_filters_selection_obj);
      // Clear filter configuration on unmount 
      props.setFilterConfiguration({ storeGroupingManualFilterConfiguration: {} });
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
      if (props.storeFilterCols?.length === 0) {
        storeGroupAPIs.push(props.getColumnsAg(`table_name=${props?.history?.location?.state?.table_name || "store_group_filter"}`));
      }
      const storeGrpAPIResp = await Promise.all(storeGroupAPIs);
      const allowMultiFlag = Boolean(
        storeGrpAPIResp[0].data?.data?.[0]?.attribute_value?.value
      );
      if (props.storeFilterCols?.length === 0) {
        const cols = storeGrpAPIResp[1];
        props.setStoreGrpFilteredCols(cols);
      }
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
      let storeManualGroupApis = [
        fetchStoreFilters(
          dependency,
          applicationName === "AssortSmart",
          applicationName,
          props.screenName,
          allowMultiFlag,
          props.screenConfiguration?.["1.1"]?.["channel_exclude_in_1.1"]
        ),
        getGroupingConfig(1, "store_group_unique_attributes"),
      ];

      let storeManualGroupResponse = await Promise.all(storeManualGroupApis);
      
      let [storeGroupFilters, restrictedFiltersData] = storeManualGroupResponse;

      if (
        !isEmpty(
          restrictedFiltersData[0]?.attribute_value
            ?.store_group_unique_attributes
        )
      ) {
        setRestrictedFilters(
          restrictedFiltersData[0]?.attribute_value
            ?.store_group_unique_attributes
        );
      }

      // storeGroupFilters = storeGroupFilters.map((filter) => {
      //   if (props.isEdit && filter.column_name === "channel") {
      //     //filter.initialData = filter.initialData.filter((channelValues) => channe)
      //   }
      //   return filter;
      // });
      const channelPresent = storeGroupFilters.some(
        (filter) => filter.column_name === "channel"
      );
      setIsChannelExist(channelPresent);
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
    let restrictedFilterForCrossFilterSelection = [
      "channel",
      ...restrictedFilters,
    ];
    let restrictedCrossFilterName = "";
    restrictedFilterForCrossFilterSelection.some((filterName) => {
      const filterData = dependencyData.filter(
        (filter) => filter.attribute_name === filterName
      );
      if (Array.isArray(filterData) && filterData.length > 1) {
        restrictedCrossFilterName = filterData[0]?.filter_name || filterName;
        return true;
      }
      if (Array.isArray(filterData) && filterData.length === 1) {
        const filterVal = filterData[0]?.values;
        if (
          Array.isArray(filterVal) &&
          filterVal.length === 1 &&
          replaceSpecialCharacter(filterVal[0]) !==
            replaceSpecialCharacter(props?.grpObj?.[filterName])
        ) {
          restrictedCrossFilterName = filterData[0]?.filter_name || filterName;         
          return true;
        }
      }
    });
    return restrictedCrossFilterName;
  };
  const onFilter = (dependencyData) => {
    let crossChannelRestrictedFilterName = checkForCrossChannel(dependencyData);
    if (
      props.isEdit &&
      isChannelExist &&
      !props?.allowMultiChannelFlag &&
      !isEmpty(crossChannelRestrictedFilterName)
    ) {
      props.addSnack({
        message: `Cross ${capitalize(
          crossChannelRestrictedFilterName
        )} is not supported`,
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
          headerBreadCrumb={<HeaderBreadCrumbs options={props?.options} />}
          showFilterDashboard={true}
          filterConfigKey={"storeGroupingManualFilterConfiguration"}
          onApplyFilter={onFilter}
          hideNoDataFound
          hideSaveFilterSection={
            location?.pathname.includes("assort-smart") ? true : false
          }
          autoApplyEnabled={
            location?.pathname.includes("assort-smart") ? false : true
          }
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
    restrictedCrossFilter: state?.tenantConfigReducer?.restrictedCrossFilter,
    allowMultiChannelFlag: state.storeGroupReducer.allowMultiChannelFlag,
    storeFilterCols: state.storeGroupReducer.manualFilteredStoresCols,
    screenConfiguration: state?.assortsmartReducer?.commonAssortReducer?.screenConfiguration,
    
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
  getGroupingConfig,
  setMultiChannelStatus
};
export default connect(mapStateToProps, mapActionsToProps, null, {
  forwardRef: true,
})(ManualGroup);
