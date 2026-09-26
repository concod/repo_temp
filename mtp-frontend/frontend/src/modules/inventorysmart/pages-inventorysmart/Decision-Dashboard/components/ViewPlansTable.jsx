import { addSnack } from "core/actions/snackbarActions";
import { isEmpty } from "lodash";
import { useHistory } from "react-router-dom";
import { useNavigate } from "react-router-dom-v5-compat";
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
  INVENTORY_SUBMODULES_NAMES,
  CREATE_NEW_PLAN
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import {
  getViewPlanTableConfiguration,
  getViewPlanTableData,
  setDashboardLoaderFullScreen,
  setViewPlanTableConfigLoader,
  setViewPlanTableData,
  setViewPlanTableLoader,
  setInventorysmartDeletePlanLoader,
  deletePlans
} from "modules/inventorysmart/services-inventorysmart/Decision-Dashboard/decision-dashboard-services";
import {
  clearNotification
} from "modules/inventorysmart/services-inventorysmart/Finalize/store-view-services";
import { getDrafts } from "modules/inventorysmart/services-inventorysmart/Finalize/store-view-services";
import { useEffect, useState, useRef } from "react";
import { connect } from "react-redux";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import { getSelectedRowsForInfiniteRowModel } from "core/Utils/agGrid/table-functions";
import Loader from "core/Utils/Loader/loader";
import {Delete, Search, Mode, DeleteOutline} from "@mui/icons-material";
import { Button, Grid, Typography, ButtonBase, Box } from "@mui/material";
import globalStyles from "core/Styles/globalStyles";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";

import { Prompt } from "impact-ui";
import {
  setArticleAgGridParams,
  setBackButtonClicked,
  setCreateAllocationArticles,
  setDraftsResult,
  setInventorysmartCreateAllocationFilterDependency,
  setIsFiltersValid,
  setIsValidDraft,
  setSelectedFilters,
  setShowInvalidDraftModal,
} from "modules/inventorysmart/services-inventorysmart/Create-Allocation/create-allocation-services";

const ViewPlansTable = (props) => {
  const history = useHistory();
  const classes = useStyles();
  const globalClasses = globalStyles();
  const navigate = useNavigate();

  const [plansTableColumns, setPlansTableColumns] = useState([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedPlans, setSelectedPlans] = useState([]);
  const viewPlansGridInstance = useRef(null);
  const [renderAgGrid, setRenderAgGrid] = useState(false); // using instead of aggrid refreshServerSideStore api


  useEffect(() => {
    const fetchColumnData = async () => {
      props.setViewPlanTableConfigLoader(true);
      let columns = await props.getViewPlanTableConfiguration();
      props.setViewPlanTableConfigLoader(false);
      let formattedColumns = agGridColumnFormatter(columns?.data?.data);
      setPlansTableColumns(formattedColumns);
      setRenderAgGrid(true);
    };
    fetchColumnData();
  }, [props.selectedFilters]);

  useEffect(() => {
    !isEmpty(props.selectedFilters) && setRenderAgGrid(false);
  }, [props.selectedFilters]);

  // useEffect(() => {
  //   if (isEmpty(selectedPlans)) {
  //     props.setSelectedPlanIds([]);
  //   }
  //   if (!isEmpty(selectedPlans)) {
  //     let selectedPlanIds = selectedPlans.map((plan) => {
  //       return plan.plan_code;
  //     });
  //     props.setSelectedPlanIds(selectedPlanIds);
  //   }
  // }, [selectedPlans]);

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
            history?.push(
              `${CREATE_ALLOCATION}?step=0&type=${DRAFT_FLOW}&allocation_code=${rowData.plan_code}`
            );
          }, 1000);
        }
      } catch (err) {
        displaySnackMessages(ERROR_MESSAGE, "error");
      } finally {
        props.setDashboardLoaderFullScreen(false);
        viewPlansGridInstance?.current?.api?.deselectAll();
      }
    } else {
      window.open(
        `${CREATE_ALLOCATION}?step=1&allocation_code=${rowData.plan_code}&type=edit`,
        "_blank",
        "noopener,noreferrer"
      );
      viewPlansGridInstance?.current?.api?.deselectAll();
    }
  };

  // const canTakeActionOnModules = (subModuleName, action) => {
  //   return isActionAllowedOnSubModule(
  //     props.inventorysmartModulesPermission,
  //     props.module,
  //     subModuleName,
  //     action
  //   );
  // };

  const onDeleteSelectedPlans = () => {
    selectedPlans?.length > 0 && setShowDeleteDialog(true);
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

  
  const confirmDeletePlans = () => {
    const callDelete = async () => {
      props.setInventorysmartDeletePlanLoader(true);
      setRenderAgGrid(false);
      try {
      let selectedPlanIds=[];
      if (!isEmpty(selectedPlans)) {
      selectedPlanIds = selectedPlans.map((plan) => {
        return plan.plan_code;
      });
    }
        let body = {
          plan_codes: [...selectedPlanIds],
        };
        await props.deletePlans(body);

        //calling below API to clear notification on deletion
        await props.clearNotification({
          event_id: body.plan_codes,
          delete_type: "hard_delete",
        });
        setSelectedPlans([]);
        displaySnackMessages("Successfully deleted plans", "success");
      } catch (err) {
        displaySnackMessages("Something went wrong on delete", "error");
      } finally {
        props.setInventorysmartDeletePlanLoader(false);
        setRenderAgGrid(true);
      }
    };
    callDelete();
  };

  const confirmDelete = () => {
    setShowDeleteDialog(false);
    confirmDeletePlans();
  };

  const getDeleteMessage = (p_msg = "") => {
    return `${DELETE_MESSAGE} ${p_msg}`;
  };

  const viewPlansTableInstance = (params) => {
    viewPlansGridInstance.current = params;
  };

  const handleNewPlanCreation = () => {
    navigate(`${CREATE_ALLOCATION}?step=0`);
  };

  return (
    <>
      <Grid
        container
        className={`${globalClasses.marginEqualIS} ${classes.gapIS}`}
        justifyContent={"flex-end"}
      >
        <Grid item className={`${globalClasses.flexRow} ${classes.gapIS} ${globalClasses.layoutAlignCenter}`}>
          {selectedPlans.length !== 0 &&
            <>
              {
                selectedPlans.length == 1 &&
                <Button className={`${globalClasses.buttonNew}`}
                  onClick={() => onEditClick(selectedPlans[0])}>
                  <Mode className={`${globalClasses.iconNew}`} />
                </Button> 
              }
              < Button className={`${globalClasses.buttonNew}`}
                onClick={() => onDeleteSelectedPlans()}>
                <DeleteOutline className={`${globalClasses.iconNew}`} />
              </Button>
              <Box className={`${classes.lineSep}`} />
            </>}
          <Button
            variant="contained"
            color="primary"
            id="productSetAllBtn"
            // className={classes.button}
            onClick={() => handleNewPlanCreation()}
            disabled={
              !props.canTakeActionOnModules(
                INVENTORY_SUBMODULES_NAMES.INVENTORY_DASHBOARD_VIEW_PLANS,
                "create"
              )
            }
          >
            {CREATE_NEW_PLAN}
          </Button>
        </Grid>
      </Grid >
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
        {renderAgGrid && (
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
            loadTableInstance={viewPlansTableInstance}
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
  deletePlans: (payload) => dispatch(deletePlans(payload)),
  setInventorysmartDeletePlanLoader: (payload) =>
    dispatch(setInventorysmartDeletePlanLoader(payload)),
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
  clearNotification: (payload) => dispatch(clearNotification(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(ViewPlansTable);
