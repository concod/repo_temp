import React, { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { addSnack, closeSnack } from "core/actions/snackbarActions";
import AgGridComponent from "core/Utils/agGrid";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import globalStyles from "core/Styles/globalStyles";
import { Typography } from "@mui/material";
import { Button } from "impact-ui-v3";
import { cloneDeep } from "lodash";
import {
  ERROR_MESSAGE,
  defaultTableData,
} from "modules/oms/constants-oms/stringConstants";
import {
  fetchPORebalanceSizeChoiceTableFields,
  fetchPORebalanceSizeChoiceTableData,
  setPoRebalanceTableFieldsLoader,
  setPoRebalanceSubClassTableDataLoader,
} from "modules/oms/services-oms/PO-Rebalance/po-rebalance-service";
import { SIZE_CHOICE_TABLE_PAYLOAD } from "./constants";
import { UPPER_HIERARCHY_TOTAL_METRICS } from "./constants";

const PoRebalanceSizeChoiceTable = (props) => {
  const globalClasses = globalStyles();
  const classes = useStyles();
  const [
    styleOrderSummarySubClassTableColumns,
    setStyleOrderSummarySubClassTableColumns,
  ] = useState([]);

  const [render, setRender] = useState(false);

  const containerRef = useRef(null);

  const styleOrderSubClassTableGridInstance = useRef(null);

  const fiscalWeekId = props?.xAxisStaticDates;

  const hierarchyDescKey =
    props.omsScreenConfig?.hierarchy_desc_key ?? "l6_name";

  const replaceAggrColumnKey = props.omsScreenConfig?.aggr_column_key ?? "size";

  const createCustomTableMeta = (manualbody) => {
    return {
      ...manualbody,
      sort: Array.isArray(manualbody?.sort)
        ? manualbody.sort.map((sortItem) =>
            sortItem?.column === "aggr_column"
              ? { ...sortItem, column: replaceAggrColumnKey }
              : sortItem
          )
        : manualbody?.sort,
    };
  };

  useEffect(() => {
    if (!props.selectedSubClass) return;
    const id = window.requestAnimationFrame(() => {
      containerRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
    return () => window.cancelAnimationFrame(id);
  }, [props.selectedSubClass]);

  const manualCallBack = async (manualbody, pageIndex, params) => {
    try {
      props.setPoRebalanceTableFieldsLoader(true);
      const customManualBody = createCustomTableMeta(manualbody);

      let body = {
        choice: props.selectedSubClass.aggr_column,
        meta: {
          ...customManualBody,
          limit: {
            limit: props?.omsScreenConfig?.page_limit || 10,
            page: pageIndex + 1,
          },
        },
        filters: props.filters,
      };

      let response = await props.fetchPORebalanceSizeChoiceTableData(body);
      if (response.data.status) {
        console.log("response", fiscalWeekId);
        const transformedData = response.data.data.map((item) => {
          const { size, status } = item;
          //    const channel = status[0].channel;
          // Transform each status object to include fiscal_week

          const transformedStatusObj = status.map((statusItem) => {
            const { channel, ...weeks } = statusItem;
            // Calculate totals for each metric across weeks
            // Calculate totals for each metric across weeks for this channel
            const channelTotals = Object.keys(weeks).reduce((acc, weekKey) => {
              Object.keys(weeks[weekKey]).forEach((metric) => {
                if (!acc[metric]) acc[metric] = 0;
                acc[metric] += parseFloat(weeks[weekKey][metric]) || 0;
              });
              return acc;
            }, {});

            // Flatten the weeks data
            const flattenedWeeks = Object.entries(weeks).reduce(
              (acc, [weekId, metrics]) => {
                Object.entries(metrics).forEach(([metric, value]) => {
                  acc[`${metric}_${weekId}`] = value;
                });
                return acc;
              },
              {}
            );

            return {
              ...flattenedWeeks,
              channel,
              ...Object.entries(channelTotals).reduce(
                (acc, [metric, value]) => {
                  acc[`total_${metric}`] = value;
                  return acc;
                },
                {}
              ),
            };
          });

          // Calculate upper hierarchy totals (sum across all channels)
          const upperHierarchyTotals = transformedStatusObj.reduce(
            (acc, channelData) => {
              // Track count for averaging
              if (!acc._channelCount) acc._channelCount = 0;
              acc._channelCount++;
              // Sum up weekly metrics
              Object.entries(channelData).forEach(([key, value]) => {
                if (key !== "channel") {
                  // Convert null to 0 and ensure value is treated as a number
                  const numericValue = value === null ? 0 : Number(value);
                  if (!isNaN(numericValue)) {
                    // Check if this metric should be averaged
                    // Handle both week-specific keys (e.g., "Last_4_week_stock_sales_202547")
                    // and total keys (e.g., "total_Last_4_week_stock_sales")
                    const shouldAverage = UPPER_HIERARCHY_TOTAL_METRICS.some(
                      (prefix) => {
                        // Check if key starts with prefix (for week-specific keys)
                        if (key.startsWith(prefix)) {
                          return true;
                        }
                        // Check if it's a total_ key and the metric after "total_" starts with prefix
                        if (key.startsWith("total_")) {
                          const metricName = key.replace("total_", "");
                          return metricName.startsWith(prefix);
                        }
                        return false;
                      }
                    );

                    if (shouldAverage) {
                      // Initialize count and sum if this is the first time we see this key
                      if (acc[`${key}_count`] === undefined) {
                        acc[`${key}_count`] = 0;
                        acc[`${key}_sum`] = 0;
                      }
                      // Increment count and add to sum
                      acc[`${key}_count`] += 1;
                      acc[`${key}_sum`] += numericValue;
                      // Calculate average: sum / count
                      acc[key] = acc[`${key}_sum`] / acc[`${key}_count`];
                    } else {
                      // For non-upper hierarchy metrics, sum the values
                      if (!acc[key]) acc[key] = 0;
                      acc[key] += numericValue;
                    }
                  }
                }
              });
              return acc;
            },
            {}
          );

          // Clean up temporary count and sum keys used for averaging
          Object.keys(upperHierarchyTotals).forEach((key) => {
            if (key.endsWith("_count") || key.endsWith("_sum")) {
              delete upperHierarchyTotals[key];
            }
          });
          delete upperHierarchyTotals._channelCount;

          // Push totals into the upper hierarchy of status_obj
          return {
            aggr_column: size,
            ...upperHierarchyTotals,
            status_obj: transformedStatusObj,
            ...item,
          };
        });
        console.log("transformedData", transformedData);
        let formatedData = agGridRowFormatter(transformedData);
        console.log("response", formatedData, formatedData.length);
        return { data: formatedData, totalCount: formatedData.length };
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");
        return defaultTableData;
      }
    } catch (err) {
      console.log("error", err);
      displaySnackMessages(ERROR_MESSAGE, "error");
      return defaultTableData;
    } finally {
      props.setPoRebalanceTableFieldsLoader(false);
    }
  };

  const loadTableInstance = (params) => {
    styleOrderSubClassTableGridInstance.current = params;
  };

  const displaySnackMessages = (
    message,
    variance,
    disableOnClose = false,
    autoHideDuration = 1000
  ) => {
    props.closeSnack();
    props.addSnack({
      message: message,
      options: {
        variant: variance,
        disableOnClose: disableOnClose,
        autoHideDuration: autoHideDuration,
      },
    });
  };

  const cleanFilters = (filters) => {
    if (!Array.isArray(filters)) return [];
    return filters.filter(
      (filter) =>
        filter.values &&
        Array.isArray(filter.values) &&
        filter.values.length > 0
    );
  };

  const checkForEditability = (columnsDef) => {
    try {
      let updatedColumnsDef = cloneDeep(columnsDef);
      console.log("updatedColumnsDef", updatedColumnsDef);
      updatedColumnsDef = updatedColumnsDef.map((item) => {
        if (item.extra?.is_grouping_key) {
          item.cellRenderer = "agGroupCellRenderer";
          if (item.type === "str") {
            item.rowGroup = true;
            item.isEditable = false;
          }
        }
        // Add styling for nested Excess_Deficit columns
        if (item.children && item.children.length > 0) {
          item.children = item.children.map((child) => {
            if (/Excess_Deficit_\d+/.test(child.field)) {
              return {
                ...child,
                cellStyle: (params) => {
                  if (params.value < 0) {
                    return { backgroundColor: "#ffebee" }; // Light red background
                  }
                  return null;
                },
                extra: {
                  ...child.extra,
                },
              };
            }
            return {
              ...child,
              extra: {
                ...child.extra,
                columnGroupShow: "open",
                enableColumnExpand: true,
              },
            };
          });
        }
        return item;
      });
      return updatedColumnsDef;
    } catch (err) {
      console.log("error", err);
      //displaySnackMessages("Something went wrong", "error");
      return [];
    }
  };

  const updateResponse = async (data) => {
    try {
      const fetchColumnConfig = async () => {
        try {
          props.setPoRebalanceSubClassTableDataLoader(true);

          const payload = {
            ...SIZE_CHOICE_TABLE_PAYLOAD,
            module: "Size",
            start_week_id: props.startWeekId,
            end_week_id: props.endWeekId,
            filters: cleanFilters(props.filters),
          };

          let columns = await props.fetchPORebalanceSizeChoiceTableFields(
            payload
          );

          if (columns?.data?.status) {
            let columnsData = columns?.data?.data;

            const modifiedColumns = columnsData.map((column) => {
              if (column.column_name === "aggr_column") {
                return {
                  ...column,
                  type: "str",
                  extra: { is_grouping_key: true },
                };
              }
              column.sub_headers.forEach((subHeader) => {
                subHeader.is_aggregated = true;
                subHeader.aggregate_type = "sum";
              });
              return column;
            });
            console.log("response", modifiedColumns);
            let formattedColumns = agGridColumnFormatter(
              modifiedColumns,
              null,
              null,
              null,
              null,
              null,
              null,
              true
            );
            let updatedResponse = checkForEditability(formattedColumns);
            setStyleOrderSummarySubClassTableColumns(updatedResponse);
          }
        } catch (err) {
          console.log("error", err);
          displaySnackMessages(ERROR_MESSAGE, "error");
          props.setPoRebalanceSubClassTableDataLoader(false);
        } finally {
          setRender(true);
          props.setPoRebalanceSubClassTableDataLoader(false);
        }
      };
      fetchColumnConfig();
    } catch (err) {
      console.log("error", err);
    }
  };

  useEffect(() => {
    setRender(false);
    updateResponse();
  }, [props.selectedSubClass, props.startWeekId, props.endWeekId]);

  const getTopLeftOptions = () => {
    let options = [];
    options.push(
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <Typography>
          {props?.omsScreenConfig?.hierarchy_label || "Choice"} :
        </Typography>
        <Typography style={{ fontWeight: "bold" }}>
          {replaceSpecialCharacter(props.selectedSubClass.aggr_column)}
        </Typography>
      </div>
    );
    options.push(
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <Typography>
          {props?.omsScreenConfig?.hierarchy_label || "Choice"} Description:
        </Typography>
        <Typography style={{ fontWeight: "bold" }}>
          {replaceSpecialCharacter(props.selectedSubClass?.[hierarchyDescKey])}
        </Typography>
      </div>
    );
    return options;
  };

  return (
    <div ref={containerRef} className={globalClasses.marginVertical2rem}>
      <div className={globalClasses.marginVertical2rem}>
        <Loader
          loader={
            props.poRebalanceTableFieldsLoader ||
            props.poRebalanceSubClassTableDataLoader
          }
          minHeight={"260px"}
        >
          {render && (
            <AgGridComponent
              columns={styleOrderSummarySubClassTableColumns}
              manualCallBack={manualCallBack}
              loadTableInstance={loadTableInstance}
              rowModelType="serverSide"
              serverSideStoreType="partial"
              onRowSelected
              disablePaginationForSinglePage={true}
              cacheBlockSize={props?.omsScreenConfig?.page_limit || 10}
              uniqueRowId={"aggr_column"}
              pagination={true}
              suppressClickEdit={true}
              hideChildSelection={true}
              showSetAll={false}
              purgeClosedRowNodes={true}
              suppressAggFuncInHeader={true}
              groupDisplayType={"custom"}
              treeData={true}
              childKey={"status_obj"}
              topLeftOptions={getTopLeftOptions()}
              tableHeader=""
              closeButton={true}
              handleCloseButtonClick={() => props.setSelectedSubClass(null)}
            />
          )}
        </Loader>
      </div>
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    poRebalanceSubClassTableDataLoader:
      store.omsReducer?.poRebalanceService.poRebalanceSubClassTableDataLoader,
    xAxisStaticDates: store.omsReducer?.poRebalanceService.xAxisStaticDates,
    omsScreenConfig:
      store.omsReducer.orderingCommonService?.orderingScreensConfig
        ?.po_rebalance,
  };
};

const mapDispatchToProps = (dispatch) => ({
  fetchPORebalanceSizeChoiceTableFields: (payload) =>
    dispatch(fetchPORebalanceSizeChoiceTableFields(payload)),
  fetchPORebalanceSizeChoiceTableData: (payload) =>
    dispatch(fetchPORebalanceSizeChoiceTableData(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  closeSnack: (payload) => dispatch(closeSnack(payload)),
  setPoRebalanceTableFieldsLoader: (payload) =>
    dispatch(setPoRebalanceTableFieldsLoader(payload)),
  setPoRebalanceSubClassTableDataLoader: (payload) =>
    dispatch(setPoRebalanceSubClassTableDataLoader(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(PoRebalanceSizeChoiceTable);
