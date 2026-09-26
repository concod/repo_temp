import { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { useHistory } from "react-router-dom";
import { Button, Paper } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import classNames from "classnames";
import globalStyles from "Styles/globalStyles";
import Loader from "core/Utils/Loader/loader";
import AgGridComponent from "core/Utils/agGrid";
import { addSnack } from "actions/snackbarActions";
import { getColumnsAg } from "actions/tableColumnActions";
import { Prompt } from "impact-ui";
import { cloneDeep, isEmpty } from "lodash";
import {
  DIALOG_CONFIRM_BTN_TEXT,
  DIALOG_REJECT_BTN_TEXT,
  defaultTableData,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { makeStyles } from "@mui/styles";
import { ERROR_MESSAGE } from "../../constants-inventorysmart/stringConstants";
import {
  deleteAllocationRule,
  fetchRuleDetails,
  getAllocationRules,
  getStoreExceptions,
} from "modules/inventorysmart/services-inventorysmart/Auto-Allocation-Rules/auto-allocation-rules-service";
import StoreExceptionTable from "./StoreExceptionTable";
import { scrollIntoView } from "../inventorysmart-utility";
import { CREATE_AUTO_ALLOCATION_RULES } from "modules/inventorysmart/constants-inventorysmart/routesConstants";
import { useNavigate } from "react-router-dom-v5-compat";

export const useStyles = makeStyles(() => ({
  sizeSplitTableWidth: {
    margin: "1rem auto",
  },
  buttonFlex: {
    display: "flex",
    justifyContent: "space-between",
    margin: "16px",
    gap: "16px",
    alignItems: "center",
  },
  flex: {
    gap: "16px",
  },
}));

const AutoAllocationRules = (props) => {
  const storeExceptionRef = useRef(null);
  const tableInstance = useRef(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [columnDefs, setColumnDefs] = useState([]);
  const [openStoreException, setOpenExceptionView] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState([]);
  const [currentSelectedRow, setCurrentSelectedRow] = useState([]);
  const [render, setRender] = useState(false);

  const classes = useStyles();
  const navigate = useNavigate();

  const loadTableInstance = (params) => {
    tableInstance.current = params;
  };

  const getAutoAllocationRulesTableConfig = async () => {
    const cols = await props.getColumnsAg(
      "table_name=auto_allocation_rules",
      null,
      actionMap
    );
    setColumnDefs(cols);
    setRender(true);
    try {
    } catch (e) {
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };

  useEffect(() => {
    getAutoAllocationRulesTableConfig();
  }, []);

  useEffect(() => {
    if (openStoreException) {
      scrollIntoView(storeExceptionRef);
    }
  }, [openStoreException]);

  const openExceptionModal = async (data, column_name) => {
    setOpenExceptionView(true);
    setCurrentSelectedRow(data);
  };

  const actionMap = {
    store_exceptions: openExceptionModal,
  };


  const displaySnackMessages = (message, variance, onClose) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
        ...(onClose && { onClose: onClose }),
      },
    });
  };

  const manualCallBack = async (manualbody, pageIndex, params) => {
    try {
      setIsLoading(true);
      let body = {
        meta: {
          ...manualbody,
          limit: { limit: 10, page: pageIndex + 1 },
        },
      };
      let response = await getAllocationRules(body)();
      if (response.data.status) {
        let finalData = response.data.data;
        setIsLoading(false);
        return { data: finalData, totalCount: response.data.total };
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");
        setIsLoading(false);
        return defaultTableData;
      }
    } catch (err) {
      console.log(err);
      displaySnackMessages(ERROR_MESSAGE, "error");
      setIsLoading(false);
      return defaultTableData;
    }
  };

  const onDeleteClick = async (ruleData) => {
    setShowDeleteDialog(true);
    setRuleToDelete(ruleData);
  };

  const onEditClick = async (ruleData) => {
    try {
      let response = await props.fetchRuleDetails(ruleData.rule_code);
      navigate(CREATE_AUTO_ALLOCATION_RULES, { state: {
        editData: response.data.data,
        isEditFlow: true,
      }
      });
    } catch (e) {
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };

  const confirmDelete = async () => {
    setIsLoading(true);
    setRender(false);
    try {
      let response = await props.deleteAllocationRule(ruleToDelete.rule_code);
      getAutoAllocationRulesTableConfig();
      reloadTable();
      displaySnackMessages(response.data?.message, "success");
      setIsLoading(false);
      setRender(true);
      setOpenExceptionView(false);
    } catch (e) {
      setIsLoading(false);
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };

  const navigateToCreateAllocationRules = () => {
    navigate(CREATE_AUTO_ALLOCATION_RULES);
  };

  const reloadTable = () => {
    tableInstance.current?.api?.refreshServerSideStore({
      purge: true,
    });
  };
  return (
    <>
      <Prompt
        isOpen={showDeleteDialog}
        title="Delete Selected Auto Allocation Scheduler"
        subHeading={`Are you sure you want to delete ${ruleToDelete.rule_name}`}
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
      <Loader loader={isLoading}>
        <div className="priority-code-config">
          <div className={classes.buttonFlex}>
            <h3>Auto Allocation Scheduler</h3>
            <Button
              variant="contained"
              color="primary"
              id="createAllocationRule"
              onClick={() => navigateToCreateAllocationRules()}
              disabled={false}
            >
              <AddIcon fontSize="small"></AddIcon>{" "}
            </Button>
          </div>
          {render && (
            <div className="ag-theme-alpine">
              <AgGridComponent
                loadTableInstance={loadTableInstance}
                columns={columnDefs}
                manualCallBack={(body, pageIndex, params) =>
                  manualCallBack(body, pageIndex, params)
                }
                selectAllHeaderComponent={true}
                {...(props.inventorysmartScreenConfigForInfiniteScrolling?.includes(
                  "dashboard"
                )
                  ? {
                      pagination: false,
                      rowModelType: "infinite",
                      cacheOverflowSize: 2,
                      hideSelectCurrentPageRecords: true,
                    }
                  : {
                      rowModelType: "serverSide",
                      serverSideStoreType: "partial",
                    })}
                rowSelection="multiple"
                onRowSelected
                onEditClick={(tableInfo) => onEditClick(tableInfo.data)}
                callDeleteApi={(tableInfo) => onDeleteClick(tableInfo.data)}
                cacheBlockSize={10}
                uniqueRowId={"rule_code"}
              />
            </div>
          )}
          {/* As per new implementation (MTP-42478) we have remove the store exception flow.
           {openStoreException && (
            <div ref={storeExceptionRef}>
              <Paper
                elevation={4}
                className={classNames(
                  globalClasses.paperWrapper,
                  globalClasses.marginVertical1rem
                )}
              >
                <StoreExceptionTable
                  classes={classes}
                  globalClasses={globalClasses}
                  currentSelectedRow={currentSelectedRow}
                  reloadParent={reloadTable}
                  setParentRender={setRender}
                />
              </Paper>
            </div>
          )} */}
        </div>
      </Loader>
    </>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer } = store;
  return {
    newStoreDashboardLoader:
      inventorysmartReducer.inventorySmartNewStoreDashboardService
        .newStoreDashboardLoader,
    sisterStoreHierarchyKey:
      inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.inventorysmart_new_store_setup?.drillDown
        ?.sister_store_mapping_hierarchy,
    inventorysmartModulesPermission:
      inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartModulesPermission,
    storeCodeKey:
      inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.inventorysmart_new_store_setup?.drillDown
        ?.store_code_key,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    getAllocationRules: (body) => dispatch(getAllocationRules(body)),
    deleteAllocationRule: (body) => dispatch(deleteAllocationRule(body)),
    fetchRuleDetails: (body) => dispatch(fetchRuleDetails(body)),
    getStoreExceptions: (body) => dispatch(getStoreExceptions(body)),
    addSnack: (snack) => dispatch(addSnack(snack)),
    getColumnsAg: (queryParam, levelsJSON, actions) =>
      dispatch(getColumnsAg(queryParam, levelsJSON, actions)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(AutoAllocationRules);
