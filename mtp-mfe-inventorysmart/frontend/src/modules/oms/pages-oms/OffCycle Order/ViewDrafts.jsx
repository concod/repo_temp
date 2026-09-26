import React, { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { useLocation } from "react-router-dom-v5-compat";
import { Tabs, Button, Tooltip, Prompt } from "impact-ui-v3";
import DeleteIcon from "@mui/icons-material/Delete";
import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import globalStyles from "core/Styles/globalStyles";
import Loader from "core/Utils/Loader/loader";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import { displaySnackMessages } from "modules/oms/utils-oms/oms-utility";
import { addSnack, closeSnack } from "core/actions/snackbarActions";
import LoadingOverlay from "core/Utils/Loader/loader";
import {
  ERROR_MESSAGE,
  OFF_CYCLE_DRAFT_TABS,
} from "modules/oms/constants-oms/stringConstants";
import {
  CREATE_NEW_ORDER,
  OFF_CYCLE_ORDER_EXPEDITE_ORDERS,
} from "modules/oms/constants-oms/routeConstants";
import {
  getOffCycleViewDraftsTableConfiguration,
  getOffCycleViewDraftsData,
  discardOffCycleOrderDraft,
} from "modules/oms/services-oms/Create-New-Order/off-cycle-order-service";
import { getExpediteOrdersConfig } from "modules/oms/services-oms/Decision-Dashboard/expedite-order-service";
import DraftTypeCellRenderer from "./components/DraftTypeCellRenderer";

function ViewDrafts(props) {
  const globalClasses = globalStyles();
  const location = useLocation();

  const [tableConfigLoader, setTableConfigLoader] = useState(false);
  const [dataLoader, setDataLoader] = useState(false);
  const [tableColumns, setTableColumns] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [render, setRender] = useState(false);
  const [activeTab, setActiveTab] = useState(OFF_CYCLE_DRAFT_TABS[0].value);

  const [isChartVisualised, setIsChartVisualised] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteCount, setDeleteCount] = useState(0);

  const tableGridInstance = useRef(null);
  const activeViewTypeRef = useRef(undefined);
  const lastQueryRef = useRef({ filters: [], meta: {} });
  const deleteSelectionRef = useRef({
    isSelectAll: false,
    draftIds: [],
    excludedDraftIds: [],
  });

  const loadTableInstance = (instance) => {
    tableGridInstance.current = instance;
  };

  const uniqueRowId = "draft_id";

  // Expedite-originated drafts (is_expedite=true) open the new Before/After
  // expedite page; regular off-cycle drafts keep the step-1 wizard redirect.
  const isExpediteDraft = (row) =>
    row?.is_expedite_draft === true ||
    activeViewTypeRef.current === "expedite_off_cycle";

  const onClickColumn = async (data) => {
    const url = isExpediteDraft(data)
      ? `${OFF_CYCLE_ORDER_EXPEDITE_ORDERS}?draft_id=${data.draft_id}&tab=before`
      : `${CREATE_NEW_ORDER}?type=offcycle&step=1&draft_id=${data.draft_id}`;
    window.open(url, "_self", "noopener,noreferrer");
  };

  const handleTabChange = (_event, newValue) => {
    const tab = OFF_CYCLE_DRAFT_TABS.find((item) => item.value === newValue);
    activeViewTypeRef.current = tab?.view_type;
    setActiveTab(newValue);
    setSelectedRows([]);
    tableGridInstance.current?.api?.refreshServerSideStore({ purge: true });
  };

  const onSelectionChanged = (event) => {
    const rows = event?.api?.getSelectedRows?.() || [];
    setSelectedRows(rows);
  };

  const handleDeleteSelected = () => {
    const gridApi = tableGridInstance.current?.api;

    const isSelectAll = Boolean(gridApi?.isSelectAllRecords);

    let draftIds = [];
    let excludedDraftIds = [];
    if (isSelectAll) {
      const deselectedRows = gridApi?.getDeselectedRows?.() || [];
      excludedDraftIds = deselectedRows.map((row) => row?.draft_id);
    } else {
      draftIds = selectedRows.map((row) => row?.draft_id);
    }

    if (!isSelectAll && draftIds.length === 0) return;

    deleteSelectionRef.current = { isSelectAll, draftIds, excludedDraftIds };
    setDeleteCount(
      isSelectAll
        ? Math.max(totalCount - excludedDraftIds.length, 0)
        : draftIds.length
    );
    setShowDeleteDialog(true);
  };


  const getViewTypeFromRow = (row) => {
    if (row?.is_expedite_draft === true) return "expedite_off_cycle";
    if (row?.is_expedite_draft === false) return "manual_off_cycle";
    const draftType = (row?.draft_type || "").toLowerCase();
    if (draftType.includes("expedite")) return "expedite_off_cycle";
    if (draftType.includes("manual")) return "manual_off_cycle";
    return undefined;
  };

  const confirmDeleteSelected = async () => {
    const { isSelectAll, draftIds, excludedDraftIds } =
      deleteSelectionRef.current;
    if (!isSelectAll && draftIds.length === 0) return;
    try {
      setIsDeleting(true);
      const viewType =
        activeViewTypeRef.current || getViewTypeFromRow(selectedRows[0]);
      const payload = {
        is_select_all: isSelectAll,
        excluded_draft_id: excludedDraftIds,
        ...(viewType && { view_type: viewType }),
        draft_id: draftIds,
        filters: lastQueryRef.current?.filters || [],
        meta: lastQueryRef.current?.meta || {
          search: [],
          range: [],
          sort: [],
          limit: { limit: 10, page: 1 },
        },
      };
      const response = await props.discardOffCycleOrderDraft(payload);
      if (response?.data?.status) {
        displaySnackMessages("Draft(s) deleted successfully", "success", props);
        setSelectedRows([]);
        tableGridInstance.current?.api?.deselectAll?.();
        tableGridInstance.current?.api?.refreshServerSideStore({ purge: true });
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error", props);
      }
    } catch (error) {
      displaySnackMessages(ERROR_MESSAGE, "error", props);
      console.log("Error in deleting Drafts", error);
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  useEffect(() => {
    const fetchTableColumnData = async () => {
      try {
        setTableConfigLoader(true);
        const tableColResponse = await props.getTableConfiguration();
        if (tableColResponse?.data?.status) {
          let columns = tableColResponse?.data?.data?.map((item) => {
            if (item.column_name === "draft_name") {
              item.onClick = (tableInfo) => {
                onClickColumn(tableInfo?.cellData?.data || {});
              };
            }
            return item;
          });
          const formattedColumns = agGridColumnFormatter(
            columns,
            null,
            null,
            null,
            null,
            null,
            null,
            true
          );
          // Assign custom cell renderers AFTER formatting: agGridColumnFormatter
          // owns the cellRenderer property and would otherwise overwrite it.
          formattedColumns.forEach((col) => {
            if (col.column_name === "draft_type" || col.field === "draft_type") {
              col.cellRenderer = DraftTypeCellRenderer;
            }
          });
          setTableColumns(formattedColumns);
          setRender(true);
        }
      } catch (error) {
        console.log("Error in fetching View Drafts", error);
      } finally {
        setTableConfigLoader(false);
      }
    };

    fetchTableColumnData();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchChartVisualisationFlag = async () => {
      try {
        const config = await props.getExpediteOrdersConfig();
        if (!cancelled) {
          setIsChartVisualised(
            config?.expedite_orders?.is_chart_visualized === true
          );
        }
      } catch (error) {
        console.log("Error in fetching expedite orders config", error);
        if (!cancelled) setIsChartVisualised(false);
      }
    };
    fetchChartVisualisationFlag();
    return () => {
      cancelled = true;
    };
  }, []);

  const manualCallBack = async (manualbody, pageIndex) => {
    try {
      setDataLoader(true);
      const filters = location?.state?.filters?.filters || [];
      const meta = {
        ...manualbody,
        limit: { limit: 10, page: pageIndex + 1 },
      };
      const body = {
        filters: [...filters],
        ...(activeViewTypeRef.current && {
          view_type: activeViewTypeRef.current,
        }),
        meta,
      };
      lastQueryRef.current = { filters: [...filters], meta };
      let response = await props.getOffCycleViewDraftsData(body);
      if (response?.data?.status) {
        const tableData = response?.data?.data?.data || response?.data?.data;
        const formatedData = agGridRowFormatter(tableData);
        const count = response?.data?.total || formatedData.length;
        setTotalCount(count);
        return {
          data: formatedData,
          totalCount: count,
        };
      }
      setTotalCount(0);
      return { data: [], totalCount: 0 };
    } catch (error) {
      displaySnackMessages(ERROR_MESSAGE, "error");
      console.log("Error in fetching Drafts", error);
    } finally {
      setDataLoader(false);
    }
  };

  const breadCrumbOptions = [
    {
      label: "Home",
      to: "/home",
    },
    {
      label: "View Order Plan Drafts",
      id: 1,
    },
  ];


  const getTopRightOptions = () => {
    if (!isChartVisualised || selectedRows.length === 0) return null;
    return [
      <Tooltip title="Delete" key="delete-selected-drafts">
        <Button
          variant="secondary"
          color="primary"
          disabled={isDeleting}
          onClick={handleDeleteSelected}
          icon={<DeleteIcon fontSize="small" />}
        />
      </Tooltip>,
    ];
  };

  const tabNames = OFF_CYCLE_DRAFT_TABS.map((tab) => ({
    label: tab.label,
    value: tab.value,
    id: `off-cycle-draft-tab-${tab.value}`,
    "aria-controls": `off-cycle-draft-tabpanel-${tab.value}`,
  }));

  return (
    <div className={globalClasses.paddingAround}>
      <Prompt
        isOpen={showDeleteDialog}
        title="Delete Draft(s)"
        variant="error"
        handleClose={() => !isDeleting && setShowDeleteDialog(false)}
        onPrimaryButtonClick={confirmDeleteSelected}
        onSecondaryButtonClick={() => setShowDeleteDialog(false)}
        primaryButtonLabel="Yes, Delete"
        secondaryButtonLabel="Cancel"
        primaryButtonProps={{ disabled: isDeleting }}
      >
        {`Are you sure you want to delete ${deleteCount} selected draft${
          deleteCount === 1 ? "" : "s"
        }? This action cannot be undone.`}
      </Prompt>

      <div className={globalClasses.marginBottom}>
        <HeaderBreadCrumbs options={breadCrumbOptions} />
      </div>

      <Loader loader={tableConfigLoader || dataLoader} minHeight={"260px"}>
        {render ? (
          <>
            <div className={globalClasses.marginBottom}>
              <Tabs
                value={activeTab}
                onChange={handleTabChange}
                aria-label="off-cycle-draft-tabs"
                tabNames={tabNames}
                tabPanels={tabNames.map((tab) => (
                  <div key={tab.value} />
                ))}
              />
            </div>
            <AgGridComponent
              key={`${activeTab}-${isChartVisualised}`}
              tableHeader="Draft Details"
              pagination={true}
              height="500px"
              selectAllHeaderComponent={isChartVisualised}
              //hideSelectAllRecords={true}
              rowSelection="multiple"
              rowModelType="serverSide"
              serverSideStoreType="partial"
              cacheBlockSize={10}
              loadTableInstance={loadTableInstance}
              uniqueRowId={uniqueRowId}
              columns={tableColumns}
              manualCallBack={(body, pageIndex, params) =>
                manualCallBack(body, pageIndex, params)
              }
              totalCount={totalCount}
              {...(isChartVisualised && {
                onSelectionChanged,
                topRightOptions: getTopRightOptions(),
              })}
            />
          </>
        ) : (
          <LoadingOverlay loader={!render} />
        )}
      </Loader>
    </div>
  );
}

const mapStateToProps = (state) => {
  return {
    offCycleOrderTableData:
      state.omsReducer.offCycleOrderService.offCycleOrderTableData,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    getTableConfiguration: () =>
      dispatch(getOffCycleViewDraftsTableConfiguration()),
    getOffCycleViewDraftsData: (filters) =>
      dispatch(getOffCycleViewDraftsData(filters)),
    getExpediteOrdersConfig: () => dispatch(getExpediteOrdersConfig()),
    discardOffCycleOrderDraft: (payload) =>
      dispatch(discardOffCycleOrderDraft(payload)),
    addSnack: (payload) => dispatch(addSnack(payload)),
    closeSnack: (payload) => dispatch(closeSnack(payload)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(ViewDrafts);
