import React, { useState, useEffect, useRef } from "react";
import globalStyles from "core/Styles/globalStyles";
import { Typography } from "@mui/material";
import { Button, Modal } from "impact-ui-v3";
import Loader from "core/Utils/Loader/loader";
import { connect } from "react-redux";
import { isEmpty, cloneDeep } from "lodash";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import AgGridComponent from "core/Utils/agGrid";
import moment from "moment";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import {
  USER_RESERVE_AND_DC_AVAILABLE_VALIDATION_MSG,
  USER_RESERVE_PERCENTAGE_AND_DC_AVAILABLE_VALIDATION_MSG,
  USER_RESERVE_PERCENTAGE_VALIDATION_MSG,
  USER_RESERVE_POSITIVE_NUMBER_VALIDATION_MSG,
  MANDATORY_FIELD_MSG,
  USER_RESERVE_RESERVATION_DATE_VALIDATION_MESSAGE,
  USER_RESERVE_VALUE_VALIDATION_MESSAGE,
  USER_RESERVE_ROW_EDIT_VALIDATION_MSG,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import Form from "core/Utils/form";
import { getSelectedRowsForInfiniteRowModel } from "core/Utils/agGrid/table-functions";
import {
  setDcUserReserveLoader,
  getDcUserReserveInvHold,
  updateUserReserve,
  updateSetAllUserReserve,
  fetchUserReserveSetAllFields,
  setConstraintsUserReserveSetAllForm,
} from "modules/inventorysmart/services-inventorysmart/Constraints/constraints-services";
import { getColumnsAg } from "core/actions/tableColumnActions";

const DCReserveTable = (props) => {
  const [selectedRecords, setSelectedRecords] = useState([]);
  const [dcReserveCol, setDcReserveCol] = useState([]);
  const [validationFields, setValidationFields] = useState([]);
  const [showValidationModel, setShowValidationModel] = useState(false);
  const [openDialogForSetAll, setOpenDialogForSetAll] = useState(false);
  const [updatedRowEdits, setUpdatedRowEdits] = useState([]);
  const [enableSave, setEnableSave] = useState(false);
  const [userReserveEditableFields, setUserReserveEditableFields] = useState(
    {}
  );
  const [productCodePayloadVal, setProductCodePayloadValue] = useState("");
  const [deSelections, setDeSelections] = useState([]);
  const [userReserveSetAllForm, setUserReserveSetAllForm] = useState([]);
  const [setAllLoader, updateSetAllLoader] = useState(false);

  const tableMetaDataRef = useRef({});
  const dcUserReserveFiltersRef = useRef([]);
  const dcUserReserveTableInstance = useRef(null);
  const upatedRowEditInstance = useRef([]);

  const globalClasses = globalStyles();

  useEffect(() => {
    getColumnConfigs();
  }, []);

  useEffect(() => {
    if (!isEmpty(props.filterDependency)) {
      dcUserReserveFiltersRef.current = props.filterDependency;
      dcUserReserveTableInstance.current?.api?.refreshServerSideStore({
        purge: true,
      });
      setUpdatedRowEdits([]);
    }
  }, [props.filterDependency]);

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

  useEffect(() => {
    if (!isEmpty(updatedRowEdits)) {
      upatedRowEditInstance.current = cloneDeep(updatedRowEdits);
      let validationCheck = true;
      let updatedData = cloneDeep(updatedRowEdits);
      updatedData.map((item) => {
        if (!(item.user_reserve && item.reservation_till_date)) {
          validationCheck = false;
        }
      });
      setEnableSave(validationCheck);
    } else {
      setEnableSave(false);
    }
  }, [updatedRowEdits]);

  const getColumnConfigs = async () => {
    let col = [];
    col = await getColumnsAg("table_name=user_reserve_and_instock_list")();
    col = col.map((item) => {
      item = { ...item, isMulti: item?.extra?.is_multiple_selection };
      return item;
    });
    setDcReserveCol(col);
    let setAllForm = await props.fetchUserReserveSetAllFields();
    props.setConstraintsUserReserveSetAllForm(setAllForm.data?.data);
  };

  const setNewTableInstance = (params) => {
    dcUserReserveTableInstance.current = params;
  };

  const manualCallBackDcUserReserver = async (
    manualbody,
    pageIndex,
    params
  ) => {
    props.setDcUserReserveLoader(true);
    tableMetaDataRef.current = manualbody;
    let body = {
      meta: {
        ...manualbody,
        limit: { limit: props.pageSize || 10, page: pageIndex + 1 },
      },
      filters: dcUserReserveFiltersRef.current,
    };
    try {
      let response = await props.getDcUserReserveInvHold(body);
      if (response.data?.show_message) {
        props.displaySnackMessages(response.data?.message, "success");
      }
      if (!response.data?.data?.length) {
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
        return {
          data: userReserveInv,
          totalCount: response.data?.total,
        };
      }
    } catch (e) {
      props.handleErrorMessage(e);
      return {
        data: [],
        totalCount: 0,
      };
    } finally {
      props.setDcUserReserveLoader(false);
    }
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
          };
          if (item.channel) {
            reqObj.channel = item.channel;
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
        props.setDcUserReserveLoader(true);
        let response = await props.updateUserReserve(body);
        if (response.data?.status || response.data?.show_message) {
          props.displaySnackMessages(response.data?.message, "success");
          setUpdatedRowEdits([]);
          setValidationFields([]);
          upatedRowEditInstance.current = [];
          // call the table api to fetch interdependent col with updated values
          dcUserReserveTableInstance.current?.api?.refreshServerSideStore({
            purge: true,
          });
        }
        props.setDcUserReserveLoader(false);
      }
    } catch (e) {
      props.handleErrorMessage(e);
    }
  };

  const setAllReq = () => {
    // if the user has done row edits and then clicks on set all, discard row edits and disable the save edits button
    setUpdatedRowEdits([]);
    upatedRowEditInstance.current = [];
    if (
      dcUserReserveTableInstance.current &&
      dcUserReserveTableInstance.current?.api?.checkConfiguration?.length
    ) {
      let checkConfiguration =
        dcUserReserveTableInstance.current?.api?.checkConfiguration;
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

  const onCellValueChanged = (params) => {
    const { colDef, _node, data, newValue, oldValue } = params;
    // These columns are not present in RL hence the cond
    if (dynamicLabelsBasedOnTenant("article") !== "Material") {
      if (colDef.column_name === "reservation_till_date") {
        data.reservation_till_date = newValue;
        dcUserReserveTableInstance.current.api.refreshCells({
          columns: ["reservation_till_date"],
        });
        updateEditedRowState(data);
      }
      if (colDef.column_name === "comment") {
        data.comment = newValue;
        dcUserReserveTableInstance.current.api.refreshCells({
          columns: ["comment"],
        });
        updateEditedRowState(data);
      }
      if (oldValue !== newValue) {
        if (colDef.column_name === "instock_inclusion") {
          data.instock_inclusion = newValue;
          dcUserReserveTableInstance.current.api.refreshCells({
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
          dcUserReserveTableInstance.current.api.refreshCells({
            columns: ["user_reserve"],
          });
        } else {
          data.user_reserve_percentage =
            Number(data.dc_available) === 0 || Number(data.dc_available) < 0
              ? 0
              : ((100 * value) / data.dc_available).toFixed(2);
          dcUserReserveTableInstance.current.api.refreshCells({
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
          dcUserReserveTableInstance.current.api.refreshCells({
            columns: ["user_reserve_percentage"],
          });
        } else if (parseFloat(value) > 100) {
          props.displaySnackMessages(
            USER_RESERVE_PERCENTAGE_VALIDATION_MSG,
            "warning"
          );
          data.user_reserve_percentage = initialValue;
          dcUserReserveTableInstance.current.api.refreshCells({
            columns: ["user_reserve_percentage"],
          });
        } else if (value < 0) {
          // case where user enters 0 or - followed by numbers
          props.displaySnackMessages(
            USER_RESERVE_POSITIVE_NUMBER_VALIDATION_MSG,
            "warning"
          );
          data.user_reserve_percentage = initialValue;
          dcUserReserveTableInstance.current.api.refreshCells({
            columns: ["user_reserve_percentage"],
          });
        } else {
          data.user_reserve = Math.floor((value / 100) * data.dc_available);
          dcUserReserveTableInstance.current.api.refreshCells({
            columns: ["user_reserve"],
          });
          updateEditedRowState(data);
        }
      }
    }
  };

  const handleChangeSisterStoreAttrs = (updatedFormData) => {
    setUserReserveEditableFields(updatedFormData);
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
      } else if (
        userReserveEditableFields["percentage"] ||
        userReserveEditableFields["quantity"]
      ) {
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
      updateSetAllLoader(true);
      props.setDcUserReserveLoader(true);
      let setFilterBody = [];
      // if select all is checked - no changes in filter payload
      if (productCodePayloadVal === "checkAll") {
        setFilterBody = dcUserReserveFiltersRef.current;
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
      };
      let response = await props.updateSetAllUserReserve(body);
      if (response.data?.status || response.data?.show_message) {
        props.displaySnackMessages(response.data?.message, "success");
        setSelectedRecords([]);
        setDeSelections([]);
        setProductCodePayloadValue("");
        // Reset check configuration or else check all value remains unchanged and wrong payload will be sent
        dcUserReserveTableInstance.current?.api?.setCheckConfiguration([]);
        dcUserReserveTableInstance.current?.api?.refreshServerSideStore({
          purge: true,
        });
        // to reset header checkbox selection
        dcUserReserveTableInstance.current?.api?.deselectAll();
      }
      closeSetAll();
      props.setDcUserReserveLoader(false);
    } catch (e) {
      props.handleErrorMessage(e);
    } finally {
      updateSetAllLoader(false);
    }
  };

  const closeSetAll = () => {
    setOpenDialogForSetAll(false);
    setUserReserveEditableFields({});
  };

  const updateProductCodeInFilterConfig = () => {
    return [
      ...dcUserReserveFiltersRef.current,
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
      ...dcUserReserveFiltersRef.current,
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

  const openPopUpModal = () => {
    return (
      <Modal
        open={openDialogForSetAll}
        onClose={() => setOpenDialogForSetAll(false)}
        size="small"
        title="Set All"
        primaryButtonLabel="Apply"
        secondaryButtonLabel="Cancel"
        onPrimaryButtonClick={() => applyEditOnSelectedRows()}
        onSecondaryButtonClick={() => closeSetAll()}
      >
        <Loader loader={setAllLoader}>
          <Form
            layout={"horizontal"}
            maxFieldsInRow={2}
            handleChange={handleChangeSisterStoreAttrs}
            fields={userReserveSetAllForm}
            updateDefaultValue={false}
            defaultValues={userReserveEditableFields}
            fieldTypeWidthSpan={4}
            spacing={2}
            withPortal={true}
          />
        </Loader>
      </Modal>
    );
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

  const renderActionButtons = () => {
    const options = [
      <Button
        size="large"
        type="default"
        variant="tertiary"
        id="user-reserve-set-all"
        onClick={() => setAllReq()}
        disabled={!selectedRecords.length}
      >
        Set All
      </Button>,
      <Button
        size="large"
        type="default"
        variant="primary"
        id="user-reserve-save"
        onClick={() => callUserReserveUpdate()}
        disabled={!enableSave}
      >
        Save
      </Button>,
    ];
    return options;
  };

  return (
    <div>
      <AgGridComponent
        rowModelType="serverSide"
        serverSideStoreType="partial"
        columns={dcReserveCol}
        manualCallBack={(body, pageIndex, param) =>
          manualCallBackDcUserReserver(body, pageIndex, param)
        }
        cacheBlockSize={props.pageSize || 10}
        paginationPageSize={props.pageSize}
        disablePaginationForSinglePage={true}
        uniqueRowId={"unique_key"}
        loadTableInstance={setNewTableInstance}
        onBlur={onBlur}
        onRowSelected
        onCellValueChanged={onCellValueChanged}
        selectAllHeaderComponent={true}
        onSelectionChanged={onSelectionChanged}
        topRightOptions={renderActionButtons()}
      />
      {openDialogForSetAll && openPopUpModal()}
      {showValidationModel && showValidationPopUp()}
    </div>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer } = store;
  return {
    constraintsUserReserveSetAllForm:
      inventorysmartReducer.inventorySmartConstraints
        .constraintsUserReserveSetAllForm,
    dcUserReserveLoader:
      inventorysmartReducer.inventorySmartConstraints.dcUserReserveLoader,
    pageSize: inventorysmartReducer.inventorySmartCommonService.inventorysmartScreenConfig?.inventorysmart_page_count,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    setDcUserReserveLoader: (body) => dispatch(setDcUserReserveLoader(body)),
    getDcUserReserveInvHold: (body) => dispatch(getDcUserReserveInvHold(body)),
    updateUserReserve: (body) => dispatch(updateUserReserve(body)),
    updateSetAllUserReserve: (body) => dispatch(updateSetAllUserReserve(body)),
    fetchUserReserveSetAllFields: () =>
      dispatch(fetchUserReserveSetAllFields()),
    setConstraintsUserReserveSetAllForm: (body) =>
      dispatch(setConstraintsUserReserveSetAllForm(body)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(DCReserveTable);
