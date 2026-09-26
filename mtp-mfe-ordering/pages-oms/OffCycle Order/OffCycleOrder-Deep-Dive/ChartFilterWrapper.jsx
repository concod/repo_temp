import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import { cloneDeep, isEmpty } from "lodash";
import { ERROR_MESSAGE } from "modules/oms/constants-oms/stringConstants";
import { addSnack, closeSnack } from "core/actions/snackbarActions";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import ChartFilters from "./ChartFilters";
import {
  getOffCycleDeepDiveFiltersData,
  setIsOffCycleOrderDeepDiveFilterLoading,
  setOffCycleOrderDeepDiveFiltersData,
  setOffCycleOrderDeepDiveFiltersPayload,
} from "modules/oms/services-oms/Create-New-Order/off-cycle-order-service";

const ChartFilterWrapper = (props) => {
  //To Handle Filters Dropdown
  const [currentSelectOptions, setCurrentSelectOptions] = useState({});
  const [selectedOptions, setSelectedOptions] = useState([]);

  const [isLoading, setIsLoading] = useState(false);

  //Fetches the filter values
  useEffect(() => {
    const fetchFilterData = async () => {
      try {
        props?.setIsFilterLoading(true);
        setIsLoading(true);

        const appliedFilters = cloneDeep(
          props?.deepDiveFiltersPayload?.filters || []
        );

        const appliedProductFilters = appliedFilters?.length
          ? [...appliedFilters]
          : [];

        const payload = {
          filters: appliedProductFilters?.length
            ? [...appliedProductFilters]
            : undefined,
          draft_id: props?.draftId,
        };

        let data = await props?.getOffCycleDeepDiveFiltersData(payload);
        props?.setFiltersData(data?.data?.data);
        props?.setIsFilterLoading(false);
        setIsLoading(false);
      } catch (error) {
        console.log("Error in fetching Deep Dive Filters Data", error);
        props?.addSnack({
          message: ERROR_MESSAGE,
          options: {
            variant: "error",
          },
        });
      }
    };
    fetchFilterData();
  }, [props?.deepDiveFiltersPayload]);

  //Set Filter values in dropdown
  useEffect(() => {
    if (props?.deepDiveFiltersData) {
      try {
        const data = cloneDeep(props?.deepDiveFiltersData);
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
  }, [props?.deepDiveFiltersData]);

  const filtersToRender = props?.isProductFilter
    ? props?.deepDiveFilters.slice(0, 1)
    : props?.deepDiveFilters.slice(1);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        marginRight: props?.isProductFilter ? "1rem" : 0,
      }}
    >
      {filtersToRender?.map((item, index) => {
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
            setResetFilters={props?.setResetFilters}
            resetFilters={props?.resetFilters}
            isFiltersLoading={isLoading}
            labelOrientation={props?.labelOrientation}
          />
        );
      })}
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    deepDiveFilters:
      store.omsReducer.offCycleOrderService.offCycleOrderDeepDiveFilters,
    deepDiveFiltersPayload:
      store.omsReducer.offCycleOrderService.offCycleOrderDeepDiveFiltersPayload,
    deepDiveFiltersData:
      store.omsReducer.offCycleOrderService.offCycleOrderDeepDiveFiltersData,
    isFiltersLoading:
      store.omsReducer.offCycleOrderService
        .isOffCycleOrderDeepDiveFilterLoading,
  };
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (payload) => dispatch(addSnack(payload)),
  closeSnack: (payload) => dispatch(closeSnack(payload)),
  setFiltersPayload: (payload) =>
    dispatch(setOffCycleOrderDeepDiveFiltersPayload(payload)),
  setIsFilterLoading: (payload) =>
    dispatch(setIsOffCycleOrderDeepDiveFilterLoading(payload)),
  setFiltersData: (payload) =>
    dispatch(setOffCycleOrderDeepDiveFiltersData(payload)),
  getOffCycleDeepDiveFiltersData: (payload) =>
    dispatch(getOffCycleDeepDiveFiltersData(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(ChartFilterWrapper);
