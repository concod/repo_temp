import { isEmpty, find, cloneDeep, isNil } from "lodash";
import { useRef } from "react";
import CustomAccordion from "core/commonComponents/Custom-Accordian";
import LoadingOverlay from "core/Utils/Loader/loader";
import FilterGroup from "core/commonComponents/filters/filterGroup";
import { connect } from "react-redux";
import { getSelectedFiltersFromConfig } from "./utils";
import {
  updateFilterData,
  convertFilterDataToDependency,
  disableNonMandatoryFieldsAction,
  isAutoPopulateFieldSelected,
} from "core/commonComponents/coreComponentScreen/utils";
import globalStyles from "core/Styles/globalStyles";
import {
  setFilterConfiguration,
  setSelectedFilters,
} from "core/actions/filterAction";
import { Typography } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { getAllDimensionDependency } from "./utils";

const FilterGroupSection = (props) => {
  const globalClasses = globalStyles();
  const useStyles = makeStyles((theme) => ({
    filterLabelPadding: {
      padding: "0.5rem 0",
    },
  }));

  const {
    item,
    filter,
    setMappingKeys,
    setShowFilterLoader,
    showFilterLoader,
    setFilterDependencyChips,
    filterSectionRadio,
    removeFilterAccordian,
  } = props;

  const firstTimeRender = useRef(true);
  const classes = useStyles();

  // Filter Variables
  const updateDataHandler = async (
    dependency,
    filter,
    screenName,
    selectedFilters
  ) => {
    setShowFilterLoader(true);
    const { initialFilterElements, selectionDependency } = await updateData(
      dependency,
      filter.dimension,
      filter,
      screenName,
      selectedFilters
    );
    const filterSelectionDependency = getFilterSelectionDependency(); //all selected dependencies of all dimensions except the latest filter selected
    // Adding this prop to handle custom actions on filter value update, reset
    const allDependencies = getAllDimensionDependency(
      // returns all selected filters of all dimensions
      filter.dimension,
      selectionDependency,
      filterSelectionDependency
    );
    props?.updateDependencyHandler &&
      props?.updateDependencyHandler(
        dependency,
        filter.dimension,
        filter,
        initialFilterElements,
        selectionDependency,
        allDependencies
      );
    setShowFilterLoader(false);
  };

  const getFilterConfigurationData = (selectedFilters) => {
    const copyFilterConfigurations = cloneDeep(
      props.filterDashboardConfiguration
    );
    let filterSectionData = {};
    copyFilterConfigurations.forEach((item, index) => {
      if (
        index == filterSectionRadio ||
        copyFilterConfigurations?.length === 1
      ) {
        filterSectionData = item;
      }
    });

    const filterDependency = getFilterSelectionDependency(selectedFilters);
    return {
      filterDependency: filterDependency,
      filterData: filterSectionData?.filterDashboardData,
      isCrossDimensionFilter: filterSectionData?.isCrossDimensionFilter,
      is_urm_filter: filterSectionData.is_urm_filter,
      screen_name: filterSectionData.screen_name,
      application_code: filterSectionData.application_code,
    };
  };

  const updateFilterConfigurationData = (filterData) => {
    let updatedFilterConfigurations = cloneDeep(
      props.filterDashboardConfiguration
    );
    updatedFilterConfigurations = updatedFilterConfigurations.map(
      (item, index) => {
        if (
          index == filterSectionRadio ||
          updatedFilterConfigurations?.length === 1
        ) {
          return {
            ...item,
            filterDashboardData: filterData
              ? filterData
              : item.filterDashboardData,
          };
        } else return item;
      }
    );

    let obj = {};
    obj[props.filterConfigKey] = {
      filterConfig: updatedFilterConfigurations,
      appliedFilterData: props.appliedFilterData,
    };

    if (props.filterDashboardConfigurationObj?.isRedirectedFromDifferentPage) {
      obj[props.filterConfigKey].isRedirectedFromDifferentPage =
        props.filterDashboardConfigurationObj?.isRedirectedFromDifferentPage;
    }

    props.setFilterConfiguration(obj);
  };

  const updateData = async (
    dependency,
    dimension,
    filter,
    screenName,
    selectedFilters
  ) => {
    /// send onFilterDependency and filterData based on filterSection selected
    const {
      filterDependency,
      filterData,
      isCrossDimensionFilter,
      is_urm_filter,
      screen_name,
      application_code,
    } = getFilterConfigurationData(selectedFilters);
    let {
      initialFilterElements,
      selectionDependency,
      mappedKeys,
    } = await updateFilterData(
      dependency,
      filterData,
      isCrossDimensionFilter, // isCrossDimensionFilter
      filterDependency,
      dimension,
      is_urm_filter,
      screen_name,
      application_code,
      filter,
      // This prop is used to update the dependency manually (only) in the payload where required (use case)
      props?.customDependencyValue,
      props.filterDashboardConfiguration[0].filterFetchCustomDependency,
      props?.selectionAutoPopulate?.[filter?.dimension]?.[filter?.filter_id],
      props?.customAttributeList
    );

    /**
     * handle backward cascading selection and filter data
     * removing options from selection which are no longer part of filter data after cascading
     */

    if (filter.filter_type != "non-cascaded") {
      props.filterDashboardConfiguration?.[0]?.filterDashboardClassification.forEach(
        (item) => {
          let obj = {};

          if (filter.dimension === item.dimension) {
            selectionDependency = selectionDependency.map((filter) => {
              if (
                filter.filter_type != "non-cascaded" &&
                filter.dimension === item.dimension
              ) {
                const initialFilterElement = find(initialFilterElements, {
                  column_name: filter.filter_id,
                  dimension: filter.dimension,
                });
                const initialFilterData = initialFilterElement?.initialData?.map(
                  (filter) => {
                    return filter.id;
                  }
                );
                filter.values = filter?.values?.filter((val) => {
                  return initialFilterData?.includes(val);
                });
              }

              return filter;
            });

            selectionDependency = selectionDependency.filter(
              (filter) => !isNil(filter.values) && !isEmpty(filter.values)
            );

            obj[item.screenName] = selectionDependency.filter(
              (filter) => filter.dimension === item.dimension
            );
            props.setSelectedFilters(obj);
          }
        }
      );

      selectionDependency = autoPopulateFields(
        filter,
        dependency,
        screenName,
        initialFilterElements,
        selectionDependency
      );
    }
    // updating is_disabled state of fields if mandatory fields are empty/not selected
    if (props.quickFilterLoad) {
      initialFilterElements = disableNonMandatoryFieldsAction(
        initialFilterElements,
        selectionDependency,
        [dimension]
      );
    }
    setMappingKeys(mappedKeys);
    // update onFilterDependency and filterData based on filterSection selected
    updateFilterConfigurationData(initialFilterElements, selectionDependency);
    return { initialFilterElements, selectionDependency };
  };

  // auto select fields based on configuration defined in selectionAutoPopulate
  const autoPopulateFields = (
    filter,
    dependency,
    screenName,
    initialFilterElements,
    selectionDependency
  ) => {
    // auto select l0_name, l1_name, l2_name based on configuration in selectionAutoPopulate
    const filterDimension = filter?.extra?.dimension || filter.dimension;
    if (
      props.selectionAutoPopulate[filterDimension]?.[filter.filter_id] &&
      !isEmpty(dependency)
    ) {
      const autoPopulateList =
        props.selectionAutoPopulate[filterDimension]?.[filter.filter_id];
      // l0_name, l1_name, l2_name should not be pre selected in "dependency", if they are dont perform any action
      const autoPolulateFieldIsNotSelected = isAutoPopulateFieldSelected(
        dependency,
        autoPopulateList
      );
      if (!autoPolulateFieldIsNotSelected) {
        // pre select the values in auto polulate fields list stored in config "selectionAutoPopulate"

        const autoPopulateFilterDependency = convertFilterDataToDependency(
          initialFilterElements.filter((filterElement) => {
            return (
              autoPopulateList.includes(filterElement.column_name) &&
              filterElement.dimension === filter.dimension
            );
          })
        );
        selectionDependency = [
          ...selectionDependency,
          ...autoPopulateFilterDependency,
        ];
        let obj = {};
        obj[screenName] = props.selectedFilters[screenName]
          ? [...props.selectedFilters[screenName], ...selectionDependency]
          : [...selectionDependency];

        props.setSelectedFilters(obj);
      }
    }

    return selectionDependency;
  };

  const getFilterSelectionDependency = (filterReducer = undefined) => {
    return getSelectedFiltersFromConfig(
      props.filterDashboardConfiguration,
      filterSectionRadio,
      filterReducer ? { selectedFilters: filterReducer } : props.filterReducer
    );
  };

  const renderFilterGroup = () => {
    return (
      <LoadingOverlay
        loader={showFilterLoader || isEmpty(filter.filterDashboardData)}
        minHeight={70}
      >
        <FilterGroup
          dimension={item.dimension}
          filters={filter.filterDashboardData.filter(
            (filter) => filter.dimension === item.dimension
          )}
          update={(dependency, filterValue, selectedFilters = undefined) => {
            updateDataHandler(
              dependency,
              filterValue,
              item.screenName,
              selectedFilters
            );
          }}
          filterElevation={3}
          showBorderedWrapper={false}
          screen={item.screenName}
          disabledDropdown={props.disableFilters}
          // doNotUpdateDefaultValue={true}
          customFilter={true}
          showResetButton={true}
          onReset={item.onReset}
          customComponent={
            item.customFilterComponent ? item.customFilterComponent : null
          }
          inititalSelection={
            props.selectedFilters?.[item.screenName]
              ? props.selectedFilters?.[item.screenName]
              : []
          }
          resetFilterChips={props.resetFilterChips}
          setFilterDependencyChips={setFilterDependencyChips}
        />
      </LoadingOverlay>
    );
  };

  return (
    <>
      {removeFilterAccordian ? (
        <div>
          <Typography
            variant="h5"
            className={`${globalClasses.horizontalBottomLine} ${classes.filterLabelPadding}`}
          >
            {item.filterLabel}
          </Typography>
          <div className={globalClasses.paddingVertical}>
            {renderFilterGroup()}
          </div>
        </div>
      ) : (
        <CustomAccordion
          label={item.filterLabel}
          defaultExpanded={item.defaultExpanded}
          customClass={globalClasses.accordianWrapper}
        >
          {renderFilterGroup()}
        </CustomAccordion>
      )}
    </>
  );
};

const mapStateToProps = (state, ownProps) => {
  return {
    filterDashboardConfigurationObj:
      state.filterReducer.filterDashboardConfiguration[
        ownProps.filterConfigKey
      ],
    filterDashboardConfiguration:
      state.filterReducer.filterDashboardConfiguration[ownProps.filterConfigKey]
        ?.filterConfig,
    appliedFilterData:
      state.filterReducer.filterDashboardConfiguration[ownProps.filterConfigKey]
        ?.appliedFilterData,
    selectedFilters: state.filterReducer.selectedFilters,
    selectionAutoPopulate:
      state.tenantUserRoleMgmtReducer.userRoleManagementReducer
        .selectionAutoPopulate,
    filterReducer: state.filterReducer,
    quickFilterLoad:
      state.tenantUserRoleMgmtReducer.userRoleManagementReducer.quickFilterLoad,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    setFilterConfiguration: (filterConfiguration) =>
      dispatch(setFilterConfiguration(filterConfiguration)),
    setSelectedFilters: (data) => dispatch(setSelectedFilters(data)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(FilterGroupSection);
