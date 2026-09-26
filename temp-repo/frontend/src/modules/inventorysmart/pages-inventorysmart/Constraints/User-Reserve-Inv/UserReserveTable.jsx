import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
  Grid,
  IconButton,
} from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import moment from "moment";
import { cloneDeep, isEmpty } from "lodash";
import CloseIcon from "@mui/icons-material/Close";

import AgGridComponent from "core/Utils/agGrid";
import Loader from "core/Utils/Loader/loader";
import globalStyles from "core/Styles/globalStyles";
import { getColumnsAg } from "core/actions/tableColumnActions";
import Form from "core/Utils/form";

import {
  getUserReserveInvData,
  setConstraintsUserReserveLoader,
  updateUserReserve,
  updateSetAllUserReserve,
} from "../../../services-inventorysmart/Constraints/constraints-services";
import {
  ERROR_MESSAGE,
  USER_RESERVE_SET_ALL_FIELDS,
  USER_RESERVE_SET_ALL_FORM,
  USER_RESERVE_MANDATORY_FIELDS_MSG,
  USER_RESERVE_AND_DC_AVAILABLE_VALIDATION_MSG,
  USER_RESERVE_PERCENTAGE_VALIDATION_MSG,
  USER_RESERVE_POSITIVE_NUMBER_VALIDATION_MSG,
  USER_RESERVE_ROW_EDIT_VALIDATION_MSG,
  USER_RESERVE_PERCENTAGE_AND_DC_AVAILABLE_VALIDATION_MSG,
} from "../../../constants-inventorysmart/stringConstants";
const useStyles = makeStyles(() => ({
  alignButtons: {
    display: "flex",
    justifyContent: "flex-end",
  },
}));

const UserReserveTableComponent = (props) => {
  const [userReserveInvColumn, setUserReserveInvColumn] = useState([]);
  const [selectedRecords, setSelectedRecords] = useState([]);
  const [openDialogForSetAll, setOpenDialogForSetAll] = useState(false);
  const [userReserveEditableFields, setUserReserveEditableFields] = useState(
    USER_RESERVE_SET_ALL_FIELDS
  );
  const [updatedRowEdits, setUpdatedRowEdits] = useState([]);
  const [productCodePayloadVal, setProductCodePayloadValue] = useState(true);
  const [deSelections, setDeSelections] = useState([]);
  const [showValidationModel, setShowValidationModel] = useState(false);
  const [validationFields, setValidationFields] = useState([]);

  const userReserveFiltersRef = useRef({});
  const userReserveTableInstance = useRef(null);
  const upatedRowEditInstance = useRef([]);

  const globalClasses = globalStyles();
  const classes = useStyles();

  useEffect(() => {
    (async () => {
      try {
        props.setConstraintsUserReserveLoader(true);
        let col = await getColumnsAg(
          "table_name=user_reserve_and_instock_list"
        )();
        setUserReserveInvColumn(col);
        props.setConstraintsUserReserveLoader(false);
      } catch (e) {
        props.setConstraintsUserReserveLoader(false);
        props.displaySnackMessages(ERROR_MESSAGE, "error");
      }
    })();
  }, []);

  useEffect(() => {
    if (!isEmpty(props.selectedFilters)) {
      userReserveFiltersRef.current = props.selectedFilters;
      userReserveTableInstance.current?.api?.refreshServerSideStore({
        purge: true,
      });
    }
  }, [props.selectedFilters]);

  useEffect(() => {
    if (!isEmpty(updatedRowEdits))
      upatedRowEditInstance.current = cloneDeep(updatedRowEdits);
  }, [updatedRowEdits]);

  const manualCallBackUserReserverInv = async (manualbody, pageIndex) => {
    let body = {
      meta: {
        ...manualbody,
        limit: { limit: 10, page: pageIndex + 1 },
      },
      filters: userReserveFiltersRef.current,
    };
    try {
      let response = await props.getUserReserveInvData(body);
      props.setConstraintsUserReserveLoader(false);
      let userReserveInv = response.data.data?.map((item) => {
        return {
          ...item,
          instock_inclusion: item?.instock_inclusion ? "Yes" : "No",
          user_reserve_percentage: item.user_reserve_percentage
            ? parseFloat(item.user_reserve_percentage).toFixed(2)
            : "",
        };
      });
      // to preserve row edits when the user has not saved the edits and has applied a new filter
      if (upatedRowEditInstance.current?.length) {
        userReserveInv = userReserveInv.map((item) => {
          if (
            upatedRowEditInstance.current.some(
              (obj) => Number(obj.product_code) === Number(item.product_code)
            )
          ) {
            let matchingObject = upatedRowEditInstance.current.find(
              (val) => Number(val.product_code) === Number(item.product_code)
            );
            return matchingObject;
          } else return item;
        });
      }
      return {
        data: userReserveInv,
        totalCount: response.data.total,
      };
    } catch (e) {
      props.setConstraintsUserReserveLoader(false);
      props.displaySnackMessages(ERROR_MESSAGE, "error");
      return {
        data: [],
        totalCount: 0,
      };
    }
  };

  const setNewTableInstance = (params) => {
    userReserveTableInstance.current = params;
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
    setUserReserveEditableFields({
      quantity: 0,
      reservation_till_date: "",
      in_stock_inclusion: "",
      comment: "",
    });
  };

  const applyEditOnSelectedRows = async () => {
    if (
      !userReserveEditableFields.quantity ||
      !userReserveEditableFields.reservation_till_date ||
      userReserveEditableFields.instock_inclusion === ""
    ) {
      props.displaySnackMessages(USER_RESERVE_MANDATORY_FIELDS_MSG, "warning");
    } else {
      try {
        props.setConstraintsUserReserveLoader(true);
        let setFilterBody = [];
        // if select all is checked - no changes in filter payload
        if (!productCodePayloadVal) {
          setFilterBody = userReserveFiltersRef.current;
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
          data: {
            quantity: userReserveEditableFields?.quantity,
            reservation_till_date: moment(
              userReserveEditableFields?.reservation_till_date
            ).format("YYYY-MM-DD"),
            instock_inclusion:
              userReserveEditableFields?.instock_inclusion === "Yes"
                ? true
                : false,
            comment: userReserveEditableFields?.comment
              ? userReserveEditableFields?.comment
              : "",
          },
          filters: setFilterBody,
        };
        let response = await props.updateSetAllUserReserve(body);
        if (response.data?.status) {
          props.displaySnackMessages("Set all updated", "success");
          setSelectedRecords([]);
          setDeSelections([]);
          setProductCodePayloadValue(true);
          // Reset check configuration or else check all value remians unchanged and wrong payload will be sent
          userReserveTableInstance.current?.api?.setCheckConfiguration([]);
          userReserveTableInstance.current?.api?.refreshServerSideStore({
            purge: true,
          });
          // to reset header checkbox selection
          userReserveTableInstance.current?.api?.deselectAll();
        }
        closeSetAll();
        props.setConstraintsUserReserveLoader(false);
      } catch (e) {
        props.setConstraintsUserReserveLoader(false);
        props.displaySnackMessages(ERROR_MESSAGE, "error");
      }
    }
  };

  const updateProductCodeInFilterConfig = () => {
    return [
      ...userReserveFiltersRef.current,
      {
        filter_type: "cascaded",
        attribute_name: "product_code",
        operator: "in",
        dimension: "product",
        filter_id: "product_code",
        values: selectedRecords.map((item) => item.product_code),
      },
    ];
  };

  const updateProductCodeNotInFilterConfig = () => {
    return [
      ...userReserveFiltersRef.current,
      {
        filter_type: "cascaded",
        attribute_name: "product_code",
        operator: "not in",
        dimension: "product",
        filter_id: "product_code",
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
        <Loader loader={props.constraintsUserReserveLoader}>
          <DialogContent>
            <Form
              layout={"horizontal"}
              maxFieldsInRow={1}
              handleChange={handleChangeSisterStoreAttrs}
              fields={USER_RESERVE_SET_ALL_FORM}
              updateDefaultValue={false}
              defaultValues={userReserveEditableFields}
              fieldTypeWidthSpan={4} // to ask about this design later
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
        </Loader>
      </Dialog>
    );
  };

  const handleChangeSisterStoreAttrs = (updatedFormData) => {
    setUserReserveEditableFields(updatedFormData);
  };

  const onCellValueChanged = (params) => {
    const { colDef, node, data, newValue, oldValue } = params;
    if (colDef.column_name === "reservation_till_date") {
      data.reservation_till_date = newValue;
      userReserveTableInstance.current.api.refreshCells({
        columns: ["reservation_till_date"],
      });
      updateEditedRowState(data);
    }
    if (oldValue !== newValue) {
      if (colDef.column_name === "instock_inclusion") {
        data.instock_inclusion = newValue;
        userReserveTableInstance.current.api.refreshCells({
          columns: ["instock_inclusion"],
        });
        updateEditedRowState(data);
      }
      if (colDef.column_name === "comment") {
        data.comment = newValue;
        userReserveTableInstance.current.api.refreshCells({
          columns: ["comment"],
        });
        updateEditedRowState(data);
      }
    }
  };

  const onBlur = async (_e, data, column, isChanged, value, initialValue) => {
    if (isChanged && Number(value) !== Number(initialValue)) {
      if (column.colId === "user_reserve") {
        if (Number(value) > Number(data?.dc_available)) {
          props.displaySnackMessages(
            USER_RESERVE_AND_DC_AVAILABLE_VALIDATION_MSG,
            "warning"
          );
          data.user_reserve = initialValue;
          userReserveTableInstance.current.api.refreshCells({
            columns: ["user_reserve"],
          });
        } else {
          data.user_reserve_percentage =
            Number(data.dc_available) === 0 || Number(data.dc_available) < 0
              ? 0
              : ((100 * value) / data.dc_available).toFixed(2);
          userReserveTableInstance.current.api.refreshCells({
            columns: ["user_reserve_percentage"],
          });
          updateEditedRowState(data);
        }
      }
      if (column.colId === "user_reserve_percentage") {
        if (Number(data.dc_available) <= 0) {
          props.displaySnackMessages(
            USER_RESERVE_PERCENTAGE_AND_DC_AVAILABLE_VALIDATION_MSG,
            "warning"
          );
          data.user_reserve_percentage = 0;
          userReserveTableInstance.current.api.refreshCells({
            columns: ["user_reserve_percentage"],
          });
        } else if (parseFloat(value) > 100) {
          props.displaySnackMessages(
            USER_RESERVE_PERCENTAGE_VALIDATION_MSG,
            "warning"
          );
          data.user_reserve_percentage = initialValue;
          userReserveTableInstance.current.api.refreshCells({
            columns: ["user_reserve_percentage"],
          });
        } else if (value < 0) {
          // case where user enters 0 or - followed by numbers
          props.displaySnackMessages(
            USER_RESERVE_POSITIVE_NUMBER_VALIDATION_MSG,
            "warning"
          );
          data.user_reserve_percentage = initialValue;
          userReserveTableInstance.current.api.refreshCells({
            columns: ["user_reserve_percentage"],
          });
        } else {
          data.user_reserve = Math.floor((value / 100) * data.dc_available);
          userReserveTableInstance.current.api.refreshCells({
            columns: ["user_reserve"],
          });
          updateEditedRowState(data);
        }
      }
    }
  };

  const updateEditedRowState = (data) => {
    let cloneRefInstance = cloneDeep(upatedRowEditInstance.current);
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

  const showValidationPopUp = () => {
    return (
      <Dialog
        onClose={() => setShowValidationModel(false)}
        maxWidth={"sm"}
        aria-labelledby="customized-dialog-title"
        open={true}
        fullWidth={true}
        disableEscapeKeyDown={true}
      >
        <DialogTitle id="customized-dialog-title">
          <Grid
            container
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="h4" gutterBottom>
              {"Validation Error"}
            </Typography>
            <IconButton
              aria-label="close"
              onClick={() => setShowValidationModel(false)}
              size="large"
            >
              <CloseIcon />
            </IconButton>
          </Grid>
        </DialogTitle>
        <DialogContent>
          <Typography variant="h6" className={globalClasses.marginBottom}>
            {USER_RESERVE_ROW_EDIT_VALIDATION_MSG}
          </Typography>
          <Typography variant="h6" className={globalClasses.marginBottom}>
            {validationFields.join(",")}
          </Typography>
        </DialogContent>
      </Dialog>
    );
  };

  const callUserReserveUpdate = async () => {
    try {
      let body = {
        data: updatedRowEdits.map((item) => {
          return {
            product_code: item.product_code,
            quantity: item.user_reserve,
            dc_code: item.dc_code,
            comment: item.comment ? item.comment : "",
            reservation_till_date: item?.reservation_till_date
              ? moment(item?.reservation_till_date).format("YYYY-MM-DD")
              : null,
            instock_inclusion: item?.instock_inclusion === "Yes" ? true : false,
            article: item.article,
          };
        }),
      };
      let validationCheck = false;
      let skuList = [];
      body.data?.forEach((item) => {
        // allow user to save details when instock inclusion is changed and user reserve and reservation date is null
        if (!item.quantity && !item.reservation_till_date) {
          validationCheck = false;
        } else {
          // When either of the two keys is entered a value (user reserve and reservation date) and if the other one is null throw a validation
          if (
            (item.quantity !== 0 && !item.quantity) ||
            !item.reservation_till_date
          ) {
            skuList.push(item.article);
            setValidationFields(skuList);
            validationCheck = true;
          } else validationCheck = false;
        }
      });
      if (validationCheck) {
        setShowValidationModel(true);
      } else {
        setShowValidationModel(false);
        props.setConstraintsUserReserveLoader(true);
        let response = await props.updateUserReserve(body);
        if (response.data?.status) {
          props.displaySnackMessages("Edits saved successfully", "success");
          setUpdatedRowEdits([]);
          setValidationFields([]);
          upatedRowEditInstance.current = [];
          userReserveTableInstance.current?.api?.refreshServerSideStore({
            purge: true,
          });
        }
        props.setConstraintsUserReserveLoader(false);
      }
    } catch (e) {
      props.setConstraintsUserReserveLoader(false);
      props.displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };

  const setAllReq = () => {
    // if the user has done row edits and then clicks on set all, discard row edits and disable the save edits button
    setUpdatedRowEdits([]);
    upatedRowEditInstance.current = [];
    if (
      userReserveTableInstance.current &&
      userReserveTableInstance.current?.api?.checkConfiguration?.length
    ) {
      let checkAllObj =
        userReserveTableInstance.current?.api?.checkConfiguration[
          userReserveTableInstance.current?.api?.checkConfiguration?.length - 1
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
          User Reserve and instock list
        </Typography>
        <Button
          className={classes.alignButtons}
          color="primary"
          variant="contained"
          id="user-reserve-set-all"
          onClick={() => setAllReq()}
          disabled={
            props.inventorysmartScreenConfig?.dynamicLabels?.article === "SKU"
              ? !selectedRecords.length
              : true // to disable set all in RL for time being
          }
        >
          Set All
        </Button>
      </div>
      <div className={globalClasses.marginVertical1rem}>
        <AgGridComponent
          columns={userReserveInvColumn}
          manualCallBack={(body, pageIndex, param) =>
            manualCallBackUserReserverInv(body, pageIndex, param)
          }
          rowModelType="serverSide"
          serverSideStoreType="partial"
          cacheBlockSize={10}
          uniqueRowId={"product_code"}
          selectAllHeaderComponent={true}
          onSelectionChanged={onSelectionChanged}
          loadTableInstance={setNewTableInstance}
          onBlur={onBlur}
          onCellValueChanged={onCellValueChanged}
        />
      </div>
      <div className={globalClasses.centerAlign}>
        <Button
          color="primary"
          variant="contained"
          id="user-reserve-save"
          onClick={() => callUserReserveUpdate()}
          disabled={!updatedRowEdits?.length}
        >
          Save Edits
        </Button>
      </div>

      {openDialogForSetAll && openPopUpModal()}
      {showValidationModel && showValidationPopUp()}
    </div>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer } = store;
  return {
    constraintsUserReserveLoader:
      inventorysmartReducer.inventorySmartConstraints
        .constraintsUserReserveLoader,
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    getUserReserveInvData: (body) => dispatch(getUserReserveInvData(body)),
    updateUserReserve: (body) => dispatch(updateUserReserve(body)),
    updateSetAllUserReserve: (body) => dispatch(updateSetAllUserReserve(body)),
    setConstraintsUserReserveLoader: (body) =>
      dispatch(setConstraintsUserReserveLoader(body)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(UserReserveTableComponent);
