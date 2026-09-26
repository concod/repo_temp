import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import DownloadButton from "../../StoreInventoryAlerts/components/Download";

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
  Grid,
  IconButton,
  FormControl,
  FormControlLabel,
  Switch,
  FormGroup,
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

import { Button as IAButton } from "impact-ui";
import UploadHandler from "core/commonComponents/uploadHandler";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import {
  USER_RESERVE_FILE_UPLOAD_INSTRUCTIONS} from "core/pages/store-grouping/grouping-contants/stringConstants";

import {
  userReserveCheckDownload,
  getUserReserveInvData,
  setConstraintsUserReserveLoader,
  updateUserReserve,
  updateSetAllUserReserve,
  fetchUserReserveSetAllFields,
  setConstraintsUserReserveSetAllForm,
  fetchSetAllSKUCount,
  setAllTableData,
  uploadUserReserveFile,
} from "../../../services-inventorysmart/Constraints/constraints-services";
import {
  ERROR_MESSAGE,
  USER_RESERVE_AND_DC_AVAILABLE_VALIDATION_MSG,
  USER_RESERVE_PERCENTAGE_VALIDATION_MSG,
  USER_RESERVE_POSITIVE_NUMBER_VALIDATION_MSG,
  USER_RESERVE_ROW_EDIT_VALIDATION_MSG,
  USER_RESERVE_PERCENTAGE_AND_DC_AVAILABLE_VALIDATION_MSG,
  MIN_ARTICLE_SELECTION_MESSAGE,
  MIN_ARTICLE_SELECTION_MESSAGE_rl,
  MANDATORY_FIELD_MSG,
  USER_RESERVE_RESERVATION_DATE_VALIDATION_MESSAGE,
  USER_RESERVE_VALUE_VALIDATION_MESSAGE,
  SAVE_REQUEST_BACKGROUND,
  SET_ALL_VALID_ROWS,
  NEGATIVE_USER_RESERVE_VALIDATION_MSG,
  NEGATIVE_USER_RESERVE_PERCENT_MSG,
  RESERVE_UN_RESERVED_VALIDATION_MSG,
  USER_RESERVE_NEGATIVE_PERCENTAGE_VALIDATION_MSG,
  NO_UPDATE,
  USER_RESERVE_VALUE_VALIDATION_MSG,
  USER_RESERVE_NEGATIVE_VALUE_VALIDATION_MSG,
} from "../../../constants-inventorysmart/stringConstants";
import { fetchProductCodes } from "../../inventorysmart-utility";
import LoadingOverlay from "core/Utils/Loader/loader";
import { getObjectsAfterCheckAll } from "../../StoreInventoryAlerts/components/AlertsActionPopup";
import { getSelectedRowsForInfiniteRowModel } from "core/Utils/agGrid/table-functions";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import { CREATE_ALLOCATION } from "modules/inventorysmart/constants-inventorysmart/routesConstants";
import { addSnack } from "core/actions/snackbarActions";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import { updateCheckConfiguration } from "../../StoreInventoryAlerts/components/inventory_alerts_utiltiy";

const useStyles = makeStyles((theme) => ({
  alignButtons: {
    display: "flex",
    justifyContent: "flex-end",
  },
  button: {
    margin: `0 ${theme.typography.pxToRem(5)}`,
    "&:nth-of-type(1)": {
      marginLeft: 0,
    },

    "&:last-child()": {
      marginRight: 0,
    },
  },
}));

const UserReserveTableComponent = (props) => {
  const [toggle, setToggle] = useState(false);
  const [loader, setLoader] = useState(false);
  const [showloading,setShowloading]=useState(false)
  const [filterdallocate, setfilterdallocate] = useState(false);
  const [userReserveInvColumn, setUserReserveInvColumn] = useState([]);
  const [selectedRecords, setSelectedRecords] = useState([]);
  const [openDialogForSetAll, setOpenDialogForSetAll] = useState(false);
  const [userReserveEditableFields, setUserReserveEditableFields] = useState(
    {}
  );
  const [confirmSetAll, setConfirmSetAll] = useState(false);
  const [updatedRowEdits, setUpdatedRowEdits] = useState([]);
  const [productCodePayloadVal, setProductCodePayloadValue] = useState("");
  const [deSelections, setDeSelections] = useState([]);
  const [showValidationModel, setShowValidationModel] = useState(false);
  const [validationFields, setValidationFields] = useState([]);
  const [unmount, setUnmount] = useState(false);
  const [userReserveSetAllForm, setUserReserveSetAllForm] = useState([]);
  const [isDisabled, setIsDisabled] = useState(true);
  const [payload, setPayload] = useState([]);
  const [saveJobId, setJobId] = useState("");
  const [displaySetAllSKUCount, setDisplaySetAllSKUCount] = useState(0);
  const [displaySetAllRecordCount, setDisplaySetAllRecordCount] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [setAPayload, saveSetAllPayload] = useState({
    body: {},
  });
  const userReserveFiltersRef = useRef({});
  const userReserveTableInstance = useRef(null);
  const upatedRowEditInstance = useRef([]);
  const tableMetaDataRef = useRef({});
  const validationHandler = useRef();

  const globalClasses = globalStyles();
  const classes = useStyles();
  let emptyValues = [null, undefined, ""];

  const {inventorysmart_constraints} = props.inventorysmartScreenConfig || {};
  const { userReserve } = inventorysmart_constraints || {};
  const { negativeUserReserve, toggleReserve, doNotPreserveTableEdits, toggleSetAllDiasble } = userReserve || {};
  const [cnaBtnDisabled, setCnaBtnDisabled] = useState(negativeUserReserve);


  useEffect(() => {
    if(props.columndef) {
      (async () => {
        try {
          props.setConstraintsUserReserveLoader(true);
          let col = await getColumnsAg(
            "table_name=user_reserve_and_instock_list"
          )();
          setUserReserveInvColumn(col);
          let setAllForm = await props.fetchUserReserveSetAllFields();
          props.setConstraintsUserReserveSetAllForm(setAllForm.data?.data);
          props.setcolumndef(false)
          props.setConstraintsUserReserveLoader(false);
        } catch (e) {
          props.setConstraintsUserReserveLoader(false);
          props.displaySnackMessages(ERROR_MESSAGE, "error");
        }
      })();
    }
  }, [props.columndef]);

  

  useEffect(() => {
    if (!isEmpty(props.selectedFilters)) {
      userReserveFiltersRef.current = props.selectedFilters;
      setUnmount(true);
    }
  }, [props.selectedFilters]);

  useEffect(() => {
    if (!isEmpty(updatedRowEdits))
      upatedRowEditInstance.current = cloneDeep(updatedRowEdits);
  }, [updatedRowEdits]);

  // to remount the table data and get it back to its initial state
  useEffect(() => {
    if (unmount) setUnmount(false);
  }, [unmount]);

  useEffect(() => {
    if (props.constraintsUserReserveSetAllForm?.length) {
      let setAllFormConfig = props.constraintsUserReserveSetAllForm.map(
        (item) => {
          if (item.accessor === "reservation_till_date") {
            return {
              ...item,
              disablePast: true,
              disableFuture: false,
            };
          } else if (item.accessor === "percentage") {
            return {
              ...item,
              value_type: "percentage",
              ...(negativeUserReserve && {is_negative_value_allowed : true, maxNegativePer:true})
            };
          } else return item;
        }
      );
      let editableFieldKeys = props.constraintsUserReserveSetAllForm.map(
        (item) => {
          return {
            [item.accessor]: "",
          };
        }
      );
      let editableFieldKeysObject = Object.assign({}, ...editableFieldKeys);
      setUserReserveEditableFields(editableFieldKeysObject);
      setUserReserveSetAllForm(setAllFormConfig);
    }
  }, [props.constraintsUserReserveSetAllForm]);

  const manualCallBackUserReserverInv = async (
    manualbody,
    pageIndex,
    params
  ) => {
    tableMetaDataRef.current = manualbody;
    let body = {
      meta: {
        ...manualbody,
        limit: { limit: 10, page: pageIndex + 1 },
      },
      filters: userReserveFiltersRef.current,
      filterreserve: toggle,
      filterallocated: filterdallocate,
    };
    try {
      if (
        props.inventorysmartScreenConfigForInfiniteScrolling?.includes(
          "userReserve"
        )
      ) {
        pageIndex == 0 && props.setConstraintsUserReserveLoader(true);
      } else {
        props.setConstraintsUserReserveLoader(true);
      }
      setPayload(body);
      let response = await props.getUserReserveInvData(body);
      setIsDisabled(pageIndex == 0 && !response.data.data.length);
      let formattedData;
      if (pageIndex) {
        formattedData = agGridRowFormatter(
          response.data.data,
          params?.api?.checkConfiguration,
          props.uniqueKey
        );
      } else {
        params.api.setCheckConfiguration([]);
        formattedData = response.data.data;
      }

      props.setConstraintsUserReserveLoader(false);
      let userReserveInv = formattedData?.map((item) => {
        return {
          ...item,
          instock_inclusion: item?.instock_inclusion ? "Yes" : "No",
          user_reserve_percentage: item.user_reserve_percentage
            ? parseFloat(item.user_reserve_percentage).toFixed(2)
            : "",
        };
      });
      // to preserve row edits when the user has not saved the edits and has applied a new filter
      if (!doNotPreserveTableEdits && upatedRowEditInstance.current?.length) {
        userReserveInv = userReserveInv.map((item) => {
          if (
            upatedRowEditInstance.current.some(
              (obj) => Number(obj.unique_key) === Number(item.unique_key)
            )
          ) {
            let matchingObject = upatedRowEditInstance.current.find(
              (val) => Number(val.unique_key) === Number(item.unique_key)
            );
            return matchingObject;
          } else return item;
        });
      }
      props.setConstraintsUserReserveLoader(false);
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

  const selectionsForRowModel = (params) => {
    const l_rowModelType = params.api.getModel().getType();
    if (l_rowModelType == "infinite") {
      return getSelectedRowsForInfiniteRowModel(params);
    } else {
      return params.api.getSelectedRows();
    }
  };

  const onSelectionChanged = (event) => {
    // let selections = event.api.getSelectedRows();
    let selections = selectionsForRowModel(event);
    setSelectedRecords(selections);
    let deSelectedRows = event.api
      ?.getRenderedNodes()
      ?.filter((node) => !node.selected)
      ?.map((rowNode) => rowNode.data);
    setDeSelections(deSelectedRows);
  };

  const closeSetAll = () => {
    setOpenDialogForSetAll(false);
    setUserReserveEditableFields({});
  };

  const applyEditOnSelectedRows = () => {
    let mandatoryFieldsWithValues = [];
    if (dynamicLabelsBasedOnTenant("article") === "Material") {
      props.constraintsUserReserveSetAllForm.forEach((item) => {
        let val = userReserveEditableFields[item.accessor];
        if (!val) mandatoryFieldsWithValues.push(true);
        else mandatoryFieldsWithValues.push(false);
      });
      if (mandatoryFieldsWithValues.every((val) => val))
        props.displaySnackMessages(MANDATORY_FIELD_MSG, "warning");
      else setAllPayload();
    } else {
      //signet - user reserve and reservation date fields are independent of instock inclusion field
      props.constraintsUserReserveSetAllForm.forEach((item) => {
        let val = userReserveEditableFields[item.accessor];
        if (!val) mandatoryFieldsWithValues.push(true);
        else mandatoryFieldsWithValues.push(false);
      });
      if (mandatoryFieldsWithValues.every((val) => val)) {
        props.displaySnackMessages(MANDATORY_FIELD_MSG, "warning");
      } else if (userReserveEditableFields["percentage"]) {
        // If this field has a value check reservation_till_date
        let val = userReserveEditableFields["reservation_till_date"];
        if (!val)
          props.displaySnackMessages(
            USER_RESERVE_RESERVATION_DATE_VALIDATION_MESSAGE,
            "warning"
          );
        else setAllPayload();
      } else if (userReserveEditableFields["reservation_till_date"]) {
        // If this field has a value check percentage
        let val = userReserveEditableFields["percentage"];
        if (!val)
          props.displaySnackMessages(
            USER_RESERVE_VALUE_VALIDATION_MESSAGE,
            "warning"
          );
        else setAllPayload();
      } else {
        setAllPayload();
      }
    }
  };

  const attachCallBacks = (callback) => {
    validationHandler.current = { validate: callback };
  };

  const handleUpload = async (file) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await props.uploadUserReserveFile(formData);
      props.addSnack({
        message:
          res?.message || 
          "Please wait for notification to be received shortly",
        options: {
          variant: "success",
        },
      });
      setIsModalOpen(false);
    } catch (error) {
      if (error.response?.data?.data?.length) {
        validationHandler.current.validate(error.response?.data?.data);
      } else {
        props.addSnack({
          message: error?.data?.message || "Something went wrong.",
          options: {
            variant: "error",
          },
        });
        validationHandler.current.validate([]);
      }
    }
  };

  const setAllPayload = async () => {
    
      props.setConstraintsUserReserveLoader(true);
      let setFilterBody = [];
      // if select all is checked - no changes in filter payload
      if (productCodePayloadVal === "checkAll") {
        setFilterBody = userReserveFiltersRef.current;
      }
      // if select current rows or manually rows are checked - send selected rows in the payload
      if (productCodePayloadVal === "checkedRows") {
        setFilterBody = updateProductCodeInFilterConfig();
      }
      // if select all is checked and the user deselects few rows - send the deselected row values in payload
      if (productCodePayloadVal === "unCheckedRows") {
        setFilterBody = updateProductCodeNotInFilterConfig();
      }
      let setAllData = {};
      props.constraintsUserReserveSetAllForm.forEach((item) => {
        switch (item.accessor) {
          case "instock_inclusion":
            setAllData["instock_inclusion"] =
              userReserveEditableFields?.instock_inclusion === "Yes"
                ? true
                : false;
            break;
          case "reservation_till_date":
            setAllData["reservation_till_date"] = userReserveEditableFields[
              item.accessor
            ]
              ? moment(userReserveEditableFields?.reservation_till_date).format(
                  "YYYY-MM-DD"
                )
              : null;
            break;
          case "quantity":
            if (props?.inventorysmartScreenConfig?.client === '_EU') {
              setAllData["quantity"] = userReserveEditableFields[item.accessor] === ""
                ? null : parseInt(userReserveEditableFields[item.accessor]);
            } else {
            setAllData["quantity"] = userReserveEditableFields[item.accessor]
              ? parseInt(userReserveEditableFields[item.accessor])
              : props?.setAllCustomDefaultValue?.hasOwnProperty("quantity") ? props?.setAllCustomDefaultValue?.quantity : 0;
            }
            break;
          case "percentage":
            if (props?.inventorysmartScreenConfig?.client === '_EU') {
              setAllData["percentage"] = userReserveEditableFields[item.accessor] === ""
                ? null : parseInt(userReserveEditableFields[item.accessor]);
            } else {
            setAllData["percentage"] = userReserveEditableFields[item.accessor]
              ? parseFloat(userReserveEditableFields[item.accessor])
              : props.inventorysmartScreenConfig?.client==="signet" ? null : (props?.setAllCustomDefaultValue?.hasOwnProperty("percentage") ? props?.setAllCustomDefaultValue?.percentage : 0);
            }
            break;
          default:
            setAllData[item.accessor] = userReserveEditableFields[item.accessor]
              ? userReserveEditableFields[item.accessor]
              : "";
            break;
        }
      });
      let body ;
     if (dynamicLabelsBasedOnTenant("article") === "SKU" || props.customSetAll === "estimationApi"){
        body = {
          values: {"user_reserve_update_setall": true,...setAllData},
          filters: setFilterBody,
          meta: tableMetaDataRef.current,
        };
        saveSetAllPayload({ body: body });
        try{
        let skuCountResponse = await props.fetchSetAllSKUCount(body,"user-reserve-update-setall");
          setJobId(skuCountResponse.data?.data?.job_id);
          setDisplaySetAllSKUCount(skuCountResponse.data?.data?.sku_count);
          setDisplaySetAllRecordCount(
            skuCountResponse.data?.data?.record_count
          );
          setShowloading(false);
          setOpenDialogForSetAll(false);
          props.setConstraintsUserReserveLoader(false);
          // open a popup
          setConfirmSetAll(true);
          
        }
        catch (err) {
          setShowloading(false);
          setUnmount(true)
          displaySnackMessages(ERROR_MESSAGE, "error");
          closeSetAll();
        
      }}
      else{
        try{
      body = {
        data: setAllData,
        filters: setFilterBody,
        meta: tableMetaDataRef.current,
      };
      let response = await props.updateSetAllUserReserve(body);
      if (response.data?.status) {
        props.displaySnackMessages("Set all updated", "success");
        setSelectedRecords([]);
        setDeSelections([]);
        setProductCodePayloadValue("");
        // Reset check configuration or else check all value remians unchanged and wrong payload will be sent
        userReserveTableInstance.current?.api?.setCheckConfiguration([]);
        setUnmount(true);
        // to reset header checkbox selection
        userReserveTableInstance.current?.api?.deselectAll();
      }
      closeSetAll();
      if(negativeUserReserve && setAllData?.percentage === null){
      props.displaySnackMessages(SET_ALL_VALID_ROWS , "info");
      }
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
        attribute_name: "unique_key",
        operator: "in",
        dimension: "product",
        filter_id: "unique_key",
        values: selectedRecords.map((item) => item.unique_key),
      },
    ];
  };
  const callSetAllSaveApi = async (reqBody) => {
    try {
      setShowloading(true);
      if (dynamicLabelsBasedOnTenant("article") === "SKU"  || props.customSetAll === "estimationApi") {
        await props.setAllTableData(
          { body: reqBody, jobIdCheck: saveJobId },
          "user-reserve-update-setall"
        );

        setShowloading(false);

        setConfirmSetAll(false);
        userReserveTableInstance.current.api.refreshCells({ purge: true });
        displaySnackMessages(
          SAVE_REQUEST_BACKGROUND,
          "info"
        );
        setSelectedRecords([]);
        setUserReserveEditableFields({});
        setDeSelections([]);
        userReserveTableInstance.current?.api?.deselectAll();
        userReserveTableInstance.current?.api?.setCheckConfiguration([]);
      }
    } catch (err) {
      setShowloading(false);
      setUserReserveEditableFields({});
      setOpenDialogForSetAll(false);
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };
  const updateProductCodeNotInFilterConfig = () => {
    return [
      ...userReserveFiltersRef.current,
      {
        filter_type: "cascaded",
        attribute_name: "unique_key",
        operator: "not in",
        dimension: "product",
        filter_id: "unique_key",
        values: deSelections.map((item) => item.unique_key),
      },
    ];
  };
  const openConfirmationPopUp = () => {
    const tenantArticle = dynamicLabelsBasedOnTenant("article");
    return (
      <Dialog
        open={confirmSetAll}
        onClose={() => setConfirmSetAll(false)}
        maxWidth="sm"
        fullWidth={true}
      >
        <DialogTitle>Confirm Set All</DialogTitle>
        <LoadingOverlay loader={showloading}>
          <DialogContent>
            {Number(displaySetAllRecordCount) < 100000 ? (
              <Typography variant="h6">
                Set All operation is being applied for {displaySetAllSKUCount}{" "}
                number of{" "}
                {dynamicLabelsBasedOnTenant("constraint") === "SetAll"
                  ? (tenantArticle ? `${tenantArticle}/${tenantArticle}'s` : "Material/Material's")
                  : "SKU/SKU's"}{" "}
                {displaySetAllRecordCount &&
                  `and ${displaySetAllRecordCount} number of`}{" "}
                {dynamicLabelsBasedOnTenant("constraint") === "SetAll"
                  ? (tenantArticle ? `${tenantArticle}-Store` : "Material-Store")
                  : "SKU-Store"}{" "}
                combinations.Please confirm to proceed.
              </Typography>
            ) : (
              <Typography variant="h6">
                Record Count is more than 100000. Please add some more filters
              </Typography>
            )}
          </DialogContent>
        </LoadingOverlay>
        <DialogActions>
          <Button
            variant="outlined"
            color="primary"
            onClick={() => setConfirmSetAll(false)}
          >
            Cancel
          </Button>
          {Number(displaySetAllRecordCount) < 100000 && (
            <Button
              variant="contained"
              color="primary"
              onClick={() => callSetAllSaveApi(setAPayload.body)}
            >
              Ok
            </Button>
          )}
        </DialogActions>
      </Dialog>
    );
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
              fields={userReserveSetAllForm}
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

  const handleChangeSisterStoreAttrs = (updatedFormData, fieldName) => {
    const newFormData = {};

    Object.keys(updatedFormData).forEach(key => {
        newFormData[key] = key === fieldName ? updatedFormData[key] : "";
    });

    setUserReserveEditableFields(negativeUserReserve ? newFormData : updatedFormData);
  };

  const onCellValueChanged = (params) => {
    const { colDef, node, data, newValue, oldValue } = params;
    // These columns are not present in RL hence the cond
    if (dynamicLabelsBasedOnTenant("article") !== "Material") {
      if (colDef.column_name === "reservation_till_date") {
        data.reservation_till_date = newValue;
        userReserveTableInstance.current.api.refreshCells({
          columns: ["reservation_till_date"],
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
      if (oldValue !== newValue) {
        if (colDef.column_name === "instock_inclusion") {
          data.instock_inclusion = newValue;
          userReserveTableInstance.current.api.refreshCells({
            columns: ["instock_inclusion"],
          });
          updateEditedRowState(data);
        }
      }
    } else return;
  };

  const onBlur = async (_e, data, column, isChanged, value, initialValue) => {
    if (isChanged && Number(value) !== Number(initialValue)) {
      const netAvailableDc = props?.netAvailableDc || (negativeUserReserve ? "net_available" : "dc_available");
      if (column.colId === "user_reserve") {
        if (value === "" || value === "-") {
          data.user_reserve = "";
          userReserveTableInstance.current.api.refreshCells({
            columns: ["user_reserve"],
          });
          return;
        }
        if (Number(value) > Number(data?.[netAvailableDc])) {
          props.displaySnackMessages(
            negativeUserReserve ? USER_RESERVE_VALUE_VALIDATION_MSG : USER_RESERVE_AND_DC_AVAILABLE_VALIDATION_MSG,
            "warning"
          );
          data.user_reserve = initialValue;
          userReserveTableInstance.current.api.refreshCells({
            columns: ["user_reserve"],
          });
        }
        else if (negativeUserReserve && Number(value) < 0 && (Number(value) + Number(data?.total_units_reserved)) < 0) {
          props.displaySnackMessages(USER_RESERVE_NEGATIVE_VALUE_VALIDATION_MSG, "warning");
          data.user_reserve = initialValue;
          userReserveTableInstance.current.api.refreshCells({
            columns: ["user_reserve"],
          });
        }
        else {
          if (negativeUserReserve) {
            data.user_reserve_percentage = null;
            userReserveTableInstance.current.api.refreshCells({
              columns: ["user_reserve_percentage"],
            });
          }
          else {
            data.user_reserve_percentage =
              Number(data[netAvailableDc]) === 0 || Number(data?.[netAvailableDc]) < 0
                ? 0
                : ((100 * value) / data?.[netAvailableDc]).toFixed(2);
            userReserveTableInstance.current.api.refreshCells({
              columns: ["user_reserve_percentage"],
            });
          }
          updateEditedRowState(data);
        }
      }
      if (column.colId === "user_reserve_percentage") {

        if (props.inventorysmartScreenConfig?.client === '_EU') {
          const parsedValue = parseFloat(value);

          if (parsedValue > 100) {
            props.displaySnackMessages(USER_RESERVE_PERCENTAGE_VALIDATION_MSG, "warning");
            data.user_reserve_percentage = initialValue;
          } else if (parsedValue < -100) {
            props.displaySnackMessages(USER_RESERVE_NEGATIVE_PERCENTAGE_VALIDATION_MSG, "warning");
            data.user_reserve_percentage = initialValue;
          }
          else {
            data.user_reserve = null;
          }
          userReserveTableInstance.current.api.refreshCells({
            columns: ["user_reserve_percentage", "user_reserve"],
          });

          updateEditedRowState(data);
        } else {
          if (Number(data?.[netAvailableDc]) <= 0) {
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
              negativeUserReserve ? USER_RESERVE_VALUE_VALIDATION_MSG : USER_RESERVE_PERCENTAGE_VALIDATION_MSG,
              "warning"
            );
            data.user_reserve_percentage = initialValue;
            userReserveTableInstance.current.api.refreshCells({
              columns: ["user_reserve_percentage"],
            });
          } else if (negativeUserReserve && parseFloat(value) < -100) {
            props.displaySnackMessages(
              USER_RESERVE_NEGATIVE_VALUE_VALIDATION_MSG,
              "warning"
            );
            data.user_reserve_percentage = initialValue;
            userReserveTableInstance.current.api.refreshCells({
              columns: ["user_reserve_percentage"],
            });

          } else if (negativeUserReserve && data?.total_units_reserved < 1 && -100 <= parseFloat(value) < 0) {
            props.displaySnackMessages(
              RESERVE_UN_RESERVED_VALIDATION_MSG,
              "warning"
            );
            data.user_reserve_percentage = initialValue;
            userReserveTableInstance.current.api.refreshCells({
              columns: ["user_reserve_percentage"],
            });
          }
          else if (!negativeUserReserve && value < 0) {
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
            if (negativeUserReserve) {
              data.user_reserve = 0;
              userReserveTableInstance.current.api.refreshCells({
                columns: ["user_reserve"],
              });
            }
            else {
              data.user_reserve = Math.floor((value / 100) * data?.[netAvailableDc]);
              userReserveTableInstance.current.api.refreshCells({
                columns: ["user_reserve"],
              });
            }
            updateEditedRowState(data);
          }
        }
      }
    }
  };

  const updateEditedRowState = (data) => {
    let cloneRefInstance = cloneDeep(upatedRowEditInstance.current);
    const existingIndex = cloneRefInstance.findIndex(
      (obj) => obj.unique_key === data.unique_key
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

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const navigateToCreateAllocation = () => {
    let l_selectedRows = getSelectedRowsForInfiniteRowModel(
      userReserveTableInstance.current
    );
    let l_selectedArticles = l_selectedRows?.map((val) => val.article);

    if (l_selectedArticles?.length === 0) {
      (props.inventorysmartScreenConfig?.client==="_NA"||props.inventorysmartScreenConfig?.client === "_EU")?
      displaySnackMessages(MIN_ARTICLE_SELECTION_MESSAGE_rl, "error"):
      displaySnackMessages(MIN_ARTICLE_SELECTION_MESSAGE, "error")
    } else {
      let appliedFilter = userReserveFiltersRef.current;
      let l_checkAllConfig = getObjectsAfterCheckAll(
        userReserveTableInstance?.current?.api?.checkConfiguration
      );

      let l_articlesFilteredFromFilterSection = appliedFilter
        ?.filter((val) => val?.filter_id === "article")?.[0]
        ?.values?.join();

      let l_updatedCheckConfiguration = updateCheckConfiguration(
        l_checkAllConfig,
        l_articlesFilteredFromFilterSection
      );

      localStorage.setItem(
        "selectedFiltersDependency",
        JSON.stringify(appliedFilter || [])
      );
      localStorage.setItem(
        "selectedArticles",
        JSON.stringify(l_selectedArticles || [])
      );

      localStorage.setItem("type", JSON.stringify("userReserve"));

      if (l_updatedCheckConfiguration) {
        localStorage.setItem(
          "filtered_selection",
          JSON.stringify(l_updatedCheckConfiguration || null)
        );
      }

      window.open(
        `${CREATE_ALLOCATION}?step=0&type=userReserve`,
        "_blank",
        "noopener,noreferrer"
      );
    }
  };

  const getKeyVal = (p_item) => {
    if (p_item.user_reserve == null) {
      return { percentage: p_item?.user_reserve_percentage };
    }
    else {
      return { quantity: p_item?.user_reserve };
    }
  };

  const filterEmptyValues = (data) => {
   return data.filter( item => item?.user_reserve !== "").filter(item => item?.user_reserve_percentage !== "") 
  }

  const callUserReserveUpdate = async () => {
    try {
      let nonEmptyEditedRows = updatedRowEdits;
      if (negativeUserReserve) {
        nonEmptyEditedRows = filterEmptyValues(updatedRowEdits);
        if (nonEmptyEditedRows.length === 0) {
          props.displaySnackMessages(NO_UPDATE, "warning");
          return;
        }
      }
      let body = {
        data: nonEmptyEditedRows.map((item) => {
          let user_reserve = emptyValues.includes(item.user_reserve) ? 0 : item.user_reserve;
          let reqObj = {
            product_code: item.product_code,
            ...(negativeUserReserve ? getKeyVal(item) :{quantity: user_reserve}),
            dc_code: item.dc_code,
            comment: item?.comment ? item?.comment : "",
            reservation_till_date: item?.reservation_till_date
              ? moment(item?.reservation_till_date).format("YYYY-MM-DD")
              : null,
            instock_inclusion: item?.instock_inclusion === "Yes" ? true : false,
            article: item.article,
          };
          if (item.channel) {
            reqObj.channel = item.channel;
          }
          if (item.pack_type_id) {
            reqObj.pack_type_id = item.pack_type_id;
          }
          return reqObj;
        }),
      };
      let validationCheck = [];
      // This validation check is applicable only in signet
      if (dynamicLabelsBasedOnTenant("article") !== "Material") {
        let skuList = [];
        body.data?.forEach((item) => {
          // allow user to save details when instock inclusion is changed and user reserve and reservation date is null
          if (!item.quantity && !item?.reservation_till_date) {
            validationCheck.push(false);
          } else {
            // When either of the two keys is entered a value (user reserve and reservation date) and if the other one is null throw a validation
            if (
              (item.quantity !== 0 && !item.quantity) ||
              !item?.reservation_till_date
            ) {
              skuList.push(item.article);
              setValidationFields(skuList);
              validationCheck.push(true);
            } else validationCheck.push(false);
          }
        });
      }
      if (validationCheck.some((val) => val)) {
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
          // call the table api to fetch interdependent col with updated values
          setUnmount(true);
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
     let checkConfiguration =
       userReserveTableInstance.current?.api?.checkConfiguration;
     let checkAllKeysAtIndexTwo =
       checkConfiguration[checkConfiguration?.length - 2]; // when Select all is chosen, checkAll key is available in last second position within the config
     let checkAllKeysAtIndexThree =
       checkConfiguration[checkConfiguration?.length - 3]; // when Select all is chosen and then few rows are unselected, checkAll key is available in last third position within the config followed by selected and unselected 
     let latestCheckUncheckObj =
       checkConfiguration[checkConfiguration?.length - 1]; // recent operation done, check or uncheck
     if (
       !isEmpty(checkAllKeysAtIndexTwo) &&
       Object.keys(checkAllKeysAtIndexTwo).includes("checkAll")
     ) {
       setProductCodePayloadValue("checkAll");
     } else if (
       !isEmpty(checkAllKeysAtIndexThree) &&
       Object.keys(checkAllKeysAtIndexThree).includes("checkAll") &&
       !isEmpty(latestCheckUncheckObj) &&
       Object.keys(latestCheckUncheckObj).includes("unCheckedRows")
     ) {
       setProductCodePayloadValue("unCheckedRows");
     } else {
       // any of the case apart the above cond should be sent with the payload having in operator of uniqueKey filters
       setProductCodePayloadValue("checkedRows");
     }
   }
   setOpenDialogForSetAll(true);
  };

  const toggledSwitch = () => {
    setToggle(!toggle);
    if(negativeUserReserve){
      setCnaBtnDisabled(toggle);
    }
    setLoader(true);
    setUnmount(true);
    props.setConstraintsUserReserveLoader(true);
  };
  const filterdAllocated = () => {
    setfilterdallocate(!filterdallocate);
    setUnmount(true);
    props.setConstraintsUserReserveLoader(true);
  };

  return (
    <div className={globalClasses.marginVertical1rem}>
      <div className={globalClasses.layoutAlignSpaceBetween}>
      {props.inventorysmartScreenConfig?.client==="signet"  ? (
          <Typography variant="h4" className={globalClasses.paddingHorizontal}>
            User Reserve and instock list
          </Typography>
        ) : (
          <Typography variant="h4" className={globalClasses.paddingHorizontal}>
            User Reserve
          </Typography>
        )}
        <div
          className={`${globalClasses.gap} ${globalClasses.layoutAlignSpaceBetween}`}
        >
          {props.inventorysmartScreenConfig?.inventorysmart_constraints
            ?.userReserve?.toggleReserve && (
            <FormControl component="fieldset">
              <FormGroup>
                <FormControlLabel
                  style={{ marginLeft: "10px" }}
                  control={<Switch checked={toggle} onChange={toggledSwitch} />}
                  label={"Show Reserved"}
                />
              </FormGroup>
            </FormControl>
          )}
          {props.inventorysmartScreenConfig?.userReserveUpload && (
            <div>
              <IAButton
                variant="primary"
                id="uploadConstraints"
                onClick={() => setIsModalOpen(true)}
                icon={FileUploadIcon}
              />
              <UploadHandler
                handleUpload={handleUpload}
                isModalOpen={isModalOpen}
                setIsModalOpen={setIsModalOpen}
                attachCallBacks={attachCallBacks}
                jsonUpload={false}
                templateConfig={[]}
                macroIdPath={"user_reserve_vba_template"}
                uploadInstructions={[...USER_RESERVE_FILE_UPLOAD_INSTRUCTIONS]}
                tenantUploadConfig={{}}
                templateName={"BackDoorAllocationTemplate"}
              />
            </div>
          )}
          {props.inventorysmartScreenConfig?.inventorysmart_constraints
            ?.userReserve?.filterallocated && (
            <FormControl component="fieldset">
              <FormGroup>
                <FormControlLabel
                  style={{ marginLeft: "10px" }}
                  control={
                    <Switch
                      checked={filterdallocate}
                      onChange={filterdAllocated}
                    />
                  }
                  label={"Show allocated reserve"}
                />
              </FormGroup>
            </FormControl>
          )}
          {props.excelDownload?.includes("user_reserve") && (
            <DownloadButton
              url={
                "/inventory-smart/reporting/generate_reports?report_type=user-reserve"
              }
              disable={isDisabled}
              requestBody={payload}
              isCustomDownloadCheckRequired={true}
              customDownloadCheckAPI={props.userReserveCheckDownload}
              excludeURLObject={null}
              includeExclusionFilter={true}
              columns={userReserveInvColumn}
            />
          )}
          <Button
            className={classes.alignButtons}
            color="primary"
            variant="contained"
            id="user-reserve-set-all"
            onClick={() => setAllReq()}
            disabled={
                toggleSetAllDiasble
                ? !selectedRecords.length || toggle
                : !selectedRecords.length
            }
          >
            Set All
          </Button>
        </div>
      </div>
      {!unmount && (
        <div className={globalClasses.marginVertical1rem}>
          <AgGridComponent
            {...(props.inventorysmartScreenConfigForInfiniteScrolling?.includes(
              "userReserve"
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
            columns={userReserveInvColumn}
            manualCallBack={(body, pageIndex, param) =>
              manualCallBackUserReserverInv(body, pageIndex, param)
            }
            cacheBlockSize={10}
            onRowSelected
            uniqueRowId={"unique_key"}
            selectAllHeaderComponent={true}
            onSelectionChanged={onSelectionChanged}
            loadTableInstance={setNewTableInstance}
            onBlur={onBlur}
            onCellValueChanged={onCellValueChanged}
            applyBudgetTableFormatting={negativeUserReserve}
          />
        </div>
      )}

      <div className={globalClasses.centerAlign}>
      
        {/* commented beacuse of MTP-95393  */
        /* <Button
          color="primary"
          variant="contained"
          id="user-reserve-save"
          onClick={() => navigateToCreateAllocation()}
          className={classes.button}
          disabled={(props.inventorysmartScreenConfig?.inventorysmart_constraints?.userReserve?.disableBtn?.some(
            (val) =>
              props?.selectedFilters
                ?.filter((value) => value.attribute_name == "channel")?.[0]
                ?.values?.includes(val)
          ) || cnaBtnDisabled)}
        >
          Create Allocation
        </Button> */}
        <Button
          color="primary"
          variant="contained"
          id="user-reserve-save"
          onClick={() => callUserReserveUpdate()}
          disabled={!updatedRowEdits?.length}
          className={classes.button}
        >
          Save Edits
        </Button>
      </div>

      {openDialogForSetAll && openPopUpModal()}
      {showValidationModel && showValidationPopUp()}
      {confirmSetAll && openConfirmationPopUp()}
    </div>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer } = store;
  return {
    inventorysmartScreenConfigForInfiniteScrolling:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfigForInfiniteScrolling,
    constraintsUserReserveLoader:
      inventorysmartReducer.inventorySmartConstraints
        .constraintsUserReserveLoader,
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    constraintsUserReserveSetAllForm:
      inventorysmartReducer.inventorySmartConstraints
        .constraintsUserReserveSetAllForm,
    excelDownload:
      store.inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.inventorysmart_constraints?.excelDownload,
    customSetAll: store.inventorysmartReducer.inventorySmartCommonService
    ?.inventorysmartScreenConfig?.inventorysmart_constraints
    ?.customSetAll,
    netAvailableDc: store.inventorysmartReducer.inventorySmartCommonService
    ?.inventorysmartScreenConfig?.inventorysmart_constraints
    ?.netAvailableDc,
    setAllCustomDefaultValue: store.inventorysmartReducer.inventorySmartCommonService
    ?.inventorysmartScreenConfig?.inventorysmart_constraints
    ?.setAllCustomDefaultValue,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    getUserReserveInvData: (body) => dispatch(getUserReserveInvData(body)),
    updateUserReserve: (body) => dispatch(updateUserReserve(body)),
    updateSetAllUserReserve: (body) => dispatch(updateSetAllUserReserve(body)),
    setConstraintsUserReserveLoader: (body) =>
      dispatch(setConstraintsUserReserveLoader(body)),
    addSnack: (payload) => dispatch(addSnack(payload)),
    setConstraintsUserReserveSetAllForm: (body) =>
      dispatch(setConstraintsUserReserveSetAllForm(body)),
    fetchUserReserveSetAllFields: () =>
      dispatch(fetchUserReserveSetAllFields()),
    userReserveCheckDownload: (payload) =>
      dispatch(userReserveCheckDownload(payload)),
    fetchSetAllSKUCount: (body, screen) =>
      dispatch(fetchSetAllSKUCount(body, screen)),
    setAllTableData: (body, screen) =>
      dispatch(setAllTableData(body, screen)),
    uploadUserReserveFile: (payload) => {
      dispatch(uploadUserReserveFile(payload),)
    },
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(UserReserveTableComponent);
