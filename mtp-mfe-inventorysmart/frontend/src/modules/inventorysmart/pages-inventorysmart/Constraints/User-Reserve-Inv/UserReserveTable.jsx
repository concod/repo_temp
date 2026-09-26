import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import DownloadButton from "../../StoreInventoryAlerts/components/Download";

import { Typography } from "@mui/material";
import { Alert, Button, Modal, Panel } from "impact-ui-v3";
import SkippedCombinationsPanel from "./SkippedCombinationsPanel";
import makeStyles from "@mui/styles/makeStyles";
import moment from "moment";
import { cloneDeep, isEmpty } from "lodash";

import AgGridComponent from "core/Utils/agGrid";
import globalStyles from "core/Styles/globalStyles";
import { getColumnsAg } from "core/actions/tableColumnActions";
import Form from "core/Utils/form";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";

import {
  userReserveCheckDownload,
  getUserReserveInvData,
  setConstraintsUserReserveLoader,
  updateUserReserve,
  updateSetAllUserReserve,
  fetchUserReserveSetAllFields,
  setConstraintsUserReserveSetAllForm,
} from "../../../services-inventorysmart/Constraints/constraints-services";
import {
  ERROR_MESSAGE,
  USER_RESERVE_AND_DC_AVAILABLE_VALIDATION_MSG,
  USER_RESERVE_PERCENTAGE_VALIDATION_MSG,
  USER_RESERVE_POSITIVE_NUMBER_VALIDATION_MSG,
  USER_RESERVE_ROW_EDIT_VALIDATION_MSG,
  USER_RESERVE_PERCENTAGE_AND_DC_AVAILABLE_VALIDATION_MSG,
  MANDATORY_FIELD_MSG,
  USER_RESERVE_RESERVATION_DATE_VALIDATION_MESSAGE,
  USER_RESERVE_VALUE_VALIDATION_MESSAGE,
  INVENTORY_SUBMODULES_NAMES,
} from "../../../constants-inventorysmart/stringConstants";
import { getSelectedRowsForInfiniteRowModel } from "core/Utils/agGrid/table-functions";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import { isActionAllowedOnSubModule } from "../../inventorysmart-utility";

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
  skippedAlertWrapper: {
    zIndex: 2,
  },
  viewSkippedButton: {
    "&.MuiButton-root": {
      alignItems: "center",
      background: "#F5F6FA",
      borderRadius: "8px",
      boxShadow: "none",
      color: "#60697D",
      display: "flex",
      fontFamily: "'Manrope', sans-serif",
      fontSize: "14px",
      fontWeight: 500,
      gap: "4px",
      height: "32px",
      justifyContent: "center",
      lineHeight: "20px",
      maxHeight: "32px",
      minWidth: "56px",
      padding: "6px 12px",
      textTransform: "none",
    },
    "&.MuiButton-root:hover": {
      background: "#ECEEF5",
      boxShadow: "none",
    },
  },
}));

const UserReserveTableComponent = (props) => {
  const [userReserveInvColumn, setUserReserveInvColumn] = useState([]);
  const [selectedRecords, setSelectedRecords] = useState([]);
  const [openDialogForSetAll, setOpenDialogForSetAll] = useState(false);
  const [userReserveEditableFields, setUserReserveEditableFields] = useState(
    {}
  );
  const [updatedRowEdits, setUpdatedRowEdits] = useState([]);
  const [productCodePayloadVal, setProductCodePayloadValue] = useState("");
  const [deSelections, setDeSelections] = useState([]);
  const [showValidationModel, setShowValidationModel] = useState(false);
  const [validationFields, setValidationFields] = useState([]);
  const [userReserveSetAllForm, setUserReserveSetAllForm] = useState([]);
  const [isDisabled, setIsDisabled] = useState(true);
  const [payload, setPayload] = useState([]);
  const [pastDisabledForRTD, setPastDisabledForRTD] = useState(false);
  const [failedUpdates, setFailedUpdates] = useState([]);
  const [appliedUpdatesCount, setAppliedUpdatesCount] = useState(0);
  const [showSkippedRecords, setShowSkippedRecords] = useState(false);
  const [isSkippedAlertDismissed, setIsSkippedAlertDismissed] = useState(false);

  const userReserveFiltersRef = useRef({});
  const userReserveTableInstance = useRef(null);
  const upatedRowEditInstance = useRef([]);
  const tableMetaDataRef = useRef({});

  const globalClasses = globalStyles();
  const classes = useStyles();

  const canTakeActionOnModules = (subModuleName, action) => {
    return isActionAllowedOnSubModule(
      props.inventorysmartModulesPermission,
      props.module,
      subModuleName,
      action
    );
  };

  const enableEdit = () => {
    let editEnabled = canTakeActionOnModules(
      INVENTORY_SUBMODULES_NAMES.INVENTORY_USER_RESERVE,
      "edit"
    );
    return !editEnabled;
  };

  const handleErrorMessage = (e) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message)
      props.displaySnackMessages(errObj?.message, "error");
    else props.displaySnackMessages(ERROR_MESSAGE, "error");
    props.setConstraintsUserReserveLoader(false);
  };

  useEffect(() => {
    (async () => {
      try {
        props.setConstraintsUserReserveLoader(true);
        let col = await getColumnsAg(
          "table_name=user_reserve_and_instock_list"
        )();
        let setEditOnColumns = enableEdit();
        if (setEditOnColumns) {
          col.forEach((column) => {
            if (column.is_editable) {
              column.is_editable = false;
              column.cellRenderer = null;
            }
          });
        }
        const reservationDateColumn = col.find(
          (column) => column.column_name === "reservation_till_date"
        );
        if (reservationDateColumn) {
          reservationDateColumn?.extra?.disablePast &&
            setPastDisabledForRTD(true);
        }
        setUserReserveInvColumn(col);
        let setAllForm = await props.fetchUserReserveSetAllFields();
        props.setConstraintsUserReserveSetAllForm(setAllForm.data?.data);
        props.setConstraintsUserReserveLoader(false);
      } catch (e) {
        handleErrorMessage(e);
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

  // to remount the table data and get it back to its initial state

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
            };
          } else if (item.accessor === "quantity") {
            return {
              ...item,
              no_negative_values: true,
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
        limit: { limit: props.pageSize || 10, page: pageIndex + 1 },
      },
      filters: userReserveFiltersRef.current,
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
      setIsDisabled(pageIndex == 0 && !response.data?.data?.length);
      if (response.data?.show_message) {
        props.displaySnackMessages(response.data?.message, "success");
      }
      if (!response.data?.data?.length) {
        props.setConstraintsUserReserveLoader(false);
        return {
          data: [],
          totalCount: 0,
        };
      } else {
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
        if (upatedRowEditInstance.current?.length) {
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
      }
    } catch (e) {
      handleErrorMessage(e);
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
      props.constraintsUserReserveSetAllForm.forEach((item) => {
        let val = userReserveEditableFields[item.accessor];
        if (!val) mandatoryFieldsWithValues.push(true);
        else mandatoryFieldsWithValues.push(false);
      });
      if (mandatoryFieldsWithValues.every((val) => val)) {
        props.displaySnackMessages(MANDATORY_FIELD_MSG, "warning");
      } else if (
        userReserveEditableFields["percentage"] ||
        userReserveEditableFields["quantity"]
      ) {
        let val = userReserveEditableFields["reservation_till_date"];
        if (!val)
          props.displaySnackMessages(
            USER_RESERVE_RESERVATION_DATE_VALIDATION_MESSAGE,
            "warning"
          );
        else setAllPayload();
      } else if (userReserveEditableFields["reservation_till_date"]) {
        let val =
          userReserveEditableFields["percentage"] ||
          userReserveEditableFields["quantity"];
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

  const setAllPayload = async () => {
    try {
      closeSetAll();
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
            setAllData["quantity"] = userReserveEditableFields[item.accessor]
              ? parseInt(userReserveEditableFields[item.accessor])
              : 0;
            break;
          case "percentage":
            setAllData["percentage"] = userReserveEditableFields[item.accessor]
              ? parseFloat(userReserveEditableFields[item.accessor])
              : 0;
            break;
          default:
            setAllData[item.accessor] = userReserveEditableFields[item.accessor]
              ? userReserveEditableFields[item.accessor]
              : "";
            break;
        }
      });
      let body = {
        data: setAllData,
        filters: setFilterBody,
        meta: tableMetaDataRef.current,
        current_page: productCodePayloadVal === "checkAll" ? false : true,
      };
      let response = await props.updateSetAllUserReserve(body);
      const setAllResult = response.data?.data || {};
      const skippedCombinations = setAllResult.failed_updates || [];
      setFailedUpdates(skippedCombinations);
      setIsSkippedAlertDismissed(false);
      setAppliedUpdatesCount((setAllResult.successful_updates || []).length);
      if (response.data?.status || response.data?.show_message) {
        props.displaySnackMessages(
          response.data?.message,
          "success"
        );
        setSelectedRecords([]);
        setDeSelections([]);
        setProductCodePayloadValue("");
        // Reset check configuration or else check all value remains unchanged and wrong payload will be sent
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
      handleErrorMessage(e);
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

  const openPopUpModal = () => {
    return (
      <Panel
        anchor="right"
        open={openDialogForSetAll}
        onClose={() => closeSetAll()}
        size="large"
        width={600}
        title="Set All"
        primaryButtonLabel="Apply"
        secondaryButtonLabel="Cancel"
        secondaryButtonProps={{ variant: "secondary" }}
        onPrimaryButtonClick={() => applyEditOnSelectedRows()}
        onSecondaryButtonClick={() => closeSetAll()}
      >
        <Form
          layout={"horizontal"}
          maxFieldsInRow={1}
          handleChange={handleChangeSisterStoreAttrs}
          fields={userReserveSetAllForm}
          updateDefaultValue={false}
          defaultValues={userReserveEditableFields}
          fieldTypeWidthSpan={8}
          spacing={2}
        />
      </Panel>
    );
  };

  const handleChangeSisterStoreAttrs = (updatedFormData) => {
    setUserReserveEditableFields(updatedFormData);
  };

  const onCellValueChanged = (params) => {
    const { colDef, _node, data, newValue, oldValue } = params;
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
      if (column.colId === "user_reserve") {
        if (Number(value) > Number(data?.dc_available)) {
          props.displaySnackMessages(
            USER_RESERVE_AND_DC_AVAILABLE_VALIDATION_MSG,
            "warning",
            true,
            3000
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
      <Modal
        onClose={() => setShowValidationModel(false)}
        open={true}
        size="small"
        title="Validation Error"
      >
        <>
          <Typography variant="h6" className={globalClasses.marginBottom}>
            {USER_RESERVE_ROW_EDIT_VALIDATION_MSG}{" "}
            {dynamicLabelsBasedOnTenant("article_number")} -{" "}
          </Typography>
          <Typography variant="h6" className={globalClasses.marginBottom}>
            {validationFields.join(",")}
          </Typography>
        </>
      </Modal>
    );
  };

  const callUserReserveUpdate = async () => {
    try {
      let body = {
        data: updatedRowEdits.map((item) => {
          let reqObj = {
            product_code: item?.product_code,
            quantity: item?.user_reserve,
            dc_code: item?.dc_code,
            comment: item?.comment ? item?.comment : "",
            reservation_till_date: item?.reservation_till_date
              ? moment(item?.reservation_till_date).format("YYYY-MM-DD")
              : null,
            instock_inclusion: item?.instock_inclusion === "Yes" ? true : false,
            article: item.article,
            pack_type_id: item?.pack_type_id ? item?.pack_type_id : null,
            percentage: item?.user_reserve_percentage
              ? item?.user_reserve_percentage
              : null,
          };
          if (item.channel) {
            reqObj.channel = item.channel;
          }
          return reqObj;
        }),
      };
      const pastDatesArray = body.data.filter((item) => {
        const itemDate = moment(item?.reservation_till_date, "YYYY-MM-DD");
        // Check if the date is in the past
        return itemDate.isBefore(moment(), "day");
      });
      if (pastDatesArray.length && pastDisabledForRTD) {
        props.displaySnackMessages(
          "Can't save as the data being saved may contain past dates",
          "error"
        );
        return;
      }
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
              skuList.push(replaceSpecialCharacter(item?.article));
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
        if (response.data?.status || response.data?.show_message) {
          props.displaySnackMessages(response.data?.message, "success");
          setUpdatedRowEdits([]);
          setValidationFields([]);
          upatedRowEditInstance.current = [];
          // call the table api to fetch interdependent col with updated values
          userReserveTableInstance.current?.api?.refreshServerSideStore({
            purge: true,
          });
        }
        props.setConstraintsUserReserveLoader(false);
      }
    } catch (e) {
      handleErrorMessage(e);
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
        checkConfiguration[checkConfiguration?.length - 3]; // when Select all is chosen and then few rows are unselected, checkAll key is available in last third position within the config followed by selected and unselected values
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

  const renderActionButtons = () => {
    let options = [];
    if (failedUpdates.length && isSkippedAlertDismissed) {
      options.push(
        <Button
          size="large"
          type="default"
          variant="tertiary"
          id="user-reserve-view-skipped"
          className={classes.viewSkippedButton}
          onClick={() => setShowSkippedRecords(true)}
        >
          {`View Skipped (${failedUpdates.length})`}
        </Button>
      );
    }
    if (selectedRecords?.length > 0) {
      options.push(
        <Button
          size="large"
          type="default"
          variant="tertiary"
          id="user-reserve-set-all"
          onClick={() => setAllReq()}
          disabled={!selectedRecords.length || enableEdit()}
        >
          Set All
        </Button>
      );
    }
    if (updatedRowEdits?.length && !enableEdit()) {
      options.push(
        <Button
          size="large"
          type="default"
          variant="primary"
          id="user-reserve-save"
          onClick={() => callUserReserveUpdate()}
        >
          Save
        </Button>
      );
    }
    if (props.excelDownload?.includes("user_reserve")) {
      options.push(
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
      );
    }
    return options;
  };

  const renderSkippedAlert = () => {
    if (!failedUpdates.length || isSkippedAlertDismissed) {
      return null;
    }
    return (
      <div className={classes.skippedAlertWrapper}>
        <Alert
          severity="error"
          title={`${failedUpdates.length} Combinations Skipped. Previous Reserves Retained.`}
          actionName={`View Skipped (${failedUpdates.length})`}
          onAction={() => setShowSkippedRecords(true)}
          onClose={() => setIsSkippedAlertDismissed(true)}
          subtleBackground
        />
      </div>
    );
  };

  return (
    <div className={globalClasses.paddingTop_12}>
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
        cacheBlockSize={props.pageSize || 10}
        uniqueRowId={"unique_key"}
        onRowSelected
        selectAllHeaderComponent={true}
        onSelectionChanged={onSelectionChanged}
        loadTableInstance={setNewTableInstance}
        onBlur={onBlur}
        onCellValueChanged={onCellValueChanged}
        paginationPageSize={props.pageSize}
        disablePaginationForSinglePage={true}
        tableHeader="User Reserve and instock list"
        topCenterOptions={renderSkippedAlert()}
        topRightOptions={renderActionButtons()}
      />

      {openDialogForSetAll && openPopUpModal()}
      {showValidationModel && showValidationPopUp()}
      {showSkippedRecords && (
        <SkippedCombinationsPanel
          open={showSkippedRecords}
          onClose={() => setShowSkippedRecords(false)}
          appliedCount={appliedUpdatesCount}
          failedUpdates={failedUpdates}
        />
      )}
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
    constraintsUserReserveSetAllForm:
      inventorysmartReducer.inventorySmartConstraints
        .constraintsUserReserveSetAllForm,
    excelDownload:
      inventorysmartReducer?.inventorySmartConstraints?.userReserveConfigs
        ?.excelDownload,
    inventorysmartModulesPermission:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartModulesPermission,
    pageSize:
      store.inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.inventorysmart_page_count,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    getUserReserveInvData: (body) => dispatch(getUserReserveInvData(body)),
    updateUserReserve: (body) => dispatch(updateUserReserve(body)),
    updateSetAllUserReserve: (body) => dispatch(updateSetAllUserReserve(body)),
    setConstraintsUserReserveLoader: (body) =>
      dispatch(setConstraintsUserReserveLoader(body)),
    setConstraintsUserReserveSetAllForm: (body) =>
      dispatch(setConstraintsUserReserveSetAllForm(body)),
    fetchUserReserveSetAllFields: () =>
      dispatch(fetchUserReserveSetAllFields()),
    userReserveCheckDownload: (payload) =>
      dispatch(userReserveCheckDownload(payload)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(UserReserveTableComponent);
