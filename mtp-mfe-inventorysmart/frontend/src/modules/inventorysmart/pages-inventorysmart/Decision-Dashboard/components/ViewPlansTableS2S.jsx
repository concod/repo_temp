import { addSnack } from "core/actions/snackbarActions";
import { isEmpty } from "lodash";
import { useNavigate } from "react-router-dom-v5-compat";
import { makeStyles } from "@mui/styles";
import colours from "core/Styles/colours";
import {
  ERROR_MESSAGE,
  VIEW_PLANS_FILTER_EXCLUSION_LIST,
} from "../../../constants-inventorysmart/stringConstants";
import {
  getViewPlanTableConfiguration,
  getViewPlanTableData,
  getViewPlanTableConfigurationS2S,
  deleteViewPlanS2S,
  getViewPlanTableDataS2S,
  setDashboardLoaderFullScreen,
  setInventorysmartDeletePlanLoader,
  setViewPlanTableConfigLoader,
  setViewPlanTableData,
  setViewPlanTableDataS2S,
  setViewPlanTableLoader,
} from "../../../services-inventorysmart/Decision-Dashboard/decision-dashboard-services";
import { getDrafts } from "../../../services-inventorysmart/Finalize/store-view-services";
import { useEffect, useState, useRef } from "react";
import { connect } from "react-redux";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import { Prompt, useTranslation } from "impact-ui-v3";
import EditActionButton from "modules/inventorysmart/components/ui-actions/EditActionButton";
import DeleteActionButton from "modules/inventorysmart/components/ui-actions/DeleteActionButton";
import ViewActionButton from "modules/inventorysmart/components/ui-actions/ViewActionButton";
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
import { getReviewStatusCellRenderer } from "../../Create-Transfer-Recommendations-S2S/components/transferUnitsUtils";
import { tagCellRenderer } from "../../Create-Transfer-Recommendations-S2S/components/TagCellRenderer";
import { setS2SFiltersFromS2S } from "modules/inventorysmart/services-inventorysmart/Order-Batching/order-batching-s2s-services";

const viewPlanS2SStyles = makeStyles(() => ({
  tableContainer: {
    "& .s2s-review-badge-container": {
      height: "100%",
      display: "flex",
      alignItems: "center",
      "& .s2s-review-badge": {
        padding: "2px 8px",
        gap: "10px",
        borderRadius: "1000px",
        border: "1px solid",
        background: colours.white,
        fontFamily: "Manrope",
        fontSize: "14px",
        fontWeight: 500,
        lineHeight: "20px",
        height: "24px",
        width: "fit-content",
      },
    },
  },
}));

const ViewPlansTableS2S = (props) => {
  const navigate = useNavigate();
  const classes = viewPlanS2SStyles();
  const { t } = useTranslation();

  const [plansTableColumns, setPlansTableColumns] = useState([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedPlans, setSelectedPlans] = useState([]);
  const [selectedApprovedPlans, setSelectedApprovedPlans] = useState(0);
  const viewPlansGridInstance = useRef(null);

  const addCellRenderer = (columns) => {
    return columns.map((column) => {
      if (column.sub_headers && column.sub_headers.length) {
        const nested = addCellRenderer(column.sub_headers);
        column.sub_headers = nested;
        column.children = nested;
      }

      if (column.column_name === "review_status_label") {
        return getReviewStatusCellRenderer(column);
      }

      if (column.column_name === "article") {
        return tagCellRenderer(column, {
          columnName: "article",
          dataKey: "article",
          visibleCount: 3,
          width: 300,
        });
      }

      return column;
    });
  };

  useEffect(() => {
    const fetchColumnData = async () => {
      props.setViewPlanTableConfigLoader(true);
      let columns = await props.getViewPlanTableConfigurationS2S();
      props.setViewPlanTableConfigLoader(false);
      let formattedColumns = agGridColumnFormatter(columns?.data?.data);
      formattedColumns = addCellRenderer(formattedColumns);
      setPlansTableColumns(formattedColumns);
      props.setRenderAgGrid(true);
    };
    fetchColumnData();
  }, [props.selectedFilters]);

  useEffect(() => {
    !isEmpty(props.selectedFilters) && props.setRenderAgGrid(false);
  }, [props.selectedFilters]);

  const fetchTableData = async () => {
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
      };
      let response = await props.getViewPlanTableDataS2S(body);
      if (response.data.status) {
        let formatedData = response.data.data;
        props.setViewPlanTableDataS2S(formatedData);
      }
    } catch (e) {
      handleErrorMessage(e);
    } finally {
      props.setViewPlanTableLoader(false);
    }
  };

  useEffect(() => {
    fetchTableData();
  }, [props.selectedFilters]);

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const onDeleteClick = (plans) => {
    const selectedApprovedPlansCount = plans.filter(
      (plan) => plan.review_status_label.toLowerCase() === "approved"
    ).length;
    setSelectedApprovedPlans(selectedApprovedPlansCount);
    setShowDeleteDialog(true);
  };

  const onHandleActionClick = async (rowData, type) => {
    if (rowData.review_status_label?.toLowerCase() === "created") {
      navigate(
        `/inventory-smart/create-store-transfer?step=1&allocation_code=${rowData.plan_code}&type=${type}`
      );
    } else if (rowData.review_status_label?.toLowerCase() === "approved") {
      navigate(
        `/inventory-smart/view-past-allocations?tab=store_to_store&allocation_code=${rowData.plan_code}`
      );
    } else if (
      rowData.review_status_label?.toLowerCase() === "moved to order batching" ||
      rowData.review_status_label?.toLowerCase() === "moved to allocation batching"
    ) {
      navigate(
        `/inventory-smart/order-batching?tab=store_to_store&allocation_code=${rowData.plan_code}&type=${type}`
      );
      props.setS2SFiltersFromS2S(props.selectedFilters);
    }
  };

  const onSelectionChanged = (event) => {
    // fetch all selected rows
    let selections = event.api.getSelectedRows();
    setSelectedPlans(selections);
  };

  const confirmDelete = async () => {
    setShowDeleteDialog(false);
    const deletions = selectedPlans
      .filter((plan) => plan.review_status_label.toLowerCase() !== "approved")
      .map((plan) => {
        const reviewStatus =
          plan.review_status_label.toLowerCase() === "created" ? 1 : 2;
        return {
          allocation_code: plan.plan_code,
          review_status: reviewStatus,
        };
      });

    if (isEmpty(deletions)) return;

    props.setInventorysmartDeletePlanLoader(true);
    try {
      let response = await props.deleteViewPlanS2S({ deletions });
      if (response?.data?.status) {
        displaySnackMessages("Successfully deleted plans", "success");
        setSelectedPlans([]);
        await fetchTableData();
      }
    } catch (err) {
      displaySnackMessages("Something went wrong on delete", "error");
    } finally {
      props.setInventorysmartDeletePlanLoader(false);
    }
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

  const topRightOptions = () => {
    let options = [];

    if (selectedPlans.length == 1) {
      if (selectedPlans[0].review_status_label !== "Approved") {
        options.push(
          <EditActionButton
            key="edit-plan"
            size="large"
            onClick={() => onHandleActionClick(selectedPlans[0], "edit")}
          />
        );
      }
      options.push(
        <ViewActionButton
          key="view-plan"
          size="large"
          onClick={() => onHandleActionClick(selectedPlans[0], "view")}
        />
      );
    }
    if (
      (selectedPlans.length === 1 &&
        selectedPlans[0].review_status_label !== "Approved") ||
      selectedPlans.length > 1
    ) {
      options.push(
        <DeleteActionButton
          key="delete-plan"
          size="large"
          onClick={() => onDeleteClick(selectedPlans)}
        />
      );
    }

    return options;
  };
  return (
    <div className={classes.tableContainer}>
      <Prompt
        isOpen={showDeleteDialog}
        title={`Delete ${selectedPlans.length - selectedApprovedPlans}/${
          selectedPlans.length
        } Selection?`}
        onPrimaryButtonClick={() => {
          confirmDelete();
          setShowDeleteDialog(false);
        }}
        onSecondaryButtonClick={() => {
          setShowDeleteDialog(false);
          setSelectedApprovedPlans(0);
        }}
        variant="error"
        primaryButtonLabel={`Delete ${
          selectedPlans.length - selectedApprovedPlans
        } Plans`}
        secondaryButtonLabel="Cancel"
        handleClose={() => setShowDeleteDialog(false)}
      >
        {`${t("inventorysmart.planDeleteWarning1")} ${
          selectedPlans.length - selectedApprovedPlans
        } ${t("inventorysmart.planDeleteWarning2")}`}
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
            rowdata={props.viewPlansTableData}
            selectAllHeaderComponent={true}
            onSelectionChanged={onSelectionChanged}
            pagination={false}
            rowSelection="single"
            adjustTableHeight={true}
            showCustomNoRowOverlay={false}
            loadTableInstance={viewPlansTableInstance}
            totalCount={props.viewPlansTableData.total} // to set the total count once received from BE
            uniqueRowId="key"
            loader={
              props.viewPlanLoader ||
              props.viewPlanTableConfigLoader ||
              props.inventorysmartDeletePlanLoader
            }
          />
        )}
      </Loader>
    </div>
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
        .viewPlansTableDataS2S,
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
  getViewPlanTableConfigurationS2S: (payload) =>
    dispatch(getViewPlanTableConfigurationS2S(payload)),
  getViewPlanTableDataS2S: (payload) =>
    dispatch(getViewPlanTableDataS2S(payload)),
  setViewPlanTableLoader: (payload) =>
    dispatch(setViewPlanTableLoader(payload)),
  setViewPlanTableConfigLoader: (payload) =>
    dispatch(setViewPlanTableConfigLoader(payload)),
  setViewPlanTableData: (payload) => dispatch(setViewPlanTableData(payload)),
  setViewPlanTableDataS2S: (payload) =>
    dispatch(setViewPlanTableDataS2S(payload)),
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
  deleteViewPlanS2S: (payload) => dispatch(deleteViewPlanS2S(payload)),
  setInventorysmartDeletePlanLoader: (payload) =>
    dispatch(setInventorysmartDeletePlanLoader(payload)),
  setS2SFiltersFromS2S: (payload) => dispatch(setS2SFiltersFromS2S(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(ViewPlansTableS2S);
