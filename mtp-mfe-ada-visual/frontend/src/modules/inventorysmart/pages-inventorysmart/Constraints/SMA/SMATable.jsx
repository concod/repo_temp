import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { cloneDeep, isEmpty } from "lodash";

import AgGridComponent from "core/Utils/agGrid";
import globalStyles from "core/Styles/globalStyles";
import { getColumnsAg } from "core/actions/tableColumnActions";
import Form from "core/Utils/form";

import {
  getSMAInvData,
  setConstraintsSMALoader,
  saveSMAEdits,
  saveSMASetAllEdits,
} from "../../../services-inventorysmart/Constraints/constraints-services";
import {
  ERROR_MESSAGE,
  SMA_SET_ALL_FORM,
  USER_RESERVE_MANDATORY_FIELDS_MSG,
  USER_RESERVE_PERCENTAGE_VALIDATION_MSG,
  NEGATIVE_VALUE_VALIDATION_MSG,
} from "../../../constants-inventorysmart/stringConstants";
import DownloadReport from "../../Allocation-Reporting/report-download";

const useStyles = makeStyles(() => ({
  alignButtons: {
    marginRight: "0.5rem",
  },
  flexRow: {
    display: "flex",
    alignItems: "flex-start",
  },
}));

const SMATableComponent = (props) => {
  const [SMAColumn, setSMAColumn] = useState([]);
  const [selectedRecords, setSelectedRecords] = useState([]);
  const [openDialogForSetAll, setOpenDialogForSetAll] = useState(false);
  const [smaSetAllField, setSmaSetAllField] = useState({
    sma_reserve_percent: 0,
  });
  const [updatedRowEdits, setUpdatedRowEdits] = useState([]);
  const [productCodePayloadVal, setProductCodePayloadValue] = useState(true);
  const [deSelections, setDeSelections] = useState([]);
  const [enableSMATableDownload, setEnableSMATableDownload] = useState(true);
  const [requestBody, setRequestBody] = useState([]);

  const SMAFilterRef = useRef({});
  const SMATableInstance = useRef(null);
  const updatedRowEditInstance = useRef([]);

  const globalClasses = globalStyles();
  const classes = useStyles();

  useEffect(() => {
    (async () => {
      try {
        props.setConstraintsSMALoader(true);
        let col = await getColumnsAg("table_name=sma_reserve")();
        setSMAColumn(col);
        props.setConstraintsSMALoader(false);
      } catch (e) {
        props.setConstraintsSMALoader(false);
        props.displaySnackMessages(ERROR_MESSAGE, "error");
      }
    })();
  }, []);

  useEffect(() => {
    if (!isEmpty(props.selectedFilters)) {
      SMAFilterRef.current = props.selectedFilters;
      SMATableInstance.current?.api?.refreshServerSideStore({
        purge: true,
      });
    }
  }, [props.selectedFilters]);

  useEffect(() => {
    if (!isEmpty(updatedRowEdits))
      updatedRowEditInstance.current = cloneDeep(updatedRowEdits);
  }, [updatedRowEdits]);

  const manualCallBackSMAInv = async (manualbody, pageIndex) => {
    let body = {
      meta: {
        ...manualbody,
        limit: { limit: 10, page: pageIndex + 1 },
      },
      filters: SMAFilterRef.current,
    };
    try {
      setRequestBody(body);
      let response = await props.getSMAInvData(body);
      props.setConstraintsSMALoader(false);
      let smaDataList = response.data.data;
      if (pageIndex == 0) {
        if (smaDataList?.length) setEnableSMATableDownload(false);
        else setEnableSMATableDownload(true);
      }
      //   to preserve row edits when the user has not saved the edits and has applied a new filter
      if (updatedRowEditInstance.current?.length) {
        smaDataList = smaDataList.map((item) => {
          if (
            updatedRowEditInstance.current.some(
              (obj) => Number(obj.product_code) === Number(item.product_code)
            )
          ) {
            let matchingObject = updatedRowEditInstance.current.find(
              (val) => Number(val.product_code) === Number(item.product_code)
            );
            return matchingObject;
          } else return item;
        });
      }
      return {
        data: smaDataList,
        totalCount: response.data.total,
      };
    } catch (e) {
      setEnableSMATableDownload(true);
      props.setConstraintsSMALoader(false);
      props.displaySnackMessages(ERROR_MESSAGE, "error");
      return {
        data: [],
        totalCount: 0,
      };
    }
  };

  const setNewTableInstance = (params) => {
    SMATableInstance.current = params;
  };

  const onSelectionChanged = (event) => {
    let selections = event.api.getSelectedRows();
    setSelectedRecords(selections);
    let deSelectedRows = event.api
      ?.getRenderedNodes()
      ?.filter((node) => !node.selected)
      ?.map((rowNode) => rowNode.data);
    setDeSelections(deSelectedRows);
  };

  const closeSetAll = () => {
    setOpenDialogForSetAll(false);
    setSmaSetAllField({
      sma_reserve_percent: 0,
    });
  };

  const applyEditOnSelectedRows = async () => {
    if (!smaSetAllField.sma_reserve_percent) {
      props.displaySnackMessages(USER_RESERVE_MANDATORY_FIELDS_MSG, "warning");
    } else {
      try {
        props.setConstraintsSMALoader(true);
        let setFilterBody = [];
        // if select all is checked - no changes in filter payload
        if (!productCodePayloadVal) {
          setFilterBody = SMAFilterRef.current;
        }
        // if select current rows or manually rows are checked - send selected rows in the payload
        if (productCodePayloadVal) {
          setFilterBody = updateProductCodeInFilterConfig();
        }
        // if select all is checked and the user deselects few rows - send the deselected row values in payload
        if (!productCodePayloadVal && deSelections.length) {
          setFilterBody = updateProductCodeNotInFilterConfig();
        }
        let body = {
          data: smaSetAllField?.sma_reserve_percent,
          filters: setFilterBody,
        };
        let response = await props.saveSMASetAllEdits(body);
        if (response.data?.status) {
          props.displaySnackMessages("Set all updated", "success");
          setSelectedRecords([]);
          setDeSelections([]);
          setProductCodePayloadValue(true);
          // Reset check configuration or else check all value remians unchanged and wrong payload will be sent
          SMATableInstance.current?.api?.setCheckConfiguration([]);
          SMATableInstance.current?.api?.refreshServerSideStore({
            purge: true,
          });
          // to reset header checkbox selection
          SMATableInstance.current?.api?.deselectAll();
        }
        closeSetAll();
        props.setConstraintsSMALoader(false);
      } catch (e) {
        props.setConstraintsSMALoader(false);
        props.displaySnackMessages(ERROR_MESSAGE, "error");
      }
    }
  };

  const updateProductCodeInFilterConfig = () => {
    return [
      ...SMAFilterRef.current,
      {
        filter_type: "cascaded",
        attribute_name: "article",
        operator: "in",
        dimension: "product",
        filter_id: "article",
        values: selectedRecords.map((item) => item.product_code),
        display_type: "dropdown",
      },
    ];
  };

  const updateProductCodeNotInFilterConfig = () => {
    return [
      ...SMAFilterRef.current,
      {
        filter_type: "cascaded",
        attribute_name: "article",
        operator: "not in",
        dimension: "product",
        filter_id: "article",
        values: deSelections.map((item) => item.product_code),
      },
    ];
  };

  const openPopUpModal = () => {
    return (
      <Dialog
        open={openDialogForSetAll}
        onClose={() => setOpenDialogForSetAll(false)}
        maxWidth="sm"
        fullWidth={true}
      >
        <DialogTitle>Set All</DialogTitle>
        <DialogContent>
          <Form
            layout={"horizontal"}
            maxFieldsInRow={1}
            handleChange={handleChangeSMASetAllEdit}
            fields={SMA_SET_ALL_FORM}
            updateDefaultValue={false}
            defaultValues={smaSetAllField}
            fieldTypeWidthSpan={4}
          ></Form>
        </DialogContent>
        <DialogActions>
          <Button
            variant="outlined"
            color="primary"
            onClick={() => closeSetAll()}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => applyEditOnSelectedRows()}
          >
            Apply
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  const handleChangeSMASetAllEdit = (updatedFormData) => {
    setSmaSetAllField(updatedFormData);
  };

  const onBlur = async (_e, data, column, isChanged, value, initialValue) => {
    if (isChanged && parseFloat(value) !== parseFloat(initialValue)) {
      if (column.colId === "sma_percentage") {
        if (parseFloat(value) < 0) {
          props.displaySnackMessages(NEGATIVE_VALUE_VALIDATION_MSG, "warning");
          data.sma_percentage = 0;
          SMATableInstance.current.api.refreshCells({
            columns: ["sma_percentage"],
          });
        } else if (parseFloat(value) > 100) {
          props.displaySnackMessages(
            USER_RESERVE_PERCENTAGE_VALIDATION_MSG,
            "warning"
          );
          data.sma_percentage = initialValue;
          SMATableInstance.current.api.refreshCells({
            columns: ["sma_percentage"],
          });
        } else {
          data.sma_reserve_qty = (
            (value / 100) *
            data.total_reserve_qty
          ).toFixed(0);
          data.dc_reserve_qty =
            Number(data.total_reserve_qty) - Number(data.sma_reserve_qty);
          let addToNetEcom =
            Number(data.sma_reserve_qty) +
              Number(data.dc_reserve_qty) -
              Number(data.oh) <
            0
              ? 0
              : Number(data.sma_reserve_qty) +
                Number(data.dc_reserve_qty) -
                Number(data.oh);
          data.net_ecom_reserve = addToNetEcom;
          SMATableInstance.current.api.refreshCells({
            columns: ["sma_reserve_qty", "dc_reserve_qty", "net_ecom_reserve"],
          });
          updateEditedRowState(data);
        }
      }
    }
  };

  const updateEditedRowState = (data) => {
    let cloneRefInstance = cloneDeep(updatedRowEditInstance.current);
    const existingIndex = cloneRefInstance.findIndex(
      (obj) => obj.product_code === data.product_code
    );
    if (existingIndex !== -1) {
      // Replace the existing object with the new object
      cloneRefInstance[existingIndex] = data;
      setUpdatedRowEdits(cloneRefInstance);
    } else {
      // Push the new object to the state
      setUpdatedRowEdits((prevState) => [...prevState, data]);
    }
  };

  const callSMAUpdate = async () => {
    try {
      let body = {
        data: updatedRowEdits.map((item) => {
          return {
            product_code: item.product_code,
            sma_percentage: item.sma_percentage,
          };
        }),
      };
      props.setConstraintsSMALoader(true);
      let response = await props.saveSMAEdits(body);
      if (response.data?.status) {
        props.displaySnackMessages("Edits saved successfully", "success");
        setUpdatedRowEdits([]);
        updatedRowEditInstance.current = [];
        SMATableInstance.current?.api?.refreshServerSideStore({
          purge: true,
        });
      }
      props.setConstraintsSMALoader(false);
    } catch (e) {
      props.setConstraintsSMALoader(false);
      props.displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };

  const setAllReq = () => {
    // if the user has done row edits and then clicks on set all, discard row edits and disable the save edits button
    setUpdatedRowEdits([]);
    updatedRowEditInstance.current = [];
    if (
      SMATableInstance.current &&
      SMATableInstance.current?.api?.checkConfiguration?.length
    ) {
      let checkAllObj =
        SMATableInstance.current?.api?.checkConfiguration[
          SMATableInstance.current?.api?.checkConfiguration?.length - 1
        ];
      if (Object.keys(checkAllObj).includes("checkAll")) {
        setProductCodePayloadValue(false);
      } else {
        setProductCodePayloadValue(true);
      }
    } else {
      setProductCodePayloadValue(true);
    }
    setOpenDialogForSetAll(true);
  };

  return (
    <div className={globalClasses.marginVertical1rem}>
      <div className={globalClasses.layoutAlignSpaceBetween}>
        <Typography variant="h4" className={globalClasses.paddingHorizontal}>
          SMA List
        </Typography>
        <div className={classes.flexRow}>
          <Button
            className={classes.alignButtons}
            color="primary"
            variant="contained"
            id="user-reserve-set-all"
            onClick={() => setAllReq()}
            disabled={!selectedRecords.length}
          >
            Set All
          </Button>
          <DownloadReport
            screenName={"sma_reserve"}
            requestBody={requestBody}
            disable={enableSMATableDownload}
          ></DownloadReport>
        </div>
      </div>
      <div className={globalClasses.marginVertical1rem}>
        <AgGridComponent
          columns={SMAColumn}
          manualCallBack={(body, pageIndex, param) =>
            manualCallBackSMAInv(body, pageIndex, param)
          }
          rowModelType="serverSide"
          serverSideStoreType="partial"
          cacheBlockSize={10}
          uniqueRowId={"product_code"}
          selectAllHeaderComponent={true}
          onSelectionChanged={onSelectionChanged}
          loadTableInstance={setNewTableInstance}
          onBlur={onBlur}
        />
      </div>
      <div className={globalClasses.centerAlign}>
        <Button
          color="primary"
          variant="contained"
          id="user-reserve-save"
          onClick={() => callSMAUpdate()}
          disabled={!updatedRowEdits?.length}
        >
          Save Edits
        </Button>
      </div>

      {openDialogForSetAll && openPopUpModal()}
    </div>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer } = store;
  return {
    setConstraintsSMALoader:
      inventorysmartReducer.inventorySmartConstraints.setConstraintsSMALoader,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    getSMAInvData: (body) => dispatch(getSMAInvData(body)),
    saveSMAEdits: (body) => dispatch(saveSMAEdits(body)),
    saveSMASetAllEdits: (body) => dispatch(saveSMASetAllEdits(body)),
    setConstraintsSMALoader: (body) => dispatch(setConstraintsSMALoader(body)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(SMATableComponent);
