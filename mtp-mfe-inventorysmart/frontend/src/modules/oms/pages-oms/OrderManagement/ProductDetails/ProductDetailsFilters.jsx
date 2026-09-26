import { useEffect, useState, useRef } from "react";
import { connect } from "react-redux";
import globalStyles from "core/Styles/globalStyles";
import { addSnack } from "core/actions/snackbarActions";
import classNames from "classnames";
import {
  resetDeepDiveReducers,
  setOrderManagementDeepDiveFiltersData,
  setIsDeepdiveFilterLoading,
} from "modules/oms/services-oms/Order-Management/order-management-service";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import { cloneDeep, isEmpty } from "lodash";
import ChartFilters from "modules/oms/pages-oms/Order-Management/Order-Deep-Dive/ChartFilters";
import { ERROR_MESSAGE } from "modules/oms/constants-oms/stringConstants";
import { addSelectedHierarchyToFilters } from "modules/oms/pages-oms/Order-Management/components/Product-Details-Screen/Style-Order-Summary/utils";
import { selectMatrixHandoff } from "../slices/matrixHandoff.slice.js";
import { fetchDeepDiveFiltersDataV3 } from "./api/deepDiveFiltersData.api.js";
import {
  setDeepDiveFiltersData,
  setSelectedStyles,
  setStyleFilterAttribute,
} from "./slices/productDetails.slice.js";

const resolvePanelFilters = (props) => {
  const payloadFilters = props?.orderManagementDeepDiveFiltersPayload?.filters;
  if (Array.isArray(payloadFilters)) {
    return cloneDeep(payloadFilters);
  }
  if (Array.isArray(props?.matrixHandoff?.selectedFilters)) {
    return cloneDeep(props.matrixHandoff.selectedFilters);
  }
  if (Array.isArray(props?.filterDashboardConfiguration?.dependencyData)) {
    return cloneDeep(props.filterDashboardConfiguration.dependencyData);
  }
  return [];
};

const ProductDetailsFilters = ({ isDeepDiveFilters, ...props }) => {
  const globalClasses = globalStyles();

  const [currentSelectOptions, setCurrentSelectOptions] = useState({});
  const [selectedOptions, setSelectedOptions] = useState({});
  const previousDcFilterRef = useRef(null);
  const lastFetchSignatureRef = useRef(null);

  useEffect(() => {
    if (isDeepDiveFilters && !props?.showInDashboard) return;

    const fetchFilterData = async () => {
      try {
        const dcSource = props?.showInDashboard
          ? props?.selectedDecisionDashboardFilters
          : props?.selectedFilters;

        const currentDcFilter = JSON.stringify(
          dcSource?.find((filter) => filter.dimension === "dc")?.values || null
        );
        const dcFilterChanged =
          previousDcFilterRef.current !== null &&
          previousDcFilterRef.current !== currentDcFilter;

        if (dcFilterChanged) {
          lastFetchSignatureRef.current = null;
          props?.setOrderManagementDeepDiveFiltersData({});
        }

        previousDcFilterRef.current = currentDcFilter;

        const globalFilters = props?.showInDashboard
          ? cloneDeep([
              ...(props?.orderManagementDeepDiveFiltersPayload?.filters || []),
              ...(props?.selectedDecisionDashboardFilters || []),
            ])
          : resolvePanelFilters(props);

        // Payload not seeded yet — wait for click-path / index seed instead of
        // fetching with a different shape (handoff.globalFilters) and again later.
        if (!props?.showInDashboard && globalFilters.length === 0) {
          return;
        }

        const appliedFilters = addSelectedHierarchyToFilters(
          props?.highLevelSummaryState,
          globalFilters
        );

        if (appliedFilters.length && props?.selectedRowsFromMatrixSummary) {
          const matrixSummaryFilter = props?.selectedRowsFromMatrixSummary;
          const existingFilterIndex = appliedFilters.findIndex(
            (filter) =>
              filter.attribute_name === matrixSummaryFilter?.attribute_name
          );

          if (existingFilterIndex >= 0) {
            const existingFilter = appliedFilters[existingFilterIndex];
            if (existingFilter.values.length === 0) {
              existingFilter.values = [...(matrixSummaryFilter?.values || [])];
            }
          } else if (!isEmpty(matrixSummaryFilter)) {
            appliedFilters.push(cloneDeep(matrixSummaryFilter));
          }
        }

        const dcFilterFromSelected = dcSource?.find(
          (filter) => filter.dimension === "dc"
        );
        if (dcFilterFromSelected) {
          const filtersWithoutDc = appliedFilters.filter(
            (filter) => filter.dimension !== "dc"
          );
          appliedFilters.length = 0;
          appliedFilters.push(
            ...filtersWithoutDc,
            cloneDeep(dcFilterFromSelected)
          );
        }

        const appliedProductFilters = appliedFilters?.filter(
          (filter) => filter.display_type !== "fiscalCalendar"
        );

        if (isEmpty(appliedProductFilters)) {
          return;
        }

        const selectedHierarchies = Array.isArray(
          props?.matrixHandoff?.selectedHierarchies
        )
          ? props.matrixHandoff.selectedHierarchies
          : [];

        const fetchSignature = JSON.stringify({
          filters: appliedProductFilters,
          selected_hierarchies: selectedHierarchies,
        });
        if (lastFetchSignatureRef.current === fetchSignature) {
          return;
        }
        lastFetchSignatureRef.current = fetchSignature;

        props?.setIsDeepdiveFilterLoading(true);

        // New OM Product Details only — v3 ClickHouse; legacy screens keep v2 thunk.
        const { data: filterData } = await fetchDeepDiveFiltersDataV3({
          filters: appliedProductFilters,
          selected_hierarchies: selectedHierarchies,
          is_v3:
            typeof props?.matrixHandoff?.isV3Schema === "boolean"
              ? props.matrixHandoff.isV3Schema
              : false,
        });
        if (isEmpty(filterData)) {
          throw new Error("Empty deep-dive filters response");
        }
        props?.setOrderManagementDeepDiveFiltersData(filterData);
        props?.setDeepDiveFiltersData(filterData);

        const styleAttribute =
          props?.orderManagementProductDetailsFilters?.[0]?.column_name ||
          "article";
        props?.setStyleFilterAttribute(styleAttribute);
        const styleValues = filterData?.[styleAttribute] || [];
        if (Array.isArray(styleValues) && styleValues.length > 0) {
          props?.setSelectedStyles(styleValues);
        }
      } catch (error) {
        console.log("Error in fetchFilterData", error);
        lastFetchSignatureRef.current = null;
        props?.addSnack({
          message: ERROR_MESSAGE,
          options: { variant: "error" },
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
    props?.matrixHandoff?.selectedFilters,
    props?.matrixHandoff?.selectedHierarchies,
  ]);

  useEffect(() => {
    if (props?.orderManagementDeepDiveFiltersData) {
      try {
        const data = cloneDeep(props?.orderManagementDeepDiveFiltersData);
        const dropdownData = Object.keys(data).reduce((filterData, filter) => {
          filterData[filter] = data[filter].map((value) => ({
            label: replaceSpecialCharacter(value),
            value,
          }));
          return filterData;
        }, {});
        const appliedFilterColumns = new Set(
          (props?.orderManagementDeepDiveFiltersPayload?.filters || [])
            .filter((filter) => filter?.values?.length > 0)
            .map((filter) => filter?.attribute_name)
        );
        setCurrentSelectOptions((previous) => {
          const merged = { ...dropdownData };
          appliedFilterColumns.forEach((column) => {
            if (previous?.[column]?.length) {
              merged[column] = previous[column];
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
          options: { variant: "error" },
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
          {props?.orderManagementDeepDiveFilters?.map((item, index) => (
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
          ))}
        </div>
      ) : (
        <div
          className={classNames(globalClasses.layoutAlignStart)}
          style={{ columnGap: "1rem" }}
        >
          {props?.orderManagementProductDetailsFilters?.map((item, index) => (
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
          ))}
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
    matrixHandoff: selectMatrixHandoff(store),
  };
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (payload) => dispatch(addSnack(payload)),
  setOrderManagementDeepDiveFiltersData: (payload) =>
    dispatch(setOrderManagementDeepDiveFiltersData(payload)),
  resetDeepDiveReducers: () => dispatch(resetDeepDiveReducers()),
  setIsDeepdiveFilterLoading: (payload) =>
    dispatch(setIsDeepdiveFilterLoading(payload)),
  setDeepDiveFiltersData: (payload) => dispatch(setDeepDiveFiltersData(payload)),
  setSelectedStyles: (payload) => dispatch(setSelectedStyles(payload)),
  setStyleFilterAttribute: (payload) =>
    dispatch(setStyleFilterAttribute(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ProductDetailsFilters);
