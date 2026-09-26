import React, { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import globalStyles from "core/Styles/globalStyles";
import { Button, Badge } from "impact-ui-v3";
import { cloneDeep, isEmpty } from "lodash";
import Loader from "core/Utils/Loader/loader";
import EmptyStateWrapper from "core/commonComponents/coreComponentScreen/EmptyStateWrapper";
import { Divider, Typography } from "@mui/material";
import { makeStyles } from "@mui/styles";
import {
  ERROR_MESSAGE,
  TENANT_LOCALE,
  SEND_FOR_APPROVAL,
} from "modules/oms/constants-oms/stringConstants";
import {
  getOffCycleApprovalFlowColumnConfig,
  getOffCycleApprovalFlowTableData,
  approveOffCycleOrders,
  setOffCycleApprovalFlowTableDataLoader,
} from "modules/oms/services-oms/Create-New-Order/off-cycle-order-service";

const useStyles = makeStyles((theme) => ({
  tableHeaderContainer: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
  },
  gridTitle: {
    fontWeight: 700,
    fontSize: "14px",
    lineHeight: "16px",
  },
  totalOrderQtyContainer: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  totalOrderQtyLabel: {
    fontWeight: 500,
    fontSize: "12px",
    lineHeight: "16px",
  },
}));

const OffCycleApprovalFlowTable = ({
  displaySnackMessages,
  draftId,
  selectedDC,
  selectedArticles,
  deepDiveFilters,
  getCheckConfigurationForProductDetails,
  onCancel,
  ...props
}) => {
  const globalClasses = globalStyles();
  const classes = useStyles();

  const [tableColumns, setTableColumns] = useState([]);
  const tableGridInstance = useRef(null);
  const [renderGrid, setRenderGrid] = useState(false);
  const [rowCount, setRowCount] = useState(0);
  const [totalOrderQty, setTotalOrderQty] = useState(null);
  const [refreshTable, setRefreshTable] = useState(false);
  const prevDeepDiveFiltersRef = useRef(null);
  const deepDiveFiltersRef = useRef(deepDiveFilters);

  const generateUniqueId = () => {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Fetch column config on mount
  useEffect(() => {
    const fetchColumnConfig = async () => {
      try {
        setRenderGrid(false);
        let cols = await props?.getOffCycleApprovalFlowColumnConfig();
        let formattedColumns = agGridColumnFormatter(
          cols?.data?.data,
          null,
          null,
          null,
          null,
          null,
          null,
          true
        );

        formattedColumns = formattedColumns.map((col) => {
          try {
            if (col.extra?.is_grouping_key) {
              col.cellRenderer = "agGroupCellRenderer";
              if (col.type === "str") {
                col.rowGroup = true;
                col.isEditable = false;
              }
            }

            if (col.column_name === "size") {
              col.cellRenderer = (params, extraProps) => {
                try {
                  if (params.node.level === 0) {
                    return "";
                  } else {
                    return params.value || "-";
                  }
                } catch (error) {
                  console.error("Error in size column renderer:", error);
                  return params.value || "-";
                }
              };
            }

            return col;
          } catch (error) {
            console.error("Error formatting column:", col, error);
            return col;
          }
        });

        setTableColumns(formattedColumns);
      } catch (error) {
        displaySnackMessages(ERROR_MESSAGE, "error");
        setRenderGrid(false);
      }
    };
    fetchColumnConfig();
  }, [selectedDC]);

  // Refresh grid when refreshTable changes
  useEffect(() => {
    const fetchColumnConfig = async () => {
      try {
        setRenderGrid(false);
        setRefreshTable(false);
        let cols = await props?.getOffCycleApprovalFlowColumnConfig();
        let formattedColumns = agGridColumnFormatter(
          cols?.data?.data,
          null,
          null,
          null,
          null,
          null,
          null,
          true
        );

        formattedColumns = formattedColumns.map((col) => {
          try {
            if (col.extra?.is_grouping_key) {
              col.cellRenderer = "agGroupCellRenderer";
              if (col.type === "str") {
                col.rowGroup = true;
                col.isEditable = false;
              }
            }
            if (col.column_name === "size") {
              col.cellRenderer = (params, extraProps) => {
                try {
                  if (params.node.level === 0) {
                    return "";
                  } else {
                    return params.value || "-";
                  }
                } catch (error) {
                  console.error("Error in size column renderer:", error);
                  return params.value || "-";
                }
              };
            }

            return col;
          } catch (error) {
            console.error("Error formatting column:", col, error);
            return col;
          }
        });
        setTableColumns(formattedColumns);
      } catch (error) {
        displaySnackMessages(ERROR_MESSAGE, "error");
        setRenderGrid(false);
      }
    };
    if (refreshTable) fetchColumnConfig();
  }, [refreshTable]);

  // Render grid when table columns are fetched
  useEffect(() => {
    if (tableColumns.length > 0) {
      setRenderGrid(true);
    }
  }, [tableColumns]);

  // Keep ref updated with latest filters so createApprovalPayload always uses current values
  useEffect(() => {
    deepDiveFiltersRef.current = deepDiveFilters;
  }, [deepDiveFilters]);

  // Refresh table when deepDiveFilters change (e.g., when DC selection changes)
  useEffect(() => {
    if (
      prevDeepDiveFiltersRef.current !== null &&
      tableGridInstance.current?.api &&
      renderGrid
    ) {
      setTimeout(() => {
        if (tableGridInstance.current?.api) {
          tableGridInstance.current.api.refreshServerSideStore({ purge: true });
        }
      }, 0);
    }
    // Update ref to current filters for next comparison
    prevDeepDiveFiltersRef.current = deepDiveFilters;
  }, [deepDiveFilters, renderGrid]);

  const loadTableInstance = (params) => {
    tableGridInstance.current = params;
  };

  const createApprovalPayload = () => {
    try {
      const checkConfig = getCheckConfigurationForProductDetails
        ? getCheckConfigurationForProductDetails()
        : {};

      const currentFilters = deepDiveFiltersRef.current || deepDiveFilters || [];
      const appliedFilters = cloneDeep(currentFilters);
      const appliedDateFilters = [];

      // Adding the OMS Date filters to the filters
      if (!isEmpty(props?.ropDate)) {
        appliedDateFilters.push(props?.ropDate);
      }
      if (!isEmpty(props?.recommRecieptDate)) {
        appliedDateFilters.push(props?.recommRecieptDate);
      }
      // Adding the Deep Dive Date filters to the filters
      if (props?.weekRange?.attribute_name) {
        appliedDateFilters.push(props?.weekRange);
      }

      let payload = {
        draft_id: draftId,
        selected_articles: selectedArticles,
        filters: appliedFilters,
        ...checkConfig,
      };

      // Add date_filter if appliedDateFilters is present
      if (appliedDateFilters.length > 0) {
        payload.date_filter = appliedDateFilters;
      }

      return payload;
    } catch (error) {
      console.log("Error in creating Approval Payload", error);
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };

  const manualCallBack = async (manualbody, pageIndex, params) => {
    try {
      props.setOffCycleApprovalFlowTableDataLoader(true);
      let body = createApprovalPayload();
      body.meta = {
        ...manualbody,
        limit: { limit: 10, page: pageIndex + 1 },
      };

      let response = await props.getOffCycleApprovalFlowTableData(body);
      if (response?.data?.status) {
        const tableData = response?.data?.data?.data || response?.data?.data;
        let formatedData = agGridRowFormatter(tableData);

        formatedData = formatedData.map((row) => ({
          ...row,
          id: generateUniqueId(),
          status_obj:
            row.status_obj && row.status_obj.length > 0
              ? row.status_obj
              : undefined,
        }));

        setRowCount(formatedData.length);
        props.setOffCycleApprovalFlowTableDataLoader(false);
        setTotalOrderQty(response?.data?.data?.total_order_qty ?? 0);
        return {
          data: formatedData,
          totalCount: response.data.total || formatedData.length,
        };
      } else {
        setRowCount(0);
        props.setOffCycleApprovalFlowTableDataLoader(false);
        displaySnackMessages(response?.data?.message || ERROR_MESSAGE, "error");
        return { data: [], totalCount: 0 };
      }
    } catch (error) {
      displaySnackMessages(ERROR_MESSAGE, "error");
      props.setOffCycleApprovalFlowTableDataLoader(false);
      return { data: [], totalCount: 0 };
    }
  };

  const confirmApproval = async () => {
    try {
      let body = createApprovalPayload();
      body.screen = "offcycle_order";
      body.action = "Send_for_Approval_1";
      props.setOffCycleApprovalFlowTableDataLoader(true);

      const response = await props?.approveOffCycleOrders(body);
      if (response?.data?.status) {
        displaySnackMessages(
          `Order sent for approval successfully`,
          "success",
          8000
        );
        if (onCancel) {
          onCancel();
        }
      } else {
        displaySnackMessages(response?.data?.message || ERROR_MESSAGE, "error");
      }

      setRefreshTable(true);
    } catch (error) {
      setRefreshTable(true);
      displaySnackMessages(ERROR_MESSAGE, "error");
    } finally {
      props.setOffCycleApprovalFlowTableDataLoader(false);
    }
  };

  const getTopRightOptions = () => {
    let options = [];

    options.push(
      <Button
        id="sendApprovalButton"
        color="primary"
        variant="contained"
        disabled={rowCount === 0 || props.offCycleApprovalFlowTableDataLoader}
        onClick={() => confirmApproval()}
      >
        {SEND_FOR_APPROVAL}
      </Button>
    );

    return options;
  };

  const getTableHeader = () => {
    return (
      <div className={classes.tableHeaderContainer}>
        <Typography className={classes.gridTitle}>Products Details</Typography>

        {totalOrderQty !== null && totalOrderQty !== undefined ? (
          <>
            <Divider orientation="vertical" flexItem />
            <div className={classes.totalOrderQtyContainer}>
              <Typography className={classes.totalOrderQtyLabel}>
                Total Order Quantity:
              </Typography>
              <Badge
                label={totalOrderQty.toLocaleString(TENANT_LOCALE)}
                color="warning"
                size="default"
                variant="stroke"
              />
            </div>
          </>
        ) : null}
      </div>
    );
  };

  return (
    <div className={globalClasses.marginVertical1rem}>
      <Loader
        loader={!renderGrid || props.offCycleApprovalFlowTableDataLoader}
        minHeight={"260px"}
      >
        {renderGrid && (
          <>
            {tableColumns?.length > 0 ? (
              <AgGridComponent
                columns={tableColumns}
                manualCallBack={(body, pageIndex, params) =>
                  manualCallBack(body, pageIndex, params)
                }
                suppressClickEdit={true}
                selectAllHeaderComponent={false}
                hideSelectAllRecords={true}
                loadTableInstance={loadTableInstance}
                rowModelType="serverSide"
                serverSideStoreType="partial"
                cacheBlockSize={10}
                uniqueRowId={"unique_row_id"}
                pagination={true}
                tableHeader={getTableHeader()}
                topRightOptions={getTopRightOptions()}
                treeData={true}
                childKey={"status_obj"}
                groupDisplayType={"custom"}
              />
            ) : (
              <div className={globalClasses.centerAlign}>
                <EmptyStateWrapper />
              </div>
            )}
          </>
        )}
      </Loader>
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    offCycleApprovalFlowTableDataLoader:
      store.omsReducer.offCycleOrderService.offCycleApprovalFlowTableDataLoader,
    recommRecieptDate:
      store.omsReducer.offCycleOrderService.offCycleOrderRecommRecieptDate,
    ropDate: store.omsReducer.offCycleOrderService.offCycleOrderRopDate,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getOffCycleApprovalFlowColumnConfig: () =>
    dispatch(getOffCycleApprovalFlowColumnConfig()),
  getOffCycleApprovalFlowTableData: (payload) =>
    dispatch(getOffCycleApprovalFlowTableData(payload)),
  approveOffCycleOrders: (payload) => dispatch(approveOffCycleOrders(payload)),
  setOffCycleApprovalFlowTableDataLoader: (payload) =>
    dispatch(setOffCycleApprovalFlowTableDataLoader(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(OffCycleApprovalFlowTable);
