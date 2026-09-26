import { useEffect, useState, useRef } from "react";
import { connect } from "react-redux";
import globalStyles from "core/Styles/globalStyles";
import { addSnack } from "core/actions/snackbarActions";
import classNames from "classnames";
import {
  resetDeepDiveReducers,
  getOmsDeepDiveFiltersData,
  setOrderManagementDeepDiveFiltersData,
} from "modules/oms/services-oms/Order-Management/order-management-service";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import { cloneDeep, isEmpty } from "lodash";
import ChartFilters from "../../Order-Deep-Dive/ChartFilters";
import { ERROR_MESSAGE } from "modules/oms/constants-oms/stringConstants";
import { setIsDeepdiveFilterLoading } from "modules/oms/services-oms/Order-Management/order-management-service";
import { addSelectedHierarchyToFilters } from "./Style-Order-Summary/utils";

const ProductDetailsFilters = ({ isDeepDiveFilters, ...props }) => {
  const globalClasses = globalStyles();

  const [currentSelectOptions, setCurrentSelectOptions] = useState({});
  const [selectedOptions, setSelectedOptions] = useState({});
  const previousDcFilterRef = useRef(null); // Track previous DC filter to detect DC-only changes

  // Fetch filter values on render. Skip deep-dive instance on Order Management (mounted twice
  // with main + deep dive). On Decision Dashboard deep dive, `showInDashboard` runs this so
  // deep-dive filter options stay in sync with ordering-dashboard filters (incl. DC).
  useEffect(() => {
    if (isDeepDiveFilters && !props?.showInDashboard) return;

    const fetchFilterData = async () => {
      try {
        const dcSource = props?.showInDashboard
          ? props?.selectedDecisionDashboardFilters
          : props?.selectedFilters;

        // Check if only DC filter changed (not product filters)
        // Compare the full DC filter array, not just the first element
        const currentDcFilter = JSON.stringify(
          dcSource?.find((f) => f.dimension === "dc")?.values || null
        );
        const dcFilterChanged =
          previousDcFilterRef.current !== null &&
          previousDcFilterRef.current !== currentDcFilter;

        // If DC filter changed, clear deep dive data first (mimic Matrix Summary navigation behavior)
        if (dcFilterChanged) {
          props?.setOrderManagementDeepDiveFiltersData({}); // Clear old data like Matrix Summary does
        }

        // Store current DC filter for next comparison
        previousDcFilterRef.current = currentDcFilter;

        props?.setIsDeepdiveFilterLoading(true);
        const redirectionDetails = JSON.parse(
          localStorage.getItem("omsRedirectionDetails")
        );
        const redirectionFilters = redirectionDetails?.isRedirection
          ? redirectionDetails?.selectedFilters
          : [];

        const globalFilters = props?.showInDashboard
          ? cloneDeep([
              ...(props?.orderManagementDeepDiveFiltersPayload?.filters || []),
              ...(props?.selectedDecisionDashboardFilters || []),
            ])
          : cloneDeep(
              props?.orderManagementDeepDiveFiltersPayload?.filters ||
                props?.filterDashboardConfiguration?.dependencyData ||
                redirectionFilters ||
                []
            );

        const appliedFilters = addSelectedHierarchyToFilters(
          props?.highLevelSummaryState,
          globalFilters
        );

        //When the filter is cleared from the Product Details page, we need to add all the selected values from the Matrix Summary
        if (appliedFilters.length && props?.selectedRowsFromMatrixSummary) {
          const matrixSummaryFilter = props?.selectedRowsFromMatrixSummary;
          const existingFilterIndex = appliedFilters.findIndex(
            (filter) =>
              filter.attribute_name === matrixSummaryFilter?.attribute_name
          );

          if (existingFilterIndex >= 0) {
            const existingFilter = appliedFilters[existingFilterIndex];
            if (
              existingFilter.values.length === 0 ||
              (redirectionDetails?.isRedirection &&
                existingFilter.values.length >
                  props?.selectedRowsFromMatrixSummary?.values?.length)
            ) {
              existingFilter.values = [...(matrixSummaryFilter?.values || [])];
            }
          } else {
            if (!isEmpty(matrixSummaryFilter)) {
              appliedFilters.push(cloneDeep(matrixSummaryFilter));
            }
          }
        }

        const dcFilterFromSelected = dcSource?.find(
          (f) => f.dimension === "dc"
        );
        if (dcFilterFromSelected) {
          // Remove any existing DC filter
          const filtersWithoutDc = appliedFilters.filter(
            (f) => f.dimension !== "dc"
          );
          // Add the DC filter from selectedFilters
          appliedFilters.length = 0;
          appliedFilters.push(
            ...filtersWithoutDc,
            cloneDeep(dcFilterFromSelected)
          );
        }

        const appliedProductFilters = appliedFilters?.filter(
          (filter) => filter.display_type !== "fiscalCalendar"
        );

        if (
          !isEmpty(props?.selectedRowsFromMatrixSummary) ||
          (props?.showInDashboard && !isEmpty(appliedProductFilters))
        ) {
          let data = await props?.getOmsDeepDiveFiltersData({
            filters: appliedProductFilters,
          });
          props?.setOrderManagementDeepDiveFiltersData(data?.data?.data);
        }
      } catch (error) {
        console.log("Error in fetchFilterData", error);
        props?.addSnack({
          message: ERROR_MESSAGE,
          options: {
            variant: "error",
          },
        });
      } finally {
        props?.setIsDeepdiveFilterLoading(false);
      }
    };

    fetchFilterData();
  }, [
    isDeepDiveFilters,
    props?.showInDashboard,
    props?.orderManagementDeepDiveFiltersPayload,
    props?.selectedFilters,
    props?.selectedDecisionDashboardFilters,
  ]);

  //Set Filter values in dropdown
  useEffect(() => {
    if (props?.orderManagementDeepDiveFiltersData) {
      try {
        const data = cloneDeep(props?.orderManagementDeepDiveFiltersData);
        const dropdownData = Object.keys(data).reduce((filterData, filter) => {
          filterData[filter] = data[filter].map((value) => ({
            label: replaceSpecialCharacter(value),
            value: value,
          }));
          return filterData;
        }, {});
        // show unselected options also in the dropdown
        const appliedFilterColumns = new Set(
          (props?.orderManagementDeepDiveFiltersPayload?.filters || [])
            .filter((f) => f?.values?.length > 0)
            .map((f) => f?.attribute_name)
        );
        setCurrentSelectOptions((prev) => {
          const merged = { ...dropdownData };
          appliedFilterColumns.forEach((col) => {
            if (prev?.[col]?.length) {
              merged[col] = prev[col];
            }
          });
          return merged;
        });
        const firstColumnName =
          props?.orderManagementProductDetailsFilters?.[0]?.column_name;
        if (
          !props?.isDeepDiveFilters &&
          props?.isDefaultSelectionNeeded &&
          !isEmpty(dropdownData) &&
          dropdownData[firstColumnName]?.length === 1
        ) {
          setSelectedOptions(dropdownData[firstColumnName]);
        } else {
          setSelectedOptions([]);
        }
      } catch (error) {
        console.log("Error in setFilterData", error);
        props?.addSnack({
          message: ERROR_MESSAGE,
          options: {
            variant: "error",
          },
        });
      }
    }
  }, [props?.orderManagementDeepDiveFiltersData, isDeepDiveFilters]);

  return isEmpty(currentSelectOptions) ? null : (
    <>
      {isDeepDiveFilters ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
            columnGap: "1rem",
            marginRight: "1rem",
          }}
        >
          {props?.orderManagementDeepDiveFilters?.map((item, index) => {
            return (
              <ChartFilters
                label={item?.label}
                key={index}
                columnName={item?.column_name}
                filterProps={item}
                isDefaultSelectionNeeded={false}
                currentSelectOptions={currentSelectOptions[item?.column_name]}
                setCurrentSelectOptions={setCurrentSelectOptions}
                selectedOptions={selectedOptions}
                setSelectedOptions={setSelectedOptions}
                reset={props?.resetDeepDiveFilters}
                setResetFilters={props?.setResetDeepDiveFilters}
                labelOrientation={props?.labelOrientation}
              />
            );
          })}
        </div>
      ) : (
        <div
          className={classNames(globalClasses.layoutAlignStart)}
          style={{ columnGap: "1rem" }}
        >
          {props?.orderManagementProductDetailsFilters?.map((item, index) => {
            return (
              <ChartFilters
                label={item?.label}
                key={index}
                columnName={item?.column_name}
                filterProps={item}
                isDefaultSelectionNeeded={true}
                currentSelectOptions={currentSelectOptions[item?.column_name]}
                setCurrentSelectOptions={setCurrentSelectOptions}
                selectedOptions={selectedOptions}
                setSelectedOptions={setSelectedOptions}
                labelOrientation={props?.labelOrientation}
              />
            );
          })}
        </div>
      )}
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    filterDashboardConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        "orderManagementFilterConfiguration"
      ]?.appliedFilterData,
    selectedDecisionDashboardFilters:
      store.omsReducer.orderingDashboardService.selectedFilters,
    orderManagementProductDetailsFilters:
      store.omsReducer.orderManagementService
        .orderManagementProductDetailsFilters,
    orderManagementDeepDiveFiltersData:
      store.omsReducer.orderManagementService
        .orderManagementDeepDiveFiltersData,
    orderManagementDeepDiveFiltersPayload:
      store.omsReducer.orderManagementService
        .orderManagementDeepDiveFiltersPayload,
    orderManagementDeepDiveFilters:
      store.omsReducer.orderManagementService.orderManagementDeepDiveFilters,
    selectedRowsFromMatrixSummary:
      store.omsReducer.orderManagementService.selectedRowsFromMatrixSummary,
    highLevelSummaryState:
      store.omsReducer.orderManagementService.highLevelSummaryState,
    selectedFilters: store.omsReducer.orderManagementService.selectedFilters,
  };
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (payload) => dispatch(addSnack(payload)),
  getOmsDeepDiveFiltersData: (payload) =>
    dispatch(getOmsDeepDiveFiltersData(payload)),
  setOrderManagementDeepDiveFiltersData: (payload) =>
    dispatch(setOrderManagementDeepDiveFiltersData(payload)),
  resetDeepDiveReducers: () => dispatch(resetDeepDiveReducers()),
  setIsDeepdiveFilterLoading: (payload) =>
    dispatch(setIsDeepdiveFilterLoading(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ProductDetailsFilters);
