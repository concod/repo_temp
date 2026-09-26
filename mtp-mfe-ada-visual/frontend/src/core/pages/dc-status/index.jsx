import AddIcon from "@mui/icons-material/Add";
import globalStyles from "core/Styles/globalStyles";
import AgGridComponent from "core/Utils/agGrid";
import { INVENTORY_SUBMODULES_NAMES } from "core/Utils/constants/inventorySmart-constants";
import { dateValidationMessage } from "core/Utils/functions/helpers/validation-helpers";
import { checkToDisplayToggleAttributeLevel } from "core/Utils/functions/utils";
import { isActionAllowedOnSubModule } from "core/Utils/utils";
import { setFilterConfiguration } from "core/actions/filterAction";
import { addSnack } from "core/actions/snackbarActions";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import {
  fetchFilterFieldValues,
  formattedFilterConfiguration,
} from "core/commonComponents/coreComponentScreen/utils";
import { Button, Prompt as IaPrompt } from "impact-ui-v3";
import { cloneDeep, isEmpty, isEqual, isNull } from "lodash";
import moment from "moment";
import { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { Prompt } from "react-router";
import Loader from "../../Utils/Loader/loader";
import ConfirmBox from "../../Utils/confirmPrompt/confirmPopup";
import {
  getStatusData,
  downloadTableData,
} from "../../actions/productStoreStatusActions";
import { getColumnsAg } from "../../actions/tableColumnActions";
import { END_DATE } from "../../../config/constants";
import { configureDCFCColumnDef } from "./common-functions";
import CreateDCModal from "./components/create-dc";
import {
  createNewDC,
  fetchDCstatus,
  setInlineStatusData,
  setStatusData,
} from "./dc-status-service";
import "./dcStatus.css";

const FC_TABLE_NAME = "fc_status";
const DC_TABLE_NAME = "dc_status";
import { ERROR_MESSAGE } from "../../../modules/inventorysmart/constants-inventorysmart/stringConstants";
import { IS_OVERRIDEN_CORE_BUTTON_WIDTH,IS_OVERRIDEN_CORE_BUTTON_PLACEMENT } from "core/constants";

function DCStatusScreen(props) {
  const [dccolumns, setdcColumns] = useState([]);
  const [fccolumns, setfcColumns] = useState([]);
  const [filterData, setFilterData] = useState([]);
  const [showloader, setloader] = useState(true);
  const [dcView, setdcView] = useState("dc");
  const globalClasses = globalStyles();
  const [createDC, showCreateDC] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [confirmBox, showConfirmBox] = useState(false);
  const [setAllData, updateSetAllData] = useState({});
  const [setAllInlineData, updateSetAllInlineData] = useState([]);
  const [inlineChangeError, setInlineChangeError] = useState("");
  const [flag_edit, setFlag_edit] = useState(false);
  const [showCreateDCBtn, setShowCreateDCBtn] = useState(false);
  const [showFCLevelView, setShowFCLevelView] = useState(false);
  const [selectedDcRowsIDs, setSelectedDcRowsIDs] = useState([]);
  const [selectedFcRowsIDs, setSelectedFcRowsIDs] = useState([]);
  const [editActionObj, setEditActionObj] = useState({});
  const [hasEditPermissions, setHasEditPermissions] = useState(false);
  const tableInstance = useRef({});
  const onFilterDependency = useRef(null);
  const [totalRowsCount, setTotalRowsCount] = useState(0);

  const isThreadFeatureEnabled = Boolean(
    props?.inventorysmartScreenConfig?.inventory_smart_comment_and_thread
      ?.isThreadFeatureEnabled
  );

  const setNewTableInstance = (params) => {
    tableInstance.current = params;
  };

  const handleErrorMessage = (e) => {
    const errObj = e?.response?.data;

    if (errObj?.show_message) displaySnackMessages(errObj?.message, "error");
    else displaySnackMessages(ERROR_MESSAGE, "error");
  };

  const setDcFilterConfiguration = async () => {
    if (isEmpty(props.dcFilterDashboardConfiguration)) {
      const dcFilterData = await fetchFilterFieldValues(
        "dc status",
        props.savedFilterSelection,
        props.screenName
      );
      setFilterData(dcFilterData);
      let filterConfigData = [
        {
          filterDashboardData: dcFilterData,
          isCrossDimensionFilter: false,
          screen_name: props.screenName,
        },
      ];
      if (sessionStorage.getItem("currentApp") === "inventorysmart") {
        filterConfigData[0]["saved_filter_screen_name"] =
          "Inventorysmart DC Status";
      }
      const filterConfig = formattedFilterConfiguration(
        "dcStatusDcFilterConfiguration",
        filterConfigData,
        "Dc Status DC"
      );
      props.setFilterConfiguration(filterConfig);
    }
  };

  const setFcFilterConfiguration = async () => {
    if (isEmpty(props.fcFilterDashboardConfiguration)) {
      const fcFilterData = await fetchFilterFieldValues(
        "fc status",
        props.savedFilterSelection
      );
      const filterConfigData = [
        {
          filterDashboardData: fcFilterData,
          isCrossDimensionFilter: false,
        },
      ];
      const filterConfig = formattedFilterConfiguration(
        "dcStatusFcFilterConfiguration",
        filterConfigData,
        "Dc Status FC"
      );
      props.setFilterConfiguration(filterConfig);
    }
  };

  useEffect(() => {
    const getFilterData = async () => {
      try {
        if (dcView === "dc") {
          await setDcFilterConfiguration();
        } else if (dcView === "fc") {
          await setFcFilterConfiguration();
        }
      } catch (error) {
        setloader(false);
        handleErrorMessage(error);
      }
    };

    getFilterData();
  }, [dcView]);

  useEffect(() => {
    const getInitialData = async () => {
      try {
        let permissionCheckToDisable = !!canTakeActionOnModules(
          INVENTORY_SUBMODULES_NAMES.INVENTORY_DC_STATUS,
          "edit"
        );
        const statusValues = await getStatusData("dc");
        let dcColumns = await getColumnsAg(`table_name=${DC_TABLE_NAME}`, {},{}, false, false, false, isThreadFeatureEnabled)();
        dcColumns = configureDCFCColumnDef(
          dcColumns,
          statusValues,
          permissionCheckToDisable
        );

        let fcColumns = await getColumnsAg(`table_name=${FC_TABLE_NAME}`, {},{}, false, false, false)();
        fcColumns = configureDCFCColumnDef(
          fcColumns,
          statusValues,
          permissionCheckToDisable
        );
        setdcColumns(dcColumns);
        setfcColumns(fcColumns);

        let showCreateDCBtnResp = await checkToDisplayToggleAttributeLevel(
          "core_show_create_product_store_dc",
          3
        );
        let showFCLevelViewResp = await checkToDisplayToggleAttributeLevel(
          "core_show_fc_level_view",
          3
        );
        setShowCreateDCBtn(showCreateDCBtnResp);
        setShowFCLevelView(showFCLevelViewResp);
        setHasEditPermissions(permissionCheckToDisable);
        setloader(false);
      } catch (error) {
        setloader(false);
        handleErrorMessage(error);
      }
    };

    getInitialData();
  }, []);

  // the updateSetAllDataHandler func will be called whenever some inline/direct editing happens in table
  useEffect(() => {
    updateSetAllDataHandler(editActionObj);
  }, [editActionObj]);


  /**
   * the main purpose of updateSetAllDataHandler func is to update setAllInlineData with
   * updated inline edit values and make sure there are no duplicate data passed to setAllInlineData
   * @param {data of the row which is been updated} inputActionObj
   */
  const updateSetAllDataHandler = (inputActionObj) => {
    try {
      if (!isEmpty(setAllInlineData[0])) {
        let isEdited = false;
        let setAllDataInfo = cloneDeep(setAllInlineData);
        let finalData = setAllDataInfo?.map((item) => {
          if (item?.codes[0] === inputActionObj?.codes[0]) {
            isEdited = true;
            return inputActionObj;
          }
          return item;
        });
        if (!isEdited) {
          finalData = [...finalData, inputActionObj];
        }
        updateSetAllInlineData(finalData);
      } else {
        updateSetAllInlineData([inputActionObj]);
      }
    } catch (error) {
      handleErrorMessage(error);
      console.error("updateSetAllDataHandler error", error);
    }
  };

  //This is unused because DC-FC toggle switch code is commented
  //If that is needed, this part of code will be needed
  //As this is dependant on line 594, Not removing this function
  const dcSwitch = async () => {
    if (dcView === "dc") {
      setdcView("fc");
    } else {
      setdcView("dc");
    }
  };

  /**
   *
   * isStartDateValid is a function used to validate
   * the start date entered by the user manuallly
   * @param {Array} data contains the payload which is sent to inline save api
   * @returns false if any of the start date is lesser than
   * today's date or else it will return true
   */
  const isStartDateValid = (data) => {
    //currentDate will contain today's date's value starting from 00:00 am
    let currentDate = moment().startOf("day");
    let isValid = true;
    data.forEach((rowData) => {
      let startDate = moment(rowData.attributes[0].start_date);
      if (startDate.isBefore(currentDate)) {
        isValid = false;
        return isValid;
      }
    });
    return isValid;
  };

  const postSaveTableActions = () => {
    try {
      tableInstance?.current?.api?.deselectAll(true);
      tableInstance?.current?.api?.refreshServerSideStore({ purge: false });
    } catch (err) {
      console.log(err);
    }
  };

  /**
   * the onConfirm function will be called to call the api
   * @param {the data which will be passed to the api} data
   * @param {the api will be called on the basis of the confirmType params("setAll"/"inline")} confirmType
   */
  const onConfirm = async (data, confirmType) => {
    setloader(true);
    try {
      if (confirmType === "setAll") {
        setShowModal(false);
        await setStatusData(dcView, data)();
        updateSetAllData([]);
      } else {
        setShowModal(false);

        // if the start date is not valid then throw the error
        if (!isStartDateValid(data)) {
          setloader(false);
          displaySnackMessages(
            "From date must start from today's date",
            "error"
          );
          return;
        }

        // if some error is there in inline change then throw the error
        if (inlineChangeError) {
          setloader(false);
          displaySnackMessages(inlineChangeError, "error");
          return;
        }
        let apiData = {
          body: data,
        };
        await setInlineStatusData(dcView, apiData)();
        updateSetAllInlineData([]);
      }
      setFlag_edit(false);
      displaySnackMessages(formattedRespMsg(dcView), "success");
      postSaveTableActions();
      setloader(false);
    } catch (err) {
      handleErrorMessage(err);
      setloader(false);
    }
  };

  // function is called on edit action in table
  const onCellValueChanged = (params) => {
    let isInputValueSame = false;
    if (moment.isMoment(params.newValue)) {
      isInputValueSame = moment(params.newValue).isSame(params.oldValue);
    } else {
      isInputValueSame = isEqual(params.oldValue, params.newValue);
    }
    if (!isInputValueSame) {
      const setAllObject = formatData(
        params.data,
        [params.data.dc_code],
        "inline"
      );
      setEditActionObj(setAllObject);
      // table actions
      tableInstance.current.api.refreshCells({
        force: true,
        suppressFlash: false,
        rowNodes: [params.node],
      });
      setFlag_edit(true);
      tableInstance.current.api.flashCells({ rowNodes: [params.node] });
    }
  };

  const dcTableManualCallBack = async (manualbody, pageIndex, params) => {
    if (isNull(onFilterDependency.current)) {
      return {
        data: [],
        totalCount: 0,
      }; // returning for server side pagination on ag grid
    }
    setloader(true);
    try {
      let body = {
        filters: onFilterDependency.current,
        meta: {
          ...manualbody,
          limit: { limit: props.pageSize || 10, page: pageIndex + 1 },
        },
        headers: [],
        selection: {
          data: tableInstance?.current?.api?.checkConfiguration,
          unique_columns: ["dc_code"],
        },
      };
      const response = await fetchDCstatus(body, "dc")();
      setloader(false);
      if (response?.data?.show_message) {
        displaySnackMessages(response?.data?.message, "success");
      }
      if (!response.data?.data?.length) {
        setTotalRowsCount(0);
        return {
          data: [],
          totalCount: 0,
        };
      }
      setTotalRowsCount(isNaN(Number(response?.data.total)) ? 0 : response?.data.total);
      return {
        data: response?.data.data,
        totalCount: response?.data.total,
      }; // returning for server side pagination on ag grid
    } catch (err) {
      setloader(false);
    }
  };

  const fcTableManualCallBack = async (manualbody, pageIndex, params) => {
    setloader(true);
    try {
      let body = {
        filters: onFilterDependency.current,
        meta: {
          ...manualbody,
          limit: { limit: 10, page: pageIndex + 1 },
        },
        headers: [],
      };
      const response = await fetchDCstatus(body, "fc")();
      setloader(false);
      if (response?.data?.show_message) {
        displaySnackMessages(response?.data?.message, "success");
      }
      if (!response.data?.data?.length) {
        return {
          data: [],
          totalCount: 0,
        };
      }
      return {
        data: response?.data.data,
        totalCount: response?.data.total,
      }; // returning for server side pagination on ag grid
    } catch (err) {
      handleErrorMessage(err);
      setloader(false);
    }
  };

  const onFilter = async (unsavedChangeCheck = false) => {
    if (setAllData.length !== 0 && unsavedChangeCheck) {
      showConfirmBox(true);
      throw Error("Unsaved changes");
    }
    try {
      let body = {
        meta: {
          range: [],
          sort: [],
          search: [],
          limit: { limit: 10, page: 0 },
        },
        headers: [],
      };
      tableInstance.current.api?.refreshServerSideStore({ purge: true });
      tableInstance.current.api?.deselectAll(true);
    } catch (error) {
      handleErrorMessage(error);
    }
  };

  const dateValidation = (startDate, endDate) => {
    const errMessage = dateValidationMessage(startDate, endDate);
    if (errMessage) {
      setloader(false);
      displaySnackMessages(errMessage, "error");
      throw Error("Date is not correct");
    }
  };

  const createNewProducFunc = async (dataObj, newSetAllData) => {
    setloader(true);
    try {
      let body = [];
      Object.keys(dataObj).forEach((key) => {
        if (
          key !== "store_code" &&
          dataObj[key] &&
          key !== "master_store_code"
        ) {
          let obj = {
            attribute_name: key,
            attribute_value: dataObj[key],
          };
          body.push(obj);
        }
      });
      let reqBody = {
        attributes: body,
        code: dataObj.store_code,
      };
      let setAllBody = {
        attributes: [
          {
            attribute_name: "status",
            attribute_value: newSetAllData.status,
            start_date: moment(newSetAllData.start_time).format("YYYY-MM-DD"),
            end_date: moment(newSetAllData.end_time).format("YYYY-MM-DD"),
          },
        ],
        codes: [],
      };
      dateValidation(
        setAllBody.attributes[0].start_date,
        setAllBody.attributes[0].end_date
      );
      if (dataObj.store_code) {
        const new_code = await createNewDC(dcView, reqBody)();

        setAllBody.codes = [new_code.data.data.code.toString()];
        if (Object.keys(newSetAllData).length > 0)
          await setStatusData(dcView, setAllBody)();
        displaySnackMessages(formattedRespMsg(dcView), "success");
        onFilter();
        setloader(false);
        return true;
      } else {
        displaySnackMessages(
          "Please enter " + dcView.toUpperCase() + " code",
          "error"
        );
      }
      setloader(false);
    } catch (err) {
      setloader(false);
      handleErrorMessage(err);
    }
  };

  const formatData = (data, selectedIds, changeType) => {
    let setAllOutput = [];

    const attributesObj = {
      attribute_name: "status",
      attribute_value: data["status"],
      start_date: moment(data["start_time"]).format("YYYY-MM-DD"),
      end_date:
        data["end_time"] && data["end_time"] !== "Invalid date"
          ? moment(data["end_time"]).format("YYYY-MM-DD")
          : END_DATE,
    };
    // check it for setAll instead of checking on each change for inline changeType type
    if (changeType === "setAll") {
      dateValidation(attributesObj.start_date, attributesObj.end_date);
    } else {
      setInlineChangeError(
        dateValidationMessage(attributesObj.start_date, attributesObj.end_date)
      );
    }
    setAllOutput.push(attributesObj);
    return {
      attributes: setAllOutput,
      codes: selectedIds,
    };
  };

  // updating ag-grid data
  const onSetAllApply = async (data, agGrid) => {
    const dataSet =
      dcView === "dc"
        ? formatData(data, selectedDcRowsIDs, "setAll")
        : formatData(data, selectedFcRowsIDs, "setAll");
    updateSetAllData(dataSet);
    setFlag_edit(true);
    await onConfirm(dataSet, "setAll");
  };

  const saveRequest = () => {
    if (!isEmpty(setAllInlineData[0])) {
      setShowModal(true);
    } else {
      displaySnackMessages("There is no change to save", "warning");
    }
  };

  const onCancel = async () => {
    if (!isEmpty(setAllInlineData[0])) {
      showConfirmBox(true);
    } else {
      tableInstance.current?.api?.deselectAll(true);
      displaySnackMessages("No changes are made", "warning");
    }
  };

  const rowselected = () => {
    if (
      (dcView === "dc" && selectedDcRowsIDs.length > 0) ||
      (dcView === "fc" && selectedFcRowsIDs.length > 0)
    ) {
      tableInstance.current.trigerSetAll(true);
    } else {
      displaySnackMessages(
        "Please select atleast one " + dcView.toUpperCase(),
        "error"
      );
    }
  };

  let formData = filterData.map((item) => {
    if (
      item.column_name === "special_classification" ||
      item.column_name === "status"
    ) {
      return {
        label: item.label,
        field_type: "list",
        filter_type: item.type,
        options: item.initialData,
        required: false,
        accessor: item.column_name,
        column_name: item.column_name,
      };
    } else {
      return {
        label: item.label,
        field_type: "list",
        filter_type: item.type,
        options: item.initialData,
        required: true,
        accessor: item.column_name,
        column_name: item.column_name,
      };
    }
  });

  let Additionalfields = [
    {
      label: "Store ID",
      field_type: "TextField",
      required: true,
      accessor: "store_code",
      column_name: "store_code",
    },
    {
      label: "Store Name",
      field_type: "TextField",
      required: true,
      accessor: "store_name",
      column_name: "store_name",
    },
    {
      label: "DC Name",
      field_type: "TextField",
      required: true,
      accessor: "name",
      column_name: "name",
    },
  ];
  let Additionalfcfields = [
    {
      label: "Store ID",
      field_type: "TextField",
      required: true,
      accessor: "store_code",
      column_name: "store_code",
    },
    {
      label: "Store Name",
      field_type: "TextField",
      required: true,
      accessor: "store_name",
      column_name: "store_name",
    },
    {
      label: "FC Name",
      field_type: "TextField",
      required: true,
      accessor: "name",
      column_name: "name",
    },
  ];

  if (dcView === "dc") {
    formData = [...formData, ...Additionalfields];
  } else {
    formData = [...formData, ...Additionalfcfields];
  }

  const formattedRespMsg = (viewText) => {
    return viewText.toUpperCase() + " Data Updated Successfully";
  };

  const onDcSelectionChanged = (event) => {
    let selections = event.api.getSelectedRows().map((item) => {
      return item.dc_code;
    });
    setSelectedDcRowsIDs(selections);
  };

  const onFcSelectionChanged = (event) => {
    let selections = event.api.getSelectedRows().map((item) => {
      return item.fc_code;
    });
    setSelectedFcRowsIDs(selections);
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

  const handleConfirmBox = () => {
    tableInstance.current.api?.refreshServerSideStore({ purge: false });
    tableInstance.current.api?.deselectAll(true);
    updateSetAllInlineData([]);
    setFlag_edit(false);
    showConfirmBox(false);
  };

  const canTakeActionOnModules = (subModuleName, action) => {
    return isActionAllowedOnSubModule(
      props?.inventorysmartModulesPermission,
      props?.module,
      subModuleName,
      action
    );
  };

  const onFilterDashboardClick = (dependencyData) => {
    onFilterDependency.current = dependencyData;
    onFilter();
  };

  const getTopRightOptions = () => {
    let options = []
    if (dcView === "dc" && hasEditPermissions) {
      if(selectedDcRowsIDs?.length > 0){
        options.push(
          <Button
            variant="tertiary"
            onClick={rowselected}
            disabled={
              !canTakeActionOnModules(
                INVENTORY_SUBMODULES_NAMES.INVENTORY_DC_STATUS,
                "edit"
              )
            }
            children="Set All"
          />
        )
      }
      

    }
    if (dcView === "fc" && hasEditPermissions) {
      if(showCreateDCBtn){
        options.push(
          <Button
            variant="tertiary"
            id="createDCBtn"
            onClick={() => showCreateDC(true)}
            // disabled={!props.isSuperUser}
            icon={<AddIcon fontSize="large"></AddIcon>}
          />
        )
      }
      if(selectedFcRowsIDs.length > 0 ){
        options.push(
          <Button
            variant="tertiary"
            size="large"
            onClick={rowselected}
            disabled={
              !canTakeActionOnModules(
                INVENTORY_SUBMODULES_NAMES.INVENTORY_DC_STATUS,
                "edit"
              )
            }
            children="Set All"
          />
        )
      }
      
    }
    if (hasEditPermissions) {
      options.push(
        <Button
          variant="tertiary"
          onClick={() => {
            onCancel();
          }}
          children="Cancel"
        />
      );
      options.push(
        <Button
          variant="primary"
          onClick={() => {
            saveRequest();
          }}
          disabled={
            !canTakeActionOnModules(
              INVENTORY_SUBMODULES_NAMES.INVENTORY_DC_STATUS,
              "edit"
            )
          }
        >
          Save
        </Button>
      );
    }
    return options
  };

    /**
   * @function
   * @description Prepare payload and request table data download which will be updated via notification
   */
  const downloadData = async () => {
    const origin = window.location.origin;
    try {
      const primaryColsMap = cloneDeep(
        tableInstance.current.columnApi?.columnModel?.primaryColumnsMap || {}
      );
      const filterBody = tableInstance.current.api?.gridOptionsWrapper?.gridOptions?.filterBody || { search: [], range: [], sort: [] };
      const table_columns = dccolumns
        ?.filter(
          (item) =>
            item.column_name && primaryColsMap[item.column_name]?.visible
        )
        ?.map((item) => {
          return {
            label: item.label,
            column_name: item.column_name,
          };
        });
      const body = {
        table_payload: {
          total_count: Number(totalRowsCount),
          columns: table_columns,
          filters: onFilterDependency.current,
          meta: {
            ...filterBody,
            limit: { limit: -1, page: 0 },
          },
          headers: [],
          selection: {
            data: tableInstance?.current?.api?.checkConfiguration,
            unique_columns: [ "dc_code"],
          },
        },
        table_api: `${origin}/api/v2/master/dc_status/dc`,
      };
      let response = await downloadTableData(body);
      if (response.data.status) {
        displaySnackMessages(
          "Please wait for download notification to be received shortly.",
          "success"
        );
      }
    } catch (error) {
      handleErrorMessage(error);
      displaySnackMessages("Something went wrong.", "error");
    }
  };

  return (
    <div style={{marginTop:IS_OVERRIDEN_CORE_BUTTON_PLACEMENT}}>
      {dcView === "dc" && (
        <CoreComponentScreen
          // Filter dashboard props
          IscoreButtonWidth= {IS_OVERRIDEN_CORE_BUTTON_WIDTH}
          showFilterDashboard={true}
          filterConfigKey={"dcStatusDcFilterConfiguration"}
          onApplyFilter={onFilterDashboardClick}
          contained={true}
          customDependencyValue={{ addFilterExclusions: false }}
          autoHideFilterButton={true}
        >
          <Loader loader={showloader}>
            <Prompt when={flag_edit} message={""} />
            {confirmBox && (
              <ConfirmBox
                onClose={() => showConfirmBox(false)}
                onConfirm={() => handleConfirmBox()}
              />
            )}
            <IaPrompt
              isOpen={showModal}
              title="Confirm Changes"
              children="Are you sure to save all your changes?"
              infoList={[]}
              onPrimaryButtonClick={() => {
                onConfirm(setAllInlineData, "inline");
              }}
              onSecondaryButtonClick={() => {
                setShowModal(false);
              }}
              primaryButtonLabel="Update"
              secondaryButtonLabel="Close"
            />

            {createDC && (
              <CreateDCModal
                fields={formData}
                title={dcView === "dc" ? "Create New DC" : "Create New FC"}
                onCreateNewDC={createNewProducFunc}
                toggleError={(errMsg) => {
                  displaySnackMessages(errMsg, "error");
                }}
                handleModalClose={() => showCreateDC(false)}
              ></CreateDCModal>
            )}
            {dccolumns.length > 0 && dcView === "dc" && (
              <AgGridComponent
                columns={dccolumns}
                selectAllHeaderComponent={hasEditPermissions}
                onSelectionChanged={onDcSelectionChanged}
                sizeColumnsToFitFlag
                onGridChanged
                manualCallBack={(body, pageIndex, params) =>
                  dcTableManualCallBack(body, pageIndex, params)
                }
                rowModelType="serverSide"
                serverSideStoreType="partial"
                cacheBlockSize={props.pageSize || 10}
                paginationPageSize={props.pageSize}
                uniqueRowId={"dc_code"}
                hideChildSelection={true}
                loadTableInstance={setNewTableInstance}
                showSetAll={false}
                purgeClosedRowNodes={true}
                suppressAggFuncInHeader={true}
                onCellValueChanged={onCellValueChanged}
                rowSelection={"multiple"}
                hideSelectAllRecords={true}
                suppressClickEdit={true}
                onSetAllApply={onSetAllApply}
                setAllButtonLabel="Apply and Save"
                setDefaultDateFieldValues={true}
                tableName={DC_TABLE_NAME}
                onRowSelected
                tableHeader={`${showFCLevelView ? "DC / FC" : "DC"}`}
                topRightOptions={getTopRightOptions()}
                setAlllayout="clusterGraph"
                setAllMaxFieldsInRow={3}
                isChatEnabled={isThreadFeatureEnabled}
                enableCellComment={false}
                onDownloadButtonClick = {() => downloadData()}
                showDownloadButton = {totalRowsCount > 0 && props.download_dc_status}
              />
            )}
            {fccolumns.length > 0 && dcView === "fc" && (
              <AgGridComponent
                columns={fccolumns}
                selectAllHeaderComponent={hasEditPermissions}
                onSelectionChanged={onFcSelectionChanged}
                sizeColumnsToFitFlag
                onGridChanged
                manualCallBack={(body, pageIndex, params) =>
                  fcTableManualCallBack(body, pageIndex, params)
                }
                rowModelType="serverSide"
                serverSideStoreType="partial"
                cacheBlockSize={10}
                uniqueRowId={"dc_code"}
                hideChildSelection={true}
                loadTableInstance={setNewTableInstance}
                showSetAll={false}
                purgeClosedRowNodes={true}
                suppressAggFuncInHeader={true}
                rowSelection={"multiple"}
                hideSelectAllRecords={true}
                suppressClickEdit={true}
                tableName={FC_TABLE_NAME}
                tableHeader={`${showFCLevelView ? "DC / FC" : "DC"}`}
                topRightOptions={getTopRightOptions()}
                setAlllayout="clusterGraph"
                setAllMaxFieldsInRow={3}
                isChatEnabled={isThreadFeatureEnabled}
                enableCellComment={false}
              />
            )}
          </Loader>
        </CoreComponentScreen>
      )}

      {dcView === "fc" && (
        <CoreComponentScreen
          // Filter dashboard props
          IscoreButtonWidth= {IS_OVERRIDEN_CORE_BUTTON_WIDTH}
          showFilterDashboard={true}
          filterConfigKey={"dcStatusFcFilterConfiguration"}
          onApplyFilter={onFilterDashboardClick}
          autoHideFilterButton={true}
        >
          <Loader loader={showloader}>
            <Prompt when={flag_edit} message={""} />
            {confirmBox && (
              <ConfirmBox
                onClose={() => showConfirmBox(false)}
                onConfirm={() => handleConfirmBox()}
              />
            )}
            <IaPrompt
              isOpen={showModal}
              title="Confirm Changes"
              children="Are you sure to save all your changes?"
              infoList={[]}
              primaryButtonLabel="Update"
              secondaryButtonLabel="Close"
              onPrimaryButtonClick={() => {
                onConfirm(setAllInlineData, "inline");
              }}
              onSecondaryButtonClick={() => {
                setShowModal(false);
              }}
            />

            {createDC && (
              <CreateDCModal
                fields={formData}
                title={dcView === "dc" ? "Create New DC" : "Create New FC"}
                onCreateNewDC={createNewProducFunc}
                toggleError={(errMsg) => {
                  displaySnackMessages(errMsg, "error");
                }}
                handleModalClose={() => showCreateDC(false)}
              ></CreateDCModal>
            )}
            {dccolumns.length > 0 && dcView === "dc" && (
              <AgGridComponent
                columns={dccolumns}
                selectAllHeaderComponent={hasEditPermissions}
                onSelectionChanged={onDcSelectionChanged}
                sizeColumnsToFitFlag
                onGridChanged
                manualCallBack={(body, pageIndex, params) =>
                  dcTableManualCallBack(body, pageIndex, params)
                }
                rowModelType="serverSide"
                serverSideStoreType="partial"
                cacheBlockSize={props.pageSize || 10}
                paginationPageSize={props.pageSize}
                uniqueRowId={"dc_code"}
                hideChildSelection={true}
                loadTableInstance={setNewTableInstance}
                showSetAll={false}
                purgeClosedRowNodes={true}
                suppressAggFuncInHeader={true}
                onCellValueChanged={onCellValueChanged}
                rowSelection={"multiple"}
                hideSelectAllRecords={true}
                suppressClickEdit={true}
                onSetAllApply={onSetAllApply}
                setAllButtonLabel="Apply and Save"
                setDefaultDateFieldValues={true}
                tableName={DC_TABLE_NAME}
                tableHeader={`${showFCLevelView ? "DC / FC" : "DC"}`}
                topRightOptions={getTopRightOptions()}
                setAlllayout="clusterGraph"
                setAllMaxFieldsInRow={3}
                isChatEnabled={isThreadFeatureEnabled}
                enableCellComment={false}
              />
            )}
            {fccolumns.length > 0 && dcView === "fc" && (
              <AgGridComponent
                columns={fccolumns}
                selectAllHeaderComponent={hasEditPermissions}
                onSelectionChanged={onFcSelectionChanged}
                sizeColumnsToFitFlag
                onGridChanged
                manualCallBack={(body, pageIndex, params) =>
                  fcTableManualCallBack(body, pageIndex, params)
                }
                rowModelType="serverSide"
                serverSideStoreType="partial"
                cacheBlockSize={10}
                uniqueRowId={"dc_code"}
                hideChildSelection={true}
                loadTableInstance={setNewTableInstance}
                showSetAll={false}
                purgeClosedRowNodes={true}
                suppressAggFuncInHeader={true}
                rowSelection={"multiple"}
                hideSelectAllRecords={true}
                suppressClickEdit={true}
                tableName={FC_TABLE_NAME}
                topRightOptions={getTopRightOptions()}
                setAlllayout="clusterGraph"
                setAllMaxFieldsInRow={3}
                isChatEnabled={isThreadFeatureEnabled}
                enableCellComment={false}
              />
            )}
          </Loader>
        </CoreComponentScreen>
      )}
    </div>
  );
}
const mapStateToProps = (state) => {
  return {
    dcStatus: state.dcStatusReducer.dcStatus,
    dcStatusCount: state.storeGroupReducer.dcStatusCount,
    isSuperUser:
      state.tenantUserRoleMgmtReducer.userRoleManagementReducer.isSuperUser,
    inventorysmartModulesPermission:
      state.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartModulesPermission,
    dcFilterDashboardConfiguration:
      state.filterReducer.filterDashboardConfiguration[
        "dcStatusDcFilterConfiguration"
      ],
    fcFilterDashboardConfiguration:
      state.filterReducer.filterDashboardConfiguration[
        "dcStatusFcFilterConfiguration"
      ],
    savedFilterSelection: state.filterReducer.savedFilterSelection,
    download_dc_status: 
       state.inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.inventorysmart_configuration?.drillDown
        ?.download_dc_status,
        pageSize: state.inventorysmartReducer.inventorySmartCommonService.inventorysmartScreenConfig?.inventorysmart_page_count,
    inventorysmartScreenConfig:
      state.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (body) => dispatch(addSnack(body)),
    setFilterConfiguration: (filterConfiguration) =>
      dispatch(setFilterConfiguration(filterConfiguration)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(DCStatusScreen);
