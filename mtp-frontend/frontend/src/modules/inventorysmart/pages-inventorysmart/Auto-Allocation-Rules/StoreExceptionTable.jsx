import { useEffect } from "react";
import AgGridComponent from "core/Utils/agGrid";
import { useState } from "react";
import { getColumnsAg } from "core/actions/tableColumnActions";
import {
  getStoreExceptions,
  removeStoreException,
} from "modules/inventorysmart/services-inventorysmart/Auto-Allocation-Rules/auto-allocation-rules-service";
import {
  DIALOG_CONFIRM_BTN_TEXT,
  DIALOG_REJECT_BTN_TEXT,
  ERROR_MESSAGE,
  defaultTableData,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { connect } from "react-redux";
import { addSnack } from "core/actions/snackbarActions";
import { useRef } from "react";
import { Button, IconButton, Typography } from "@mui/material";
import { getSelectedRowsForInfiniteRowModel } from "core/Utils/agGrid/table-functions";
import AddStoreExceptionPopUp from "./AddStoreExceptionPopUp";
import DeleteIcon from "@mui/icons-material/Delete";
import { Prompt } from "impact-ui";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";

const StoreExceptionTable = (props) => {
  const { currentSelectedRow, classes, globalClasses,  reloadParent, setParentRender } = props;
  const [storeExceptionColumnDefs, setStoreExceptionColumnDefs] = useState([]);
  const tableInstance = useRef(null);
  const ruleCodeRef = useRef(null);
  const [isDeleteDisable, setIsDeleteDisable] = useState(true);
  const [showStoreExceptionPopUp, setShowStoreExceptionPopUp] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [render, setRender] = useState(false);

  useEffect(() => {
    fetchColumns();
  }, []);

  useEffect(() => {
    ruleCodeRef.current = currentSelectedRow.rule_code;
    fetchStoreExceptions();
  }, [currentSelectedRow.rule_code]);

  useEffect(() => {
    if (tableInstance?.current) {
      tableInstance.current.api.buttonEnabled = isDeleteDisable;
    }
  }, [isDeleteDisable]);

  const fetchStoreExceptions = () => {
    tableInstance?.current?.api?.purgeInfiniteCache();
  };

  const fetchColumns = async () => {
    const cols = await props.getColumnsAg(
      "table_name=auto_allocation_store_exceptions",
      null
    );
    setStoreExceptionColumnDefs(cols);
    setRender(true);
  };

  const manualCallBack = async (manualbody, pageIndex, params, currentRow) => {
    const ruleCode = ruleCodeRef.current; // Get the latest rule code from the ref

    try {
      let body = {
        rule_code: ruleCode,
        meta: {
          ...manualbody,
          limit: { limit: 10, page: pageIndex + 1 },
        },
      };
      let response = await props.getStoreExceptions(body);
      let formattedData;
      if (pageIndex) {
        formattedData = agGridRowFormatter(
          response.data.data,
          params?.api?.checkConfiguration,
          "store_code"
        );
      } else {
        params.api.setCheckConfiguration([]);
        formattedData = response.data.data;
      }

      if (response.data.status) {
        return { data: formattedData, totalCount: response.data.total };
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");
        return defaultTableData;
      }
    } catch (err) {
      displaySnackMessages(ERROR_MESSAGE, "error");
      return defaultTableData;
    }
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

  const loadTableInstance = (params) => {
    tableInstance.current = params;
  };

  const onSelectionChanged = (event) => {
    // fetch all selected rows
    let l_selections = getSelectedRowsForInfiniteRowModel(event)?.length;
    if (l_selections > 0) {
      setIsDeleteDisable(false);
    } else {
      setIsDeleteDisable(true);
    }
  };

  const handleDeleteStore = async () => {
    setRender(false);
    setParentRender(false);
    try {
      let l_selectedNodes = getSelectedRowsForInfiniteRowModel(
        tableInstance.current,
        true
      );
      let data = l_selectedNodes.map((data) => data.data);
      const ruleCode = data.length > 0 ? data[0].rule_code : null;

      const storeCodes = data.map((item) => item.store_code);
      let req = { rule_code: ruleCode, store_list: storeCodes };

      let response = await props.removeStoreException(req);

      fetchStoreExceptions();
      reloadParent();
      setRender(true);
      setParentRender(true);
      displaySnackMessages(response.data?.message, "success");
    } catch (e) {
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };

  const onCancel = () => {
    setShowStoreExceptionPopUp(false);
  };

  return (
    <>
      <Prompt
        isOpen={showDeleteDialog}
        title="Delete Selected Stores for Exception"
        subHeading={`Are you sure you want to delete selected Stores`}
        infoList={[]}
        primaryButtonProps={{
          children: DIALOG_CONFIRM_BTN_TEXT,
          onClick: () => {
            handleDeleteStore();
            setShowDeleteDialog(false);
          },
        }}
        tertiaryButtonProps={{
          children: DIALOG_REJECT_BTN_TEXT,
          onClick: () => setShowDeleteDialog(false),
        }}
        variant="error"
      />
      <div className="ag-theme-alpine">
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <Typography className={globalClasses.marginVertical1rem} variant="h5">
            Store Exception
          </Typography>
          <div className={classes.buttonFlex}>
            <Button
              variant="contained"
              color="primary"
              id="addException"
              onClick={() => setShowStoreExceptionPopUp(true)}
              disabled={false}
            >
              Add Exception
            </Button>

            <IconButton
              onClick={() => setShowDeleteDialog(true)}
              variant="contained"
              color="primary"
              size="large"
              disabled={isDeleteDisable}
            >
              <DeleteIcon />
            </IconButton>
          </div>
        </div>
        {render && (
          <AgGridComponent
            loadTableInstance={loadTableInstance}
            columns={storeExceptionColumnDefs}
            manualCallBack={(body, pageIndex, params) =>
              manualCallBack(body, pageIndex, params, currentSelectedRow)
            }
            selectAllHeaderComponent={true}
            {...(props.inventorysmartScreenConfigForInfiniteScrolling?.includes(
              // FIXME: Include this in the config
              "storeExceptionTable"
            )
              ? {
                  pagination: false,
                  rowModelType: "infinite",
                  cacheOverflowSize: 2,
                  hideSelectCurrentPageRecords: true,
                }
              : {
                  pagination: false,
                  rowModelType: "infinite",
                  cacheOverflowSize: 2,
                  hideSelectCurrentPageRecords: true,
                })}
            rowSelection="multiple"
            cacheBlockSize={10}
            uniqueRowId={"store_code"}
            onSelectionChanged={onSelectionChanged}
          />
        )}

        {showStoreExceptionPopUp && (
          <AddStoreExceptionPopUp
            currentRuleCode={ruleCodeRef.current}
            onCancel={onCancel}
            fetchStoreExceptions={fetchStoreExceptions}
            setParentRender={setParentRender}
          />
        )}
      </div>
    </>
  );
};

const mapDispatchToProps = (dispatch) => {
  return {
    getStoreExceptions: (body) => dispatch(getStoreExceptions(body)),
    removeStoreException: (body) => dispatch(removeStoreException(body)),
    getColumnsAg: (queryParam, levelsJSON, actions) =>
      dispatch(getColumnsAg(queryParam, levelsJSON, actions)),
    addSnack: (snack) => dispatch(addSnack(snack)),
  };
};

export default connect(null, mapDispatchToProps)(StoreExceptionTable);
