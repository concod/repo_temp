import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import { cloneDeep, isEmpty } from "lodash";
import { Button, Loader } from "impact-ui-v3";
import OrderDetailsFilters from "./OrderDetailsFilters";
import { ERROR_MESSAGE } from "modules/oms/constants-oms/stringConstants";
import { addSnack, closeSnack } from "core/actions/snackbarActions";
import {
  getOmsOrderSummaryFiltersData,
  setIsOrderDetailsFiltersLoading,
  setOrderDetailsFiltersData,
  setOrderDetailsFiltersPayload,
} from "modules/oms/services-oms/Order-Management/order-management-vendor-to-store-service";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";

const OrderDetailsFilterPanel = (props) => {
  //To Handle Filters Dropdown
  const [currentSelectOptions, setCurrentSelectOptions] = useState({});
  const [selectedOptions, setSelectedOptions] = useState([]);

  const [resetFilters, setResetFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const SELECTED_ROW_FILTER_CONFIG =
    props?.vendorToStoreScreenConfig?.deep_dive?.selected_product_filter || [];

  //Fetches the filter values
  useEffect(() => {
    const fetchFilterData = async () => {
      try {
        props?.setIsOrderDetailsFiltersLoading(true);
        setIsLoading(true);
        const appliedOmsProductFilters = props.globalFiltersInParentLevel?.filter(
          (filter) => filter.display_type !== "fiscalCalendar"
        );
        const appliedFilters = cloneDeep(
          props?.orderDetailsFiltersPayload?.filters || []
        );

        const appliedProductFilters = appliedFilters?.length
          ? [...appliedOmsProductFilters, ...appliedFilters]
          : [...appliedOmsProductFilters];

        const filterConfigForOrderRow = SELECTED_ROW_FILTER_CONFIG?.[0] || {};

        const selectedRowsFilter = {
          filter_type: filterConfigForOrderRow?.type,
          attribute_name: filterConfigForOrderRow?.column_name,
          operator: "in",
          dimension: filterConfigForOrderRow?.dimension,
          values: [props?.parentRowID],
        };

        let data = await props?.getOmsOrderSummaryFiltersData({
          filters: [...appliedProductFilters, selectedRowsFilter],
        });
        props?.setOrderDetailsFiltersData(data?.data?.data);
        props?.setIsOrderDetailsFiltersLoading(false);
        setIsLoading(false);
      } catch (error) {
        console.log(
          "Error in fetching filters data for Order Info Table 2",
          error
        );
        props?.addSnack({
          message: ERROR_MESSAGE,
          options: {
            variant: "error",
          },
        });
      }
    };

    fetchFilterData();
  }, [props?.orderDetailsFiltersPayload]);

  //Set Filter values in dropdown
  useEffect(() => {
    if (props?.orderDetailsFiltersData) {
      try {
        const data = cloneDeep(props?.orderDetailsFiltersData);
        const dropdownData = Object.keys(data).reduce((filterData, filter) => {
          filterData[filter] = data[filter].map((value) => ({
            label: replaceSpecialCharacter(value),
            value: value,
          }));
          return filterData;
        }, {});
        setCurrentSelectOptions(dropdownData);
        setSelectedOptions([]);
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
  }, [props?.orderDetailsFiltersData]);

  const onOrderDetailsFilterApply = () => {
    props?.setIsTableRefreshRequired(true);
  };

  const onOrderDetailsResetFilters = () => {
    setResetFilters(true);
    const previousCustomFiltersData = cloneDeep(
      props?.orderDetailsFiltersPayload
    )?.filters;
    const filterNames = [];
    props?.orderDetailsFilters.map((filter) =>
      filterNames.push(filter.column_name)
    );
    previousCustomFiltersData.map((filter) => {
      if (filterNames.includes(filter.attribute_name)) {
        filter.values = [];
      }
    });
    props?.setOrderDetailsFiltersPayload({
      filters: previousCustomFiltersData,
    });
    props?.setIsTableRefreshRequired(true);
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        marginBottom: "1rem",
      }}
    >
      {props?.orderDetailsFilters?.map((item, index) => {
        return (
          <OrderDetailsFilters
            label={item?.label}
            key={index}
            columnName={item?.column_name}
            filterProps={item}
            isDefaultSelectionNeeded={false}
            currentSelectOptions={currentSelectOptions[item?.column_name]}
            setCurrentSelectOptions={setCurrentSelectOptions}
            selectedOptions={selectedOptions}
            setSelectedOptions={setSelectedOptions}
            setResetFilters={setResetFilters}
            resetFilters={resetFilters}
            isFiltersLoading={isLoading}
          />
        );
      })}

      <div>
        <Button
          variant="secondary"
          onClick={onOrderDetailsResetFilters}
          id="resetBtn"
          color="primary"
          disabled={
            props.isOrderDetailsFiltersLoading ||
            isEmpty(props?.orderDetailsFiltersData)
          }
        >
          Reset
        </Button>
      </div>

      <div>
        <Button
          variant="primary"
          onClick={onOrderDetailsFilterApply}
          id="applyBtn"
          color="primary"
          disabled={
            props.isOrderDetailsFiltersLoading ||
            isEmpty(props?.orderDetailsFiltersData)
          }
        >
          Apply
        </Button>
      </div>
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    vendorToStoreScreenConfig:
      store.omsReducer.orderingCommonService.orderingVendorToStoreConfig
        ?.oms_dashboard,
    orderDetailsFilters:
      store.omsReducer.orderManagementVendorToStoreService.orderDetailsFilters,
    orderDetailsFiltersPayload:
      store.omsReducer.orderManagementVendorToStoreService
        .orderDetailsFiltersPayload,
    orderDetailsFiltersData:
      store.omsReducer.orderManagementVendorToStoreService
        .orderDetailsFiltersData,
    isOrderDetailsFiltersLoading:
      store.omsReducer.orderManagementVendorToStoreService
        .isOrderDetailsFiltersLoading,
  };
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (payload) => dispatch(addSnack(payload)),
  closeSnack: (payload) => dispatch(closeSnack(payload)),
  setOrderDetailsFiltersPayload: (payload) =>
    dispatch(setOrderDetailsFiltersPayload(payload)),
  setIsOrderDetailsFiltersLoading: (payload) =>
    dispatch(setIsOrderDetailsFiltersLoading(payload)),
  setOrderDetailsFiltersData: (payload) =>
    dispatch(setOrderDetailsFiltersData(payload)),
  getOmsOrderSummaryFiltersData: (payload) =>
    dispatch(getOmsOrderSummaryFiltersData(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(OrderDetailsFilterPanel);
