import { addSnack } from "core/actions/snackbarActions";
import { isEmpty } from "lodash";
import { useNavigate } from "react-router-dom-v5-compat";

import { CREATE_ALLOCATION } from "../../../constants-inventorysmart/routesConstants";
import {
  defaultTableData,
  DELETE_MESSAGE,
  DIALOG_CONFIRM_BTN_TEXT,
  DIALOG_REJECT_BTN_TEXT,
  DRAFT_FLOW,
  ERROR_MESSAGE,
  tableConfigurationMetaData,
  VIEW_PLANS_FILTER_EXCLUSION_LIST,
  INVENTORY_SUBMODULES_NAMES,
  CREATE_NEW_PLAN,
} from "../../../constants-inventorysmart/stringConstants";
import {
  getViewPlanTableConfiguration,
  getViewPlanTableData,
  setDashboardLoaderFullScreen,
  setViewPlanTableConfigLoader,
  setViewPlanTableData,
  setViewPlanTableLoader,
} from "../../../services-inventorysmart/Decision-Dashboard/decision-dashboard-services";
import { getDrafts } from "../../../services-inventorysmart/Finalize/store-view-services";
import { useEffect, useState, useRef } from "react";
import { connect } from "react-redux";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import { getSelectedRowsForInfiniteRowModel } from "core/Utils/agGrid/table-functions";
import Loader from "core/Utils/Loader/loader";
import { Delete, Search, Mode, DeleteOutline } from "@mui/icons-material";
import { Grid, Typography, ButtonBase, Box } from "@mui/material";
import globalStyles from "core/Styles/globalStyles";
import { useStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";
import { Button, Prompt, Tooltip } from "impact-ui-v3";
import EditActionButton from "modules/inventorysmart/components/ui-actions/EditActionButton";
import DeleteActionButton from "modules/inventorysmart/components/ui-actions/DeleteActionButton";

import {
  setArticleAgGridParams,
  setBackButtonClicked,
  setCreateAllocationArticles,
  setCreateAllocationFilterDetails,
  setDraftsResult,
  setInventorysmartCreateAllocationFilterDependency,
  setIsFiltersValid,
  setIsValidDraft,
  setSelectedFilters,
  setSelectedFiltersCreateAllocation,
  setShowInvalidDraftModal,
} from "../../../services-inventorysmart/Create-Allocation/create-allocation-services";

const ViewPlansTable = (props) => {
  const navigate = useNavigate();
  const classes = useStyles();
  const globalClasses = globalStyles();

  const [plansTableColumns, setPlansTableColumns] = useState([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedPlans, setSelectedPlans] = useState([]);
  const viewPlansGridInstance = useRef(null);

  useEffect(() => {
    const fetchColumnData = async () => {
      props.setViewPlanTableConfigLoader(true);
      let columns = await props.getViewPlanTableConfiguration();
      props.setViewPlanTableConfigLoader(false);
      let formattedColumns = agGridColumnFormatter(columns?.data?.data);
      setPlansTableColumns(formattedColumns);
      props.setRenderAgGrid(true);
    };
    fetchColumnData();
  }, [props.selectedFilters]);

  useEffect(() => {
    !isEmpty(props.selectedFilters) && props.setRenderAgGrid(false);
  }, [props.selectedFilters]);

  useEffect(() => {
    if (isEmpty(selectedPlans)) {
      props.setSelectedPlanIds([]);
    }
    if (!isEmpty(selectedPlans)) {
      let selectedPlanIds = selectedPlans.map((plan) => {
        return plan.plan_code;
      });
      props.setSelectedPlanIds(selectedPlanIds);
    }
  }, [selectedPlans]);

  const manualCallBack = async (manualbody, pageIndex, params) => {
    try {
      props.setViewPlanTableLoader(true);
      let tableColumnsToBeSentInDataRequest = plansTableColumns
        ?.filter((columnConfig) => !columnConfig?.extra?.ignore_in_api)
        ?.map((column) => {
          return {
            attribute_name: column.column_name,
            dimension: "Product",
            filter_type: "cascaded",
            operator: "in",
            values: [],
          };
        });

      // Not sending Sales filter, Product Channel Filter, and Product & Store Group Filters in View Plans
      const payloadFilters = props.selectedFilters.filter(
        (filter) =>
          VIEW_PLANS_FILTER_EXCLUSION_LIST.indexOf(filter.attribute_name) === -1
      );

      let body = {
        filters: [...payloadFilters, ...tableColumnsToBeSentInDataRequest],
        meta: manualbody
          ? {
              ...manualbody,
              limit: {
                limit: props.pageSize || 10,
                page: Number(pageIndex) ? pageIndex + 1 : 1,
              },
            }
          : {
              ...tableConfigurationMetaData.meta,
              limit: {
                limit: props.pageSize || 10,
                page: Number(pageIndex) ? pageIndex + 1 : 1,
              },
            },
      };
      let response = await props.getViewPlanTableData(body);
      if (response.data.status) {
        let formatedData = agGridRowFormatter(
          response.data.data,
          params?.api?.checkConfiguration,
          "plan_code"
        );
        props.setViewPlanTableData(formatedData);
        props.setViewPlanTableLoader(false);
        return { data: formatedData, totalCount: null };
      } else {
        const show_message = response?.data?.show_message;
        // show_message && displaySnackMessages( response.data.message , "success");
        props.setViewPlanTableLoader(false);
        return defaultTableData;
      }
    } catch (e) {
      // handleErrorMessage(e);
      props.setViewPlanTableLoader(false);
      return defaultTableData;
    }
  };

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const isEditDisabled = () => {
    return !props.isEditAllowed;
  };

  const isDeleteDisabled = () => {
    return !props.isDeleteAllowed;
  };

  const onDeleteClick = (p_rowData) => {
    setSelectedPlans([p_rowData]);
    setShowDeleteDialog(true);
  };

  const onEditClick = async (rowData) => {
    if (rowData.status === "Draft") {
      try {
        props.setDashboardLoaderFullScreen(true);
        let l_draftResponse = await props.getDrafts(rowData.plan_code);
        if (l_draftResponse.data.status) {
          let l_responseData = l_draftResponse?.data?.data;
          props.setDraftsResult(l_responseData);
          props.setInventorysmartCreateAllocationFilterDependency(
            l_responseData.filter_dependency
          );
          props.setCreateAllocationFilterDetails({
            ...props?.filterDashboardConfiguration,
          });
          props.setSelectedFiltersCreateAllocation({
            ...props?.selectedFiltersFromReducer,
          });
          props.setArticleAgGridParams({
            setAll: l_responseData.set_all,
            selection: l_responseData.selection,
            prevAction: l_responseData.prev_action,
            displayedAndHiddenCheckedRows:
              l_responseData.displayedAndHiddenCheckedRows,
          });
          props.setSelectedFilters(l_responseData.filters);
          props.setIsValidDraft(l_responseData.is_draft);
          props.setIsFiltersValid(false);
          props.setBackButtonClicked(true);
          props.setShowInvalidDraftModal(l_responseData.is_draft);
          props.setCreateAllocationArticles(
            l_responseData.createAllocationArticles
          );

          if (l_responseData?.poCode) {
            localStorage.setItem(
              "po_code",
              JSON.stringify(l_responseData?.poCode || null)
            );
          }

          if (l_responseData?.popupLink) {
            localStorage.setItem(
              "popupLink",
              JSON.stringify(l_responseData?.popupLink || null)
            );
          }

          if (l_responseData?.filteredSelection) {
            localStorage.setItem(
              "filtered_selection",
              JSON.stringify(l_responseData?.filteredSelection || null)
            );
          }

          setTimeout(() => {
            navigate(
              `${CREATE_ALLOCATION}?step=0&type=${DRAFT_FLOW}&allocation_code=${rowData.plan_code}`
            );
          }, 1000);
        }
      } catch (err) {
        handleErrorMessage(err);
      } finally {
        props.setDashboardLoaderFullScreen(false);
      }
    } else {
      localStorage.setItem(
        "createAllocationFilterDetails",
        JSON.stringify(props?.filterDashboardConfiguration || {})
      );
      localStorage.setItem(
        "selectedFiltersCreateAllocation",
        JSON.stringify(props?.selectedFiltersFromReducer || {})
      );

      window.open(
        `${CREATE_ALLOCATION}?step=2&allocation_code=${rowData.plan_code}&type=edit`,
        "_blank",
        "noopener,noreferrer"
      );
    }
  };

  const selectionsForRowModel = (params) => {
    const l_rowModelType = params.api.getModel().getType();
    if (l_rowModelType == "infinite") {
      return getSelectedRowsForInfiniteRowModel(params);
    } else {
      return params.api.getSelectedRows();
    }
  };

  const onSelectionChanged = (event) => {
    // fetch all selected rows
    let selections = selectionsForRowModel(event);
    setSelectedPlans(selections);
  };

  const confirmDelete = () => {
    setShowDeleteDialog(false);
    props.confirmDeletePlans(setSelectedPlans);
  };

  const getDeleteMessage = (p_msg = "") => {
    return `${DELETE_MESSAGE} ${p_msg}`;
  };

  const viewPlansTableInstance = (params) => {
    viewPlansGridInstance.current = params;
  };

  const handleErrorMessage = (e) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message) displaySnackMessages(errObj?.message, "error");
    else displaySnackMessages(ERROR_MESSAGE, "error");
    props?.setViewPlanTableLoader(false);
  };

  const handleNewPlanCreation = () => {
    navigate(`${CREATE_ALLOCATION}?step=0`);
  };
  const allowToolbar = () => {
    if (viewPlansGridInstance?.current?.api) {
      let totalRows = viewPlansGridInstance?.current?.api
        ?.getRenderedNodes()
        ?.map((item) => item.data);

      if (totalRows?.length === 0) {
        return false;
      }
      if (totalRows?.length === 1 && !totalRows?.[0]) {
        return false;
      }
    }
    if (selectedPlans.length !== 0) {
      return true;
    } else {
      return false;
    }
  };
  const topRightOptions = () => {
    let options = [];
    if (allowToolbar()) {
      if (selectedPlans.length == 1) {
        options.push(
          <EditActionButton
            key="edit-plan"
            size="large"
            onClick={() => onEditClick(selectedPlans[0])}
          />
        );
      }
      options.push(
        <DeleteActionButton
          key="delete-plan"
          size="large"
          onClick={() => {
            props.onDeleteSelectedPlans(setSelectedPlans);
          }}
        />
      );
    }
    if (
      !props?.inventorysmartScreenConfig?.dashboard
        ?.hideCreateNewAllocationButton
    ) {
      options.push(
        <Button
          variant="primary"
          id="create-new-plan"
          // className={classes.button}
          onClick={() => handleNewPlanCreation()}
          size="large"
          disabled={
            !props.canTakeActionOnModules(
              INVENTORY_SUBMODULES_NAMES.INVENTORY_DASHBOARD_VIEW_PLANS,
              "create"
            )
          }
        >
          {CREATE_NEW_PLAN}
        </Button>
      );
    }
    return options;
  };
  return (
    <>
      <Prompt
        isOpen={showDeleteDialog}
        title="Delete Selected Allocation Plan"
        onPrimaryButtonClick={() => {
          confirmDelete();
          setShowDeleteDialog(false);
        }}
        onSecondaryButtonClick={() => setShowDeleteDialog(false)}
        variant="error"
        primaryButtonLabel={DIALOG_CONFIRM_BTN_TEXT}
        secondaryButtonLabel={DIALOG_REJECT_BTN_TEXT}
        handleClose={() => setShowDeleteDialog(false)}
      >
        {getDeleteMessage("the selected allocation Plan?")}
      </Prompt>
      <Loader
        loader={
          props.viewPlanLoader ||
          props.viewPlanTableConfigLoader ||
          props.inventorysmartDeletePlanLoader
        }
      >
        {props.renderAgGrid && (
          <AgGridComponent
            tableHeader={props?.tableHeader}
            topRightOptions={topRightOptions()}
            columns={plansTableColumns}
            manualCallBack={(body, pageIndex, params) =>
              manualCallBack(body, pageIndex, params)
            }
            selectAllHeaderComponent={true}
            onSelectionChanged={onSelectionChanged}
            {...(props.inventorysmartScreenConfigForInfiniteScrolling?.includes(
              "dashboard"
            )
              ? {
                  pagination: false,
                  rowModelType: "infinite",
                  cacheOverflowSize: 2,
                  hideSelectCurrentPageRecords: true,
                }
              : { rowModelType: "serverSide", serverSideStoreType: "partial" })}
            rowSelection="multiple"
            onRowSelected
            onEditClick={(tableInfo) => onEditClick(tableInfo.data)}
            callDeleteApi={(tableInfo) => onDeleteClick(tableInfo.data)}
            isEditDisabled={isEditDisabled}
            isDeleteDisabled={isDeleteDisabled}
            loadTableInstance={viewPlansTableInstance}
            totalCount={props.viewPlansTableData.total} // to set the total count once received from BE
            cacheBlockSize={props.pageSize || 10}
            uniqueRowId={"plan_code"}
            paginationPageSize={props.pageSize}
            loader={
              props.viewPlanLoader ||
              props.viewPlanTableConfigLoader ||
              props.inventorysmartDeletePlanLoader
            }
          />
        )}
      </Loader>
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    inventorysmartScreenConfigForInfiniteScrolling:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfigForInfiniteScrolling,
    inventorysmartDeletePlanLoader:
      store.inventorysmartReducer.inventorySmartDashboardService
        .inventorysmartDeletePlanLoader,
    viewPlanLoader:
      store.inventorysmartReducer.inventorySmartDashboardService.viewPlanLoader,
    viewPlanTableConfigLoader:
      store.inventorysmartReducer.inventorySmartDashboardService
        .viewPlanTableConfigLoader,
    fetchViewPlansData:
      store.inventorysmartReducer.inventorySmartDashboardService
        .fetchViewPlansData,
    selectedFilters:
      store.inventorysmartReducer.inventorySmartDashboardService
        .selectedFilters,
    viewPlansTableData:
      store.inventorysmartReducer.inventorySmartDashboardService
        .viewPlansTableData,
    pageSize:
      store.inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.inventorysmart_page_count,
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    filterDashboardConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        "decisionDashboardFilterConfiguration"
      ],
    selectedFiltersFromReducer: store.filterReducer.selectedFilters,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getViewPlanTableConfiguration: (payload) =>
    dispatch(getViewPlanTableConfiguration(payload)),
  getViewPlanTableData: (payload) => dispatch(getViewPlanTableData(payload)),
  setViewPlanTableLoader: (payload) =>
    dispatch(setViewPlanTableLoader(payload)),
  setViewPlanTableConfigLoader: (payload) =>
    dispatch(setViewPlanTableConfigLoader(payload)),
  setViewPlanTableData: (payload) => dispatch(setViewPlanTableData(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  getDrafts: (payload) => dispatch(getDrafts(payload)),
  setBackButtonClicked: (payload) => dispatch(setBackButtonClicked(payload)),
  setIsFiltersValid: (payload) => dispatch(setIsFiltersValid(payload)),
  setSelectedFilters: (payload) => dispatch(setSelectedFilters(payload)),
  setIsValidDraft: (payload) => dispatch(setIsValidDraft(payload)),
  setInventorysmartCreateAllocationFilterDependency: (payload) =>
    dispatch(setInventorysmartCreateAllocationFilterDependency(payload)),
  setArticleAgGridParams: (payload) =>
    dispatch(setArticleAgGridParams(payload)),
  setShowInvalidDraftModal: (payload) =>
    dispatch(setShowInvalidDraftModal(payload)),
  setDraftsResult: (payload) => dispatch(setDraftsResult(payload)),
  setDashboardLoaderFullScreen: (payload) =>
    dispatch(setDashboardLoaderFullScreen(payload)),
  setCreateAllocationArticles: (payload) =>
    dispatch(setCreateAllocationArticles(payload)),
  setCreateAllocationFilterDetails: (payload) =>
    dispatch(setCreateAllocationFilterDetails(payload)),
  setSelectedFiltersCreateAllocation: (payload) =>
    dispatch(setSelectedFiltersCreateAllocation(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(ViewPlansTable);
