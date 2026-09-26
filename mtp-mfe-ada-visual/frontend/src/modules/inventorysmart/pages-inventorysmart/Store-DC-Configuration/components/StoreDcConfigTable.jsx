import React, { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { addSnack } from "core/actions/snackbarActions";

import AgGridComponent from "core/Utils/agGrid";
import { Button } from "@mui/material";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";

import { ERROR_MESSAGE } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import {
  getStoreDcConfigurationTableConfiguration,
  getStoreDcConfigTableData,
  setInventorysmartStoreDcConfigTableDataLoader,
  saveGridEdits,
  saveGridEditsForCheckAll,
  DownloadRequest,
} from "modules/inventorysmart/services-inventorysmart/Store-DC-Configuration/store-dc-configuration";
import { scrollIntoView } from "../../inventorysmart-utility";
import { isEmpty } from "lodash";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import StoreDCSetAllModal from "./StoreDCSetAllModal";
import { getSelectedRowsForInfiniteRowModel } from "core/Utils/agGrid/table-functions";
import DownloadIcon from "@mui/icons-material/Download";

const StoreDcConfigurationTable = (props) => {
  const classes = useStyles();
  const articleTableGridInstance = useRef(null);

  const [
    storeDcConfigurationTableColumns,
    setStoreDcConfigurationTableColumns,
  ] = useState([]);
  const [render, setRender] = useState(false);
  const [editedRows, setEditedRows] = useState({});
  const [buttonEnabled, setButtonEnabled] = useState(false);
  const [showSetAllModal, setShowSetAllModal] = useState(false);
  const [enableDownload, setEnableDownload] = useState(true);
  const [requestBody, setRequestBody] = useState([]);
  const allocationRef = useRef();

  const setCellsToBeDisabled = (row) => row?.isDisabled;

  useEffect(() => {
    const fetchColumnConfig = async () => {
      let columns = await props.getStoreDcConfigurationTableConfiguration();
      let formattedColumns = agGridColumnFormatter(columns?.data?.data, null);
      let l_columnsWithDisablekey = formattedColumns.map((obj) => {
        if (obj.extra.canBeDisabled) {
          obj.disabled = setCellsToBeDisabled;
        }
        return obj;
      });
      setStoreDcConfigurationTableColumns(l_columnsWithDisablekey);
      setRender(true);
      scrollIntoView(allocationRef);
    };
    fetchColumnConfig();
  }, [props.selectedFilters]);

  useEffect(() => {
    if (!isEmpty(props.selectedFilters)) {
      setRender(false);
      setEditedRows({});
    }
  }, [props.selectedFilters]);

  const manualCallBack = async (manualbody, pageIndex, params) => {
    try {
      props.setInventorysmartStoreDcConfigTableDataLoader(true);
      let body = {
        filters: [...props.selectedFilters],
        meta: {
          ...manualbody,
          limit: { limit: 10, page: pageIndex + 1 },
        },
      };
      setRequestBody(body);
      let response = await props.getStoreDcConfigTableData(body);
      if (response.data.status) {
        let formattedData;
        if (pageIndex) {
          formattedData = agGridRowFormatter(
            response.data.data,
            params?.api?.checkConfiguration,
            "unique_key"
          );
        } else {
          if (response.data.data?.length) setEnableDownload(false);
          else setEnableDownload(true);
          params?.api?.setCheckConfiguration([]);
          setButtonEnabled(false);
          formattedData = response.data.data;
        }

        return {
          data: formattedData,
          totalCount: response.data.total,
        };
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    } catch (err) {
      setEnableDownload(true);
      displaySnackMessages(ERROR_MESSAGE, "error");
    } finally {
      props.setInventorysmartStoreDcConfigTableDataLoader(false);
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

  const onBlur = async (_e, data, column, isChanged,  value, _initialValue, cellData) => {
    for(let i in data){
      if(data[i]==="")data[i]="0";
    }
    if(value === ""){
      cellData.node.setDataValue(cellData.column.colId,"0");
    }
    setEditedRows((old) => {
      return { ...old, [data?.unique_key]: data };
    });
    if (column?.colDef?.extra?.updateOnBlur) {
      data.lead_time =
        (+data?.processing_time || 0) + (+data?.transit_time_og || 0);
      articleTableGridInstance.current.api.refreshCells({
        columns: ["lead_time"],
      });
    }
  };

  const onSaveHandler = async (
    p_editedRows,
    checkAll = false,
    refreshCells = null
  ) => {
    try {
      props.setInventorysmartStoreDcConfigTableDataLoader(true);

      let l_response = checkAll
        ? await props?.saveGridEditsForCheckAll(p_editedRows)
        : await props?.saveGridEdits(p_editedRows);
      if (l_response?.data?.status) {
        displaySnackMessages("Edits Saved Successfully", "success");
        refreshCells && refreshCells();
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    } catch {
      displaySnackMessages(ERROR_MESSAGE, "error");
    } finally {
      props.setInventorysmartStoreDcConfigTableDataLoader(false);
      setEditedRows({});
    }
  };

  const loadTableInstance = (params) => {
    articleTableGridInstance.current = params;
  };

  const onSelectionChanged = (event) => {
    // fetch all selected rows

    let selections = getSelectedRowsForInfiniteRowModel(event);
    setButtonEnabled(selections?.length);
  };

  const downloadReport = async () => {
    try {
      await props.DownloadRequest(requestBody);
      displaySnackMessages(
        "Download Request is running in background. You will get a notification once it is ready to download",
        "info"
      );
    } catch (err) {
      displaySnackMessages("Error while downloading", "error");
    }
  };
  return (
    <>
      {render && (
        <div ref={allocationRef}>
          {showSetAllModal && (
            <StoreDCSetAllModal
              setShowSetAllModal={setShowSetAllModal}
              agGridInstance={articleTableGridInstance.current}
              filters={props.selectedFilters}
              onSaveHandler={onSaveHandler}
              displaySnackMessages={displaySnackMessages}
            />
          )}
          <Loader loader={props.inventorysmartStoreDcConfigTableDataLoader}>
            <div style={{ textAlign: "right", paddingBottom: "0.6rem" }}>
              <Button
                variant="outlined"
                onClick={downloadReport}
                startIcon={<DownloadIcon />}
                disabled={enableDownload}
              >
                Download
              </Button>
            </div>
            <AgGridComponent
              selectAllHeaderComponent
              columns={storeDcConfigurationTableColumns}
              manualCallBack={(body, pageIndex, param) =>
                manualCallBack(body, pageIndex, param)
              }
              rowModelType="serverSide"
              serverSideStoreType="partial"
              cacheBlockSize={10}
              uniqueRowId={"unique_key"}
              onBlur={onBlur}
              loadTableInstance={loadTableInstance}
              onSelectionChanged={onSelectionChanged}
              onRowSelected
            />

            <div className={classes.buttonGroupWrapper}>
              <Button
                variant="contained"
                color="primary"
                disabled={!buttonEnabled}
                className={classes.button}
                onClick={() => setShowSetAllModal(true)}
              >
                Set Bulk Edit
              </Button>
              <Button
                variant="contained"
                color="primary"
                disabled={isEmpty(editedRows)}
                className={classes.button}
                onClick={() => onSaveHandler(Object.values(editedRows))}
              >
                Save Grid Edit
              </Button>
            </div>
          </Loader>
        </div>
      )}
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    selectedFilters:
      store.inventorysmartReducer.inventorySmartStoreDcConfigService
        .selectedFilters,
    inventorysmartStoreDcConfigTableDataLoader:
      store.inventorysmartReducer.inventorySmartStoreDcConfigService
        .inventorysmartStoreDcConfigTableDataLoader,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getStoreDcConfigurationTableConfiguration: (payload) =>
    dispatch(getStoreDcConfigurationTableConfiguration(payload)),
  setInventorysmartStoreDcConfigTableDataLoader: (payload) =>
    dispatch(setInventorysmartStoreDcConfigTableDataLoader(payload)),
  getStoreDcConfigTableData: (payload) =>
    dispatch(getStoreDcConfigTableData(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  saveGridEdits: (payload) => dispatch(saveGridEdits(payload)),
  saveGridEditsForCheckAll: (payload) =>
    dispatch(saveGridEditsForCheckAll(payload)),
  DownloadRequest: (payload) => dispatch(DownloadRequest(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(StoreDcConfigurationTable);
