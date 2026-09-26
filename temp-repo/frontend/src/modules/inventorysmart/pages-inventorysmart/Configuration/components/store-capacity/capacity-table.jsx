import { addSnack } from "core/actions/snackbarActions";
import { isEmpty, isEqual } from "lodash";
import {
  downloadStoreCapacityData,
  getStoreCapacityTableData,
  updateStoreCapacityData,
} from "modules/inventorysmart/services-inventorysmart/Store-Capacity/store-capacity-services";

import React, { useEffect, useState, useRef } from "react";
import { connect } from "react-redux";
import AgGridComponent from "core/Utils/agGrid";
import Loader from "core/Utils/Loader/loader";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { Button } from "@mui/material";
import { getObjectsAfterCheckAll } from "../../../StoreInventoryAlerts/components/AlertsActionPopup";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import DownloadReport from "modules/inventorysmart/pages-inventorysmart/Allocation-Reporting/report-download";
const StoreCapacityComponentTable = (props) => {
  const [storeCapacityTableColumns, setStoreCapacityTableColumns] = useState(
    []
  );
  const tableInstance = useRef({});
  const filterDependencies = useRef({});
  const [showloading, setShowloading] = useState(false);
  const classes = useStyles();
  const [reqBody, setRequestBody] = useState(null);
  const [editedRows, setEditedRows] = useState([]);
  const offset = useRef(0);
  const subOffset = useRef(0);
  const manualBodyRef = useRef();
  const [enableStoreViewDownload, setEnableStoreViewDownload] = useState(true);
  useEffect(() => {
    setShowloading(true);
    const setTableConfig = async () => {
      let columns = await props.getColumnsAg(
        "table_name=store_capacity_configuration"
      );
      setStoreCapacityTableColumns(columns);
      setShowloading(false);
    };
    setTableConfig();
  }, []);

  useEffect(() => {
    if (!isEmpty(props.filterDependency)) {
      filterDependencies.current = props.filterDependency;
      resetOffset();
      tableInstance?.current?.api?.refreshServerSideStore({ purge: true });
    } else {
      filterDependencies.current = {};
    }
  }, [props.filterDependency]);
  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };
  const resetOffset = () => {
    offset.current = 0;
    subOffset.current = 0;
  };

  const manualCallBack = async (manualbody, pageIndex, params) => {
    setShowloading(true);
    if (!isEqual(manualBodyRef.current, manualbody)) {
      resetOffset();
      // skipList.current = [];
    }
    let body = {
      meta: {
        ...manualbody,
        limit: {
          limit: 10,
          page: pageIndex + 1,
          offset: offset.current,
          sub_offset: subOffset.current,
        },
      },
      filters: filterDependencies?.current,
    };

    try {
      setRequestBody(manualbody);
      let response = await props.getStoreCapacityTableData(body);
      setShowloading(false);

      let finalresult = [];
      if (response?.data?.data?.table_data) {
        manualBodyRef.current = manualbody;
        offset.current = response?.data?.data?.table_data.offset;
        subOffset.current = response?.data?.data?.table_data.sub_offset;
      }
      if (response?.data?.data?.table_data?.result?.length > 0) {
        finalresult = response?.data?.data?.table_data?.result.map((item) => {
          item.unique_key = `${item.store_code}|${item.capacity_level}`;
          return item;
        });
        setEnableStoreViewDownload(false);
      } else {
        setEnableStoreViewDownload(true);
      }
      if (pageIndex) {
        finalresult = agGridRowFormatter(
          finalresult,
          params?.api?.checkConfiguration,
          "unique_key"
        );
      } else {
        params?.api?.setCheckConfiguration([]);
      }
      return {
        data: finalresult,
        // totalCount: finalresult.length,
      };
    } catch (e) {
      setEnableStoreViewDownload(true);
      setShowloading(false);
      displaySnackMessages("Error while fetching", "error");
      return {
        data: [],
        totalCount: 0,
      };
    }
  };

  const loadTableInstance = (params) => {
    tableInstance.current = params;
  };
  const setAllRequest = () => {
    let checkSelection =
      tableInstance?.current?.api?.getSelectedNodes()?.length > 0
        ? true
        : false;
    if (checkSelection) {
      tableInstance?.current?.trigerSetAll(true);
    } else {
      displaySnackMessages("Please select atleast one row", "error");
    }
  };
  const onSetAllApply = async (params) => {
    let l_userActions = getObjectsAfterCheckAll(
      tableInstance?.current?.api?.checkConfiguration
    );
    try {
      let setAllBody = {};
      if (isEmpty(l_userActions)) {
        setAllBody = {
          filters: [],
          checkedRows: tableInstance?.current?.api
            ?.getSelectedNodes()
            .map((item) => {
              return {
                store_code: item.data.store_code,
                capacity_level: item.data.capacity_level,
                capacity: params.capacity ? Number(params.capacity) : null,
              };
            }),
          checkAll: false,
          capacity: null,
          unCheckedRows: [],
        };
      } else {
        let l_userActionClubbed = l_userActions.reduce(
          (result, obj) => Object.assign(result, obj),
          {}
        );
        setAllBody = {
          filters: filterDependencies?.current,
          meta: reqBody,
          checkAll: true,
          capacity: params.capacity ? Number(params.capacity) : null,
          checkedRows: [],
          unCheckedRows: l_userActionClubbed?.unCheckedRows
            ? l_userActionClubbed?.unCheckedRows
            : [],
        };
      }
      await props.updateStoreCapacityData(setAllBody);
      resetOffset();
      tableInstance?.current?.api.deselectAll(true);
      tableInstance?.current?.api?.refreshServerSideStore({ purge: true });
      displaySnackMessages("Data saved successfully", "success");
    } catch (err) {
      displaySnackMessages("Error while saving the data", "error");
    }
  };
  const onSaveHandler = async () => {
    setShowloading(true);
    try {
      let postBody = {
        filters: [],
        checkedRows: editedRows.map((item) => {
          return {
            store_code: item.store_code,
            capacity_level: item.capacity_level,
            capacity: item.capacity ? Number(item.capacity) : null,
          };
        }),
        checkAll: false,
        capacity: null,
        unCheckedRows: [],
      };
      await props.updateStoreCapacityData(postBody);
      resetOffset();
      setEditedRows([]);
      tableInstance?.current?.api?.refreshServerSideStore({ purge: true });
      displaySnackMessages("Data saved successfully", "success");
      setShowloading(false);
    } catch (err) {
      setShowloading(false);
      displaySnackMessages("Error while saving the data", "error");
    }
  };
  const onCellValueChanged = (params) => {
    setEditedRows((editedRows) => {
      let updatedRows = [];
      if (editedRows.length > 0) {
        let checkAlreadyExists = editedRows.some(
          (item) =>
            item.store_code === params.data.store_code &&
            item.capacity_level === params.data.capacity_level
        );
        if (checkAlreadyExists) {
          updatedRows = editedRows.map((item) => {
            if (item.unique_key === params.data.unique_key) {
              item = params.data;
            }
            return item;
          });
        } else {
          updatedRows = [...editedRows, params.data];
        }
      } else {
        updatedRows.push(params.data);
      }
      return updatedRows;
    });
  };

  const onBlur = async (
    _e,
    _data,
    _column,
    _isChanged,
    _value,
    _initialValue,
    cellData,
    tableType
  ) => {
    onCellValueChanged(cellData);
  };
  const downloadTableData = async () => {
    await props.downloadStoreCapacityData({
      meta: {
        ...reqBody,
      },
      filters: filterDependencies?.current,
    });
  };
  return (
    <>
      <Loader loader={showloading} minHeight={"188px"}>
        <DownloadReport
          downloadUrl={downloadTableData}
          disable={enableStoreViewDownload}
        ></DownloadReport>
        <AgGridComponent
          columns={storeCapacityTableColumns}
          loadTableInstance={loadTableInstance}
          manualCallBack={(body, pageIndex, params) =>
            manualCallBack(body, pageIndex, params)
          }
          rowModelType="serverSide"
          serverSideStoreType="partial"
          cacheBlockSize={10}
          onRowSelected
          selectAllHeaderComponent
          uniqueRowId={"unique_key"}
          setAlllayout={"horizontal"}
          onBlur={onBlur}
          onSetAllApply={onSetAllApply}
          setAllMaxFieldsInRow={1.5}
          hideSetAllSuccessMessage={true}
          setAllButtonLabel="Apply and Save"
        />
        <div className={classes.buttonGroupWrapper}>
          <Button
            variant="contained"
            color="primary"
            className={classes.button}
            onClick={() => setAllRequest()}
          >
            Set Bulk Edit
          </Button>
          <Button
            variant="contained"
            color="primary"
            disabled={isEmpty(editedRows)}
            className={classes.button}
            onClick={() => onSaveHandler()}
          >
            Save Grid Edit
          </Button>
        </div>
      </Loader>
    </>
  );
};

const mapStateToProps = (store) => {
  return {};
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (payload) => dispatch(addSnack(payload)),
  getColumnsAg: (payload) => dispatch(getColumnsAg(payload)),
  updateStoreCapacityData: (payload) =>
    dispatch(updateStoreCapacityData(payload)),
  getStoreCapacityTableData: (payload) =>
    dispatch(getStoreCapacityTableData(payload)),
  downloadStoreCapacityData: (payload) =>
    dispatch(downloadStoreCapacityData(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(StoreCapacityComponentTable);
