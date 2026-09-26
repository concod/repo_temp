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
import { getGroupingConfig } from "../../../actions/tenantConfigActions";
import { capitalize, cloneDeep, isEmpty } from "lodash";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
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
    };
  }, []);
  useEffect(() => {
    props.setStoreGroupFilteredStores({ data: [], count: 0 });
    const fetchHierarchyData = async () => {
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
        fetchStoreFilters(dependency, false, applicationName, props.screenName),
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
      const cols = await props.getColumnsAg("table_name=store_group_filter");
      props.setStoreGrpFilteredCols(cols);
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
        restrictedCrossFilterName = filterName;
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
          restrictedCrossFilterName = filterName;
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
          showFilterDashboard={true}
          filterConfigKey={"storeGroupingManualFilterConfiguration"}
          onApplyFilter={onFilter}
          hideNoDataFound
          hideSaveFilterSection={
            location?.pathname.includes("assort-smart") ? true : false
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
};
export default connect(mapStateToProps, mapActionsToProps, null, {
  forwardRef: true,
})(ManualGroup);
