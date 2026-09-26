import { useEffect, useState } from "react";
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
import { Grid } from "@mui/material";
import { setIsDeepdiveFilterLoading } from "modules/oms/services-oms/Order-Management/order-management-service";

const ProductDetailsFilters = ({ isDeepDiveFilters, ...props }) => {
  const globalClasses = globalStyles();

  const [currentSelectOptions, setCurrentSelectOptions] = useState({});
  const [selectedOptions, setSelectedOptions] = useState({});

  //Fetch Filter values on component render
  useEffect(() => {
    const fetchFilterData = async () => {
      try {
        props?.setIsDeepdiveFilterLoading(true);
        const redirectionDetails = JSON.parse(
          localStorage.getItem("omsRedirectionDetails")
        );
        const redirectionFilters = redirectionDetails?.isRedirection
          ? redirectionDetails?.selectedFilters
          : [];
        const appliedFilters = props?.showInDashboard
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

        //When the filter is cleared from the Product Details page, we need to add all the selected values from the Matrix Summary
        if (appliedFilters.length) {
          appliedFilters.find((filter) => {
            if (
              filter.attribute_name ===
              props?.selectedRowsFromMatrixSummary?.attribute_name
            ) {
              if (filter.values.length === 0) {
                filter.values = [
                  ...props?.selectedRowsFromMatrixSummary?.values,
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
        props?.setOrderManagementDeepDiveFiltersData(data?.data?.data);
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
  }, [props?.orderManagementDeepDiveFiltersPayload]);

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
        setCurrentSelectOptions(dropdownData);
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
  }, [props?.orderManagementDeepDiveFiltersData]);

  return isEmpty(currentSelectOptions) ? null : (
    <>
      {isDeepDiveFilters ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
            columnGap: "1rem",
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
