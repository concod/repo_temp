import React, { useEffect, useState } from "react";
import { Divider } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { connect } from "react-redux";
import { addSnack } from "core/actions/snackbarActions";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import { cloneDeep, isEmpty } from "lodash";
import { Loader } from "impact-ui-v3";
import { ERROR_MESSAGE } from "modules/oms/constants-oms/stringConstants";
import ExpediteOrdersChartFilter from "./DeepDiveFilter.js";
import {
  fetchOmsDeepDiveFiltersData,
  setDeepDiveFiltersData,
  setIsDeepDiveFiltersLoading,
} from "modules/oms/services-oms/Decision-Dashboard/expedite-order-service.js";
import {
  EXPEDITE_LS_KEYS,
  getExpediteActiveArticles,
  overrideExpediteArticleFilter,
  ensureExpediteArticleScope,
} from "modules/oms/pages-oms/OffCycle Order/Expedite-Orders/constants";

const useStyles = makeStyles(() => ({
  compactFilterGroup: {
    display: "flex",
    alignItems: "center",
    flexWrap: "nowrap",
    gap: 12,
    minWidth: 0,
    position: "relative",
    zIndex: 21,
    overflow: "visible",
  },
  compactFilterItem: {
    flex: "0 0 auto",
    marginBottom: 0,
    position: "relative",
    overflow: "visible",
    "& .ia-select-container-v3": {
      position: "relative",
      overflow: "visible",
    },
    "& .ia-select-main-container-v3": {
      flexWrap: "nowrap",
      whiteSpace: "nowrap",
    },
    "& .ia-select-label-v3": {
      whiteSpace: "nowrap",
    },
  },
  compactDivider: {
    height: 24,
    alignSelf: "center",
    flexShrink: 0,
  },
}));

const ExpediteOrdersDeepDiveFilterGroup = ({ isDeepDiveFilters, ...props }) => {
  const classes = useStyles();
  const [currentSelectOptions, setCurrentSelectOptions] = useState({});
  const [selectedOptions, setSelectedOptions] = useState({});

  //Fetch Filter values on component render
  useEffect(() => {
    const fetchFilterData = async () => {
      try {
        props?.setIsDeepDiveFiltersLoading(true);

        // Prefer session alert payload filters as the primary source.
        let sessionFilters = [];
        let expediteChoiceCombinations = [];
        const expeditePayloadRaw = localStorage.getItem(
          EXPEDITE_LS_KEYS.ALERT_PAYLOAD
        );
        if (expeditePayloadRaw) {
          try {
            const expeditePayload = JSON.parse(expeditePayloadRaw);
            sessionFilters = Array.isArray(expeditePayload?.filters)
              ? expeditePayload.filters
              : [];
            expediteChoiceCombinations = Array.isArray(
              expeditePayload?.choiceDcCombinations
            )
              ? expeditePayload.choiceDcCombinations
              : [];
          } catch (err) {
            console.log("Error in parsing expedite payload", err);
          }
        }
        // Constrain the sessionFilters `article` entry to the active article
        // set so the filter-options endpoint never widens beyond the current
        // expedite scope (50 alert-picked articles or the simulated subset).
        // This only matters when deepDiveFiltersPayload is not yet seeded;
        // the normal render path uses deepDiveFiltersPayload which the panel
        // already constrains.
        if (sessionFilters.length) {
          const activeArticles = getExpediteActiveArticles(
            expediteChoiceCombinations,
            props?.generatedOrders
          );
          sessionFilters = overrideExpediteArticleFilter(
            sessionFilters,
            activeArticles
          );
        }

        const redirectionDetails = JSON.parse(
          localStorage.getItem("omsRedirectionDetails")
        );
        const redirectionFilters = redirectionDetails?.isRedirection
          ? redirectionDetails?.selectedFilters
          : [];
        const appliedFilters = cloneDeep(
          props?.deepDiveFiltersPayload?.filters ||
            sessionFilters ||
            props?.filterDashboardConfiguration?.dependencyData ||
            redirectionFilters ||
            []
        );

        //When the filter is cleared from the Product Details page, we need to add all the selected values from the Matrix Summary
        if (appliedFilters.length) {
          appliedFilters.find((filter) => {
            if (
              filter.attribute_name ===
              props?.selectedRowsFromAlert?.attribute_name
            ) {
              if (filter.values.length === 0) {
                filter.values = [...props?.selectedRowsFromAlert?.values];
              }
            }
          });
        }

        const appliedProductFilters = appliedFilters?.filter(
          (filter) => filter.display_type !== "fiscalCalendar"
        );

        // Guard against a user-cleared `article` dropdown widening the
        // filter-options fetch back to the full dashboard universe. If the
        // article entry has no values, backfill with the active article set
        // (simulation articles on step 2, else alert-picked `choiceDcCombinations`).
        const activeArticlesForRequest = getExpediteActiveArticles(
          expediteChoiceCombinations,
          props?.generatedOrders
        );
        const scopedProductFilters = ensureExpediteArticleScope(
          appliedProductFilters,
          activeArticlesForRequest
        );

        let data = await props?.getOmsDeepDiveFiltersData({
          filters: scopedProductFilters,
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
        const firstColumnName = props?.deepDiveFilters?.[0]?.column_name;
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

  const isCompact = Boolean(props?.compactLayout);

  return isEmpty(currentSelectOptions) ? (
    <div style={{ flex: isCompact ? "0 0 auto" : "0 0 100%" }}>
      <Loader progress="" size="small" text="" />
    </div>
  ) : (
    <div className={isCompact ? classes.compactFilterGroup : undefined}>
      {props?.deepDiveFilters?.map((item, index) => {
        return (
          <React.Fragment key={item?.column_name || index}>
            {isCompact && props?.SHOW_DIVIDER_FOR_FILTER_GROUP && index > 0 ? (
              <Divider
                orientation="vertical"
                variant="middle"
                flexItem
                className={classes.compactDivider}
              />
            ) : null}
            <div
              className={isCompact ? classes.compactFilterItem : undefined}
              style={
                isCompact
                  ? undefined
                  : { flex: "0 0 20%", marginBottom: "1rem" }
              }
            >
              <ExpediteOrdersChartFilter
                label={item?.label}
                columnName={item?.column_name}
                filterProps={item}
                isDefaultSelectionNeeded={false}
                currentSelectOptions={currentSelectOptions[item?.column_name]}
                setCurrentSelectOptions={setCurrentSelectOptions}
                selectedOptions={selectedOptions}
                setSelectedOptions={setSelectedOptions}
                reset={props?.resetDeepDiveFilters}
                setResetFilters={props?.setResetDeepDiveFilters}
                labelOrientation={isCompact ? "left" : props?.labelOrientation}
                compactLayout={isCompact}
                autoApplyOnBlur={props?.autoApplyOnBlur}
                onFilterApply={props?.onFilterApply}
              />
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    filterDashboardConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        "orderManagementFilterConfiguration"
      ]?.appliedFilterData,
    deepDiveFiltersData:
      store.omsReducer.expediteOrdersService.deepDiveFiltersData,
    deepDiveFiltersPayload:
      store.omsReducer.expediteOrdersService.deepDiveFiltersPayload,
    deepDiveFilters: store.omsReducer.expediteOrdersService.deepDiveFilters,
    selectedRowsFromAlert:
      store.omsReducer.expediteOrdersService.selectedRowsFromAlert,
    generatedOrders: store.omsReducer.expediteOrdersService.generatedOrders,
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

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ExpediteOrdersDeepDiveFilterGroup);
