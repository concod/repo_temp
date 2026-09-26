import { useEffect, useState } from "react";
import { connect } from "react-redux";
import globalStyles from "core/Styles/globalStyles";
import { addSnack } from "core/actions/snackbarActions";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import { cloneDeep, isEmpty } from "lodash";
import { Loader } from "impact-ui-v3";
import { ERROR_MESSAGE } from "modules/oms/constants-oms/stringConstants";
import FilterSelect from "./FilterSelect";
import {
  fetchOmsDeepDiveFiltersData,
  setDeepDiveFiltersData,
  setIsDeepDiveFiltersLoading,
} from "modules/oms/services-oms/Order-Management/order-management-vendor-to-store-service";

const DeepDiveFilters = ({ isDeepDiveFilters, ...props }) => {
  const globalClasses = globalStyles();

  const [currentSelectOptions, setCurrentSelectOptions] = useState({});
  const [selectedOptions, setSelectedOptions] = useState({});

  //Fetch Filter values on component render
  useEffect(() => {
    const fetchFilterData = async () => {
      try {
        props?.setIsDeepDiveFiltersLoading(true);
        const redirectionDetails = JSON.parse(
          localStorage.getItem("omsRedirectionDetails")
        );
        const redirectionFilters = redirectionDetails?.isRedirection
          ? redirectionDetails?.selectedFilters
          : [];
        const appliedFilters = cloneDeep(
          props?.deepDiveFiltersPayload?.filters ||
            props?.filterDashboardConfiguration?.dependencyData ||
            redirectionFilters ||
            []
        );

        //When the filter is cleared from the Product Details page, we need to add all the selected values from the Matrix Summary
        if (appliedFilters.length) {
          appliedFilters.find((filter) => {
            if (
              filter.attribute_name ===
              props?.selectedRowsFromOrderDetails?.attribute_name
            ) {
              if (filter.values.length === 0) {
                filter.values = [
                  ...props?.selectedRowsFromOrderDetails?.values,
                ];
              }
            }
          });
        }

        const appliedProductFilters = appliedFilters?.filter(
          (filter) => filter.display_type !== "fiscalCalendar"
        );

        let data = await props?.getOmsDeepDiveFiltersData({
          filters: appliedProductFilters,
        });
        props?.setDeepDiveFiltersData(data?.data?.data);
      } catch (error) {
        console.log("Error in fetching filters data for Deep Dive", error);
        props?.addSnack({
          message: ERROR_MESSAGE,
          options: {
            variant: "error",
          },
        });
      } finally {
        props?.setIsDeepDiveFiltersLoading(false);
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
        const firstColumnName =
          props?.vendorToStoreScreenConfig?.selected_product_filter?.[0]
            ?.column_name;
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
  }, [props?.deepDiveFiltersData]);

  return isEmpty(currentSelectOptions) ? (
    <div style={{ flex: "0 0 100%" }}>
      <Loader progress="" size="small" text="" />
    </div>
  ) : (
    <>
      {props?.deepDiveFilters?.map((item, index) => {
        return (
          <div style={{ flex: "0 0 20%", marginBottom: "1rem" }}>
            <FilterSelect
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
            />
          </div>
        );
      })}
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    filterDashboardConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        "orderManagementVendorStoreFilterConfiguration"
      ]?.appliedFilterData,
    vendorToStoreScreenConfig:
      store.omsReducer.orderingCommonService.orderingVendorToStoreConfig
        ?.oms_dashboard?.deep_dive,
    deepDiveFiltersData:
      store.omsReducer.orderManagementVendorToStoreService.deepDiveFiltersData,
    deepDiveFiltersPayload:
      store.omsReducer.orderManagementVendorToStoreService
        .deepDiveFiltersPayload,
    deepDiveFilters:
      store.omsReducer.orderManagementVendorToStoreService.deepDiveFilters,
    selectedRowsFromOrderDetails:
      store.omsReducer.orderManagementVendorToStoreService
        .selectedRowsFromOrderDetails,
  };
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (payload) => dispatch(addSnack(payload)),
  getOmsDeepDiveFiltersData: (payload) =>
    dispatch(fetchOmsDeepDiveFiltersData(payload)),
  setDeepDiveFiltersData: (payload) =>
    dispatch(setDeepDiveFiltersData(payload)),
  setIsDeepDiveFiltersLoading: (payload) =>
    dispatch(setIsDeepDiveFiltersLoading(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(DeepDiveFilters);
