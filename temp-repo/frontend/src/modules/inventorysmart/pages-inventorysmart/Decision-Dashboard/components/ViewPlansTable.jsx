import { addSnack } from "core/actions/snackbarActions";
import { isEmpty } from "lodash";
import { useHistory } from "react-router-dom";

import { CREATE_ALLOCATION } from "modules/inventorysmart/constants-inventorysmart/routesConstants";
import {
  defaultTableData,
  DELETE_MESSAGE,
  DIALOG_CONFIRM_BTN_TEXT,
  DIALOG_REJECT_BTN_TEXT,
  DRAFT_FLOW,
  ERROR_MESSAGE,
  tableConfigurationMetaData,
  VIEW_PLANS_FILTER_EXCLUSION_LIST,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import {
  getViewPlanTableConfiguration,
  getViewPlanTableData,
  setDashboardLoaderFullScreen,
  setViewPlanTableConfigLoader,
  setViewPlanTableData,
  setViewPlanTableLoader,
} from "modules/inventorysmart/services-inventorysmart/Decision-Dashboard/decision-dashboard-services";
import { getDrafts } from "modules/inventorysmart/services-inventorysmart/Finalize/store-view-services";
import { useEffect, useState } from "react";
import { connect } from "react-redux";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import Loader from "core/Utils/Loader/loader";

import { Prompt } from "impact-ui";
import {
  setArticleAgGridParams,
  setBackButtonClicked,
  setDraftsResult,
  setInventorysmartCreateAllocationFilterDependency,
  setIsFiltersValid,
  setIsValidDraft,
  setSelectedFilters,
  setShowInvalidDraftModal,
} from "modules/inventorysmart/services-inventorysmart/Create-Allocation/create-allocation-services";

const ViewPlansTable = (props) => {
  const history = useHistory();

  const [plansTableColumns, setPlansTableColumns] = useState([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedPlans, setSelectedPlans] = useState([]);

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
              limit: { limit: 10, page: Number(pageIndex) ? pageIndex + 1 : 1 },
            }
          : {
              ...tableConfigurationMetaData.meta,
              limit: { limit: 10, page: Number(pageIndex) ? pageIndex + 1 : 1 },
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
        return { data: formatedData, totalCount: response.data.total };
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");
        props.setViewPlanTableLoader(false);
        return defaultTableData;
      }
    } catch {
      displaySnackMessages(ERROR_MESSAGE, "error");
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
          setTimeout(() => {
            history?.push(
              `${CREATE_ALLOCATION}?step=0&type=${DRAFT_FLOW}&allocation_code=${rowData.plan_code}`
            );
          }, 1000);
        }
      } catch (err) {
        displaySnackMessages(ERROR_MESSAGE, "error");
      } finally {
        props.setDashboardLoaderFullScreen(false);
      }
    } else {
      window.open(
        `${CREATE_ALLOCATION}?step=1&allocation_code=${rowData.plan_code}&type=edit`,
        "_blank",
        "noopener,noreferrer"
      );
    }
  };

  const onSelectionChanged = (event) => {
    // fetch all selected rows
    let selections = event.api.getSelectedRows();
    setSelectedPlans(selections);
  };

  const confirmDelete = () => {
    setShowDeleteDialog(false);
    props.confirmDeletePlans();
  };

  const getDeleteMessage = (p_msg = "") => {
    return `${DELETE_MESSAGE} ${p_msg}`;
  };

  return (
    <>
      <Prompt
        isOpen={showDeleteDialog}
        title="Delete Selected Allocation Plan"
        subHeading={getDeleteMessage("the selected allocation Plan?")}
        infoList={[]}
        primaryButtonProps={{
          children: DIALOG_CONFIRM_BTN_TEXT,
          onClick: () => {
            confirmDelete();
            setShowDeleteDialog(false);
          },
        }}
        tertiaryButtonProps={{
          children: DIALOG_REJECT_BTN_TEXT,
          onClick: () => setShowDeleteDialog(false),
        }}
        variant="error"
      />
      <Loader
        loader={
          props.viewPlanLoader ||
          props.viewPlanTableConfigLoader ||
          props.inventorysmartDeletePlanLoader
        }
        minHeight={"260px"}
      >
        {props.renderAgGrid && (
          <AgGridComponent
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
            totalCount={props.viewPlansTableData.total} // to set the total count once received from BE
            cacheBlockSize={10}
            uniqueRowId={"plan_code"}
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
});

export default connect(mapStateToProps, mapDispatchToProps)(ViewPlansTable);
