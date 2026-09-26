import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@mui/material";
import { connect } from "react-redux";
import { withRouter } from "react-router-dom";
import {
  fetchChoiceSet,
  updateChoiceSet,
  getPlanMetricsData,
} from "../../../services-assortsmart/Plan/Plan-Wedge/plan-wedge-service";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import { cloneDeep, isArray, isEmpty } from "lodash";
import { addSnack } from "core/actions/snackbarActions";
import {
  assortAgGridCustomCellRenderer,
  getPlanPayload,
  isDropPlan,
} from "modules/assortsmart/utils-assortsmart/utilityFunctions";
import LoadingOverlay from "core/Utils/Loader/loader";
import AgGridTable from "core/Utils/agGrid";
import { bindActionCreators } from "redux";
import * as planDashboardServiceActions from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import * as commonAssortServiceActions from "modules/assortsmart/services-assortsmart/common-assort-service";
import * as planWedgeServiceActions from "modules/assortsmart/services-assortsmart/Plan/Plan-Wedge/plan-wedge-service";
import {
  addDefaultRowData,
  calculateRatio,
  displaySnackMessage,
  generateDropDownOptions,
  hasDuplicate,
} from "./plan-wedge-functions";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { Prompt } from "impact-ui";
import { common } from "modules/assortsmart/constants-assortsmart/stringContants";
import globalStyles from "core/Styles/globalStyles";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";

const AddPackComponent = (props) => {
  const [columns, setColumns] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [packData, setPackData] = useState([]);
  const [fetchPackNumber, setFetchPackNumber] = useState(false);
  const [choiceOptions, setChoiceOptions] = useState([]);
  const [packNumber, setPackNumber] = useState(2);
  const [callFilters, setCallFilters] = useState(false);
  const [deletedPack, setDeletedPack] = useState([]);
  const [allChoiceOptions, setAllChoiceOptions] = useState([]);
  const classes = useStyles();
  const globalClasses = globalStyles();
  const addPackInstance = useRef({});
  let propsRef = useRef({});
  let packValue = props.selectedPackValue;

  useEffect(() => {
    if (props.showAddSetField) {
      let options = allChoiceOptions.filter(
        (options) => !options.set_name || options.set_name === ""
      );
      setChoiceOptions(options);
      let tableArr = [];
      for (var i = 1; i <= 2; i++) {
        let data = addDefaultRowData(i, props.packName, props);
        tableArr.push(data);
      }
      setTableData(tableArr);
      if (addPackInstance.current.api) {
        addPackInstance.current.api.refreshCells({
          force: true,
          suppressFlash: false,
        });
      }
      setFetchPackNumber(true);
      props.setPackNumber(2);
    } else {
      setChoiceOptions(allChoiceOptions);
    }
  }, [props.showAddSetField]);

  useEffect(() => {
    packValue = props.selectedPackValue;
    if (
      (addPackInstance?.current?.api || callFilters) &&
      !props.showAddSetField
    ) {
      let data =
        packData?.length &&
        packData.filter(
          (obj) => obj.set_name === props.selectedPackValue?.value
        );
      if (!data?.length) {
        let tableArr = [];
        for (var i = 1; i <= 2; i++) {
          let row = addDefaultRowData(i, props.packName, props);
          tableArr.push(row);
        }
        data = tableArr;
      }
      let calculatedData = calculateRatio(data, "total_qty");
      setTableData(calculatedData);
      props.setPackNumber(data?.length || 2);
      setCallFilters(false);
      addPackInstance.current.api.refreshCells({
        force: true,
        suppressFlash: false,
      });
      addPackInstance.current.api.onFilterChanged();
    }
  }, [props.selectedPackValue?.value, callFilters, props.showAddSetField]);

  useEffect(() => {
    if (addPackInstance?.current?.api && props.selectedPackValue?.value) {
      addPackInstance.current.api.onFilterChanged();
    }
  }, [packData]);

  useEffect(() => {
    propsRef.current.choiceOptions = choiceOptions;
    propsRef.current.packData = packData;
    propsRef.current.tableData = tableData;
  }, [choiceOptions, packData, tableData]);

  useEffect(() => {
    const fetchData = async () => {
      let pacColumns = await getColumnsAg(
        "table_name=wedge_add_set",
        props.columnHeaderJson
      )();
      if (choiceOptions?.length) {
        pacColumns.forEach((col) => {
          // Setting options for choice_name col
          if (col.column_name === "choice_name") {
            let options = choiceOptions.map((obj) => obj.choiceName);
            col.options = generateDropDownOptions(options);
          }
        });
      }
      pacColumns.push({
        column_name: "is_set_primary",
        label: "Primary Choice",
        order_of_display: 6,
      });
      pacColumns.map((col) => {
        if (col.column_name === "total_qty" || col.column_name === "ratio") {
          col.typeFormat = "number";
        }
      });
      pacColumns = agGridColumnFormatter(pacColumns, props.columnHeaderJson);
      setColumns(pacColumns);
    };
    if (props.showPackModal) {
      fetchData();
    }
  }, [choiceOptions, props.showPackModal]);

  useEffect(() => {
    if (fetchPackNumber) {
      setPackNumber(props.packNumber);
    }
  }, [props.packNumber, fetchPackNumber]);

  useEffect(() => {
    if (fetchPackNumber) {
      let number = packNumber || 1;
      let tableArr = [];
      for (var i = 1; i <= number; i++) {
        if (tableData.length < i) {
          let set_name = props.packName
            ? props.packName
            : props.selectedPackValue?.value;
          let data = addDefaultRowData(i, set_name, props);
          tableArr.push(data);
        }
      }
      tableArr = tableData.concat(tableArr);
      const uniqueArray = tableArr.filter((obj, index, arr) => {
        return (
          arr.map((mapObj) => mapObj.uniqueID).indexOf(obj.uniqueID) === index
        );
      });
      let calculatedData = calculateRatio(uniqueArray, "total_qty");
      setTableData(calculatedData);
      if (addPackInstance?.current?.api) {
        addPackInstance.current.api.refreshCells({
          force: true,
          suppressFlash: false,
        });
      }
    }
  }, [packNumber, fetchPackNumber]);

  useEffect(() => {
    if (
      props.selectedL1FilterValue?.value &&
      !isEmpty(props.selectedL1FilterValue) &&
      props.selectedL2FilterValue?.value &&
      !isEmpty(props.selectedL2FilterValue) &&
      props.selectedL3FilterValue &&
      !isEmpty(props.selectedL3FilterValue) &&
      props.screenConfiguration?.common?.endpoint_project_name ===
        "assort-smart" &&
      props.callPackData
    ) {
      fetchSetData();
    }
  }, [
    props.selectedL1FilterValue?.value,
    props.selectedL2FilterValue?.value,
    props.selectedL3FilterValue,
    props.showPackModal,
    props.callPackData,
  ]);

  const fetchSetData = async () => {
    let planData = cloneDeep(props.planDetails.data);
    planData.l1_name = [props.selectedL1FilterValue?.value];
    planData.l2_name = [props.selectedL2FilterValue?.value];
    let payload = getPlanPayload(planData, props.planLevels);
    if (
      !props.selectedL3FilterValue?.value &&
      props.selectedL3FilterValue?.length > 0
    ) {
      let level3Arr = [];
      props.selectedL3FilterValue.forEach((level3) => {
        level3Arr.push(level3?.value);
      });
      payload.filters.push({
        attribute_name: "l3_name",
        value: level3Arr,
        prefix: "levels",
        operator: "in",
      });
    } else {
      payload.filters.push({
        attribute_name: "l3_name",
        value: [props.selectedL3FilterValue?.value],
        prefix: "levels",
        operator: "in",
      });
    }
    if (
      isDropPlan(
        props.planDetails?.data,
        `${
          props.screenConfiguration?.common?.drop_key.includes("drop")
            ? "drops"
            : props.screenConfiguration?.common?.drop_key || "drops"
        }_count`
      )
    ) {
      payload.filters.push({
        attribute_name: props.screenConfiguration?.common?.drop_key || "drop",
        value: [props.selectedDropData],
        prefix: "levels",
        operator: "in",
      });
    }
    props.setShowAddSetField(false);
    props.setPackName("");
    props.setShowLoader(true);
    let response = await props.fetchChoiceSet(
      payload,
      props.screenConfiguration?.common?.endpoint_project_name || "assort",
      props.planDetails?.data?.plan_code
    );
    props.setCallPackData(false);
    if (response?.data?.status) {
      props.setPackNumber(0);
      props.setShowLoader(false);
      setPackData([]);
      let tableData = [];
      let packOptions = [];
      let choiceDropdown = [];
      response.data.data.forEach((obj) => {
        if (obj.set_name && obj.set_name !== "") {
          obj.uniqueID = `pack_${obj.choice_name}`;
          obj.is_set_primary = obj.is_set_primary === "true" ? true : false;
          tableData.push(obj);
          if (!packOptions.includes(obj.set_name)) {
            packOptions.push(obj.set_name);
          }
        }
        choiceDropdown.push({
          ...obj,
          choiceName: obj.choice_name,
          total_qty: obj.total_qty,
        });
      });
      props.setChoiceDetails(response.data.data);
      let options = generateDropDownOptions(packOptions);
      props.setPackOptions(options);
      props.setSelectedPackValue(options?.[0]);
      setChoiceOptions(choiceDropdown);
      setAllChoiceOptions(choiceDropdown);
      let data = tableData.filter(
        (obj) => obj.set_name === options?.[0]?.value
      );
      setTableData(data);
      props.setPackNumber(data?.length || 2);
      let calculatedData = calculateRatio(data, "total_qty");
      setTableData(calculatedData);
      if (addPackInstance?.current?.api) {
        addPackInstance.current.api.refreshCells({
          force: true,
          suppressFlash: false,
        });
      }
      setPackData(tableData);
      setFetchPackNumber(true);
    }
  };

  const updateWedgeSetDataOnBlur = async (
    e,
    data,
    column,
    isChanged,
    value,
    initialValue,
    cellData,
    initValue,
    previousValue
  ) => {
    let newValue = initValue;
    let columnId = column.colDef.accessor;
    let tempData = [];
    let primaryRow = {};
    let changedRow = {};
    addPackInstance.current.api.forEachNode((eachRow, index) => {
      eachRow = eachRow.data;
      if (eachRow.uniqueID === data.uniqueID) {
        eachRow[columnId] = newValue;
        if (columnId === "choice_name") {
          let options = propsRef.current.choiceOptions.filter(
            (obj) => obj.choiceName === newValue
          );
          eachRow["total_qty"] = options?.[0]?.total_qty || 0;
          eachRow["channel_qty"] = options?.[0]?.total_qty || 0;
        }
        if (columnId === "total_qty") {
          eachRow["channel_qty"] = newValue;
        }
        changedRow = eachRow;
        if (eachRow.is_set_primary) {
          primaryRow = eachRow;
        }
      } else if (eachRow.uniqueID !== data.uniqueID) {
        if (columnId === "is_set_primary") {
          eachRow["is_set_primary"] = false;
        }
        if (eachRow.is_set_primary) {
          primaryRow = eachRow;
        }
      }
      tempData.push(eachRow);
    });
    tempData = calculateRatio(tempData, columnId, primaryRow, changedRow);
    setTableData(tempData);
    addPackInstance.current.api.refreshCells({
      force: true,
      suppressFlash: false,
    });
  };

  const updateWedgeSetDataOnChange = (params) => {
    const { newValue, oldValue, colDef } = params;
    let columnId = colDef.column_name;
    let row = params.data;
    let tempRowData = [];
    addPackInstance.current.api.forEachNode((eachRow, index) => {
      eachRow = eachRow.data;
      if (eachRow.uniqueID === row.uniqueID) {
        if (columnId === "choice_name") {
          let options = propsRef.current.choiceOptions.filter(
            (obj) => obj.choiceName === newValue
          );
          eachRow["total_qty"] = options?.[0]?.total_qty || 0;
          eachRow["channel_qty"] = options?.[0]?.total_qty || 0;
          eachRow["set_name"] = props.packName
            ? props.packName
            : props.selectedPackValue?.value;
        }
        eachRow[columnId] = newValue;
      } else if (
        eachRow.uniqueID !== row.uniqueID &&
        columnId === "is_set_primary"
      ) {
        eachRow["is_set_primary"] = false;
      }
      tempRowData.push(eachRow);
    });
    tempRowData = calculateRatio(tempRowData, columnId);
    setTableData(tempRowData);
    addPackInstance.current.api.refreshCells({
      update: tempRowData,
    });
  };

  const handleEventChange = (event, type, column_name, rowData) => {
    if (type === "radio" && !event.target.checked) {
      let tempData = [];
      let primaryRow = {};
      let changedRow = {};
      addPackInstance.current.api.forEachNode((eachRow, index) => {
        eachRow = eachRow.data;
        eachRow.is_set_primary =
          eachRow.uniqueID === rowData.uniqueID ? true : false;
        if (eachRow.uniqueID === rowData.uniqueID) {
          changedRow = eachRow;
          choiceOptions.map((opt) => {
            if (opt.choice_name === eachRow.choice_name) {
              primaryRow = { ...opt, ratio: eachRow.ratio };
            }
          });
        }
        tempData.push(eachRow);
      });
      tempData = calculateRatio(tempData, "ratio", primaryRow, changedRow);
      setTableData(tempData);
    }
    if (addPackInstance.current.api) {
      addPackInstance.current.api.refreshCells({
        force: true,
        suppressFlash: false,
      });
    }
  };

  const checkValidation = () => {
    var isDuplicate = false,
      isDuplicateSetData = false,
      isSet = tableData?.length > 1 ? true : false,
      isDuplicateSetName = false;

    let hasPrimaryKeyData = tableData.filter((obj) => obj.is_set_primary);
    let hasChoiceName = tableData.filter(
      (obj) => obj.choice_name || obj.choice_name !== ""
    );
    isDuplicate = hasDuplicate(tableData, "choice_name");

    let data = packData.filter((val) => {
      return (
        (val.set_name !== "" &&
          val.set_name !== props.selectedPackValue?.value &&
          !props.showAddSetField) ||
        (props.showAddSetField && !val.uniqueID.includes("new_pack"))
      );
    });
    data.push(...tableData);

    isDuplicateSetData = hasDuplicate(data, "choice_name");
    isDuplicateSetName =
      props?.packOptions?.length &&
      props.packOptions.filter((opt) => opt.value === props.packName);

    if (tableData?.length !== hasChoiceName?.length) {
      return displaySnackMessage(
        "Please select choice name before saving",
        "error",
        props.addSnack
      );
    }
    if (isDuplicate || isDuplicateSetData) {
      return displaySnackMessage(
        "A choice cannot be selected more than once in a set",
        "error",
        props.addSnack
      );
    }
    if (!isSet || hasChoiceName?.length < 2) {
      return displaySnackMessage(
        "Minimum of 2 choices should be selected to create a set",
        "error",
        props.addSnack
      );
    }
    if (!hasPrimaryKeyData?.length) {
      return displaySnackMessage(
        "There should be 1 primary choice to create a set",
        "error",
        props.addSnack
      );
    }
    if ((props.packName === "" || !props.packName) && props.showAddSetField) {
      return displaySnackMessage(
        "Set name is mandatory",
        "error",
        props.addSnack
      );
    }
    if (isDuplicateSetName?.length) {
      return displaySnackMessage(
        "Set name already exists",
        "error",
        props.addSnack
      );
    }
    handleAddSet(false);
  };

  const handleAddSet = async (value) => {
    try {
      let tempData = [];
      let setName = props.packName
        ? props.packName
        : props.selectedPackValue?.value;
      addPackInstance.current.api.forEachNode((eachRow) => {
        eachRow = eachRow.data;
        delete eachRow["uniqueID"];
        delete eachRow["ratio"];
        eachRow[props.screenConfiguration?.common?.flow_key || "flow"] = "-";
        eachRow["lock_choice"] = "No";
        eachRow["set_name"] = setName;
        eachRow["plan_code"] = props.planDetails?.data.plan_code;
        eachRow["is_set_primary"] = eachRow.is_set_primary ? true : false;
        tempData.push(eachRow);
      });
      deletedPack.map((pack) => {
        delete pack["uniqueID"];
        delete pack["ratio"];
      });
      tempData.push(...deletedPack);
      tempData = tempData.filter((obj, index, arr) => {
        return (
          arr.map((mapObj) => mapObj.choice_name).indexOf(obj.choice_name) ===
          index
        );
      });
      const Ids = tempData
        .filter((data) => data.set_name === setName)
        .map((obj) => obj.choice_name);
      let removedData = packData.filter((obj) => {
        if (obj.set_name === setName) {
          obj.set_name = "";
          obj["lock_choice"] = "No";
          obj["plan_code"] = props.planDetails?.data.plan_code;
          return !Ids.includes(obj.choice_name);
        }
      });
      tempData.push(...removedData);
      let payload = {
        data: tempData,
        is_scaling: value,
        wedge_level: "choice_level",
        action: props.showAddSetField && props.packName ? "create" : "update",
      };
      props.setShowLoader(true);
      let response = await props.updateChoiceSet(
        payload,
        props.screenConfiguration?.common?.endpoint_project_name || "assort",
        props.planDetails?.data?.plan_code
      );
      if (response?.data?.status) {
        fetchSetData();
        props.setShowAddSetField(false);
        props.setPackName("");
        props.toggleViewAddChoiceModal(false, "set");
        props.setCallWedge(true);
        displaySnackMessage(
          response?.data?.data?.message,
          "success",
          props.addSnack
        );
      }
      props.setShowLoader(false);
    } catch (err) {
      props.setShowLoader(false);
      props.setShowAddSetField(false);
      props.setPackName("");
      props.toggleViewAddChoiceModal(false, "set");
      displaySnackMessage("Something went wrong", "error", props.addSnack);
    }
  };

  const onDeleteRowClick = async (ins) => {
    let addedPack = [];
    let pack = deletedPack;
    propsRef.current.packData.filter((obj) => {
      if (obj.uniqueID === ins.uniqueID) {
        obj.set_name = "";
        pack.push({
          ...obj,
          [props.screenConfiguration?.common?.flow_key || "flow"]: "-",
          lock_choice: "No",
          plan_code: props.planDetails?.data.plan_code,
        });
      }
    });
    propsRef.current.tableData.filter((obj) => {
      if (obj.uniqueID !== ins.uniqueID && obj.uniqueID.includes("new_pack_")) {
        addedPack.push(obj);
      }
    });
    propsRef.current.packData.push(...addedPack);
    setDeletedPack(pack);
    const uniqueArray = propsRef.current.packData.filter((obj, index, arr) => {
      return (
        arr.map((mapObj) => mapObj.uniqueID).indexOf(obj.uniqueID) === index
      );
    });
    setPackData(uniqueArray);
    setTableData(addedPack);
    props.setPackNumber(addedPack.length);
    addPackInstance.current.api.refreshCells({
      force: true,
      suppressFlash: false,
    });
    setCallFilters(true);
  };

  const isExternalFilterPresent = useCallback(() => {
    return props.packOptions?.length && !props.showAddSetField ? true : false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableData, props.showAddSetField]);

  const doesExternalFilterPass = useCallback(
    //whenever channel or sub channel changes data get filtered here
    (node) => {
      if (node.data) {
        return node.data.set_name === packValue?.value;
      }
      return true;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [packValue, tableData]
  );

  const loadTableInstance = (params) => {
    addPackInstance.current = params;
  };

  return (
    <React.Fragment>
      {props.showPackModal && (
        <LoadingOverlay loader={props.showLoader} spinner>
          <div
            className={
              !(props.packOptions?.length || props.showAddSetField)
                ? globalClasses.minHeightBody
                : ""
            }
          >
            {columns?.length &&
            (props.packOptions?.length || props.showAddSetField) ? (
              <div className={`${classes.choiceTable} choiceViewTable`}>
                <AgGridTable
                  rowdata={tableData}
                  columns={columns}
                  onBlur={updateWedgeSetDataOnBlur}
                  onCellValueChanged={updateWedgeSetDataOnChange}
                  noEditableCustomCellRender={(cellProps) =>
                    assortAgGridCustomCellRenderer(
                      cellProps,
                      "add-pack-component",
                      null,
                      props,
                      handleEventChange
                    )
                  }
                  callDeleteApi={(tableInfo) => {
                    onDeleteRowClick(tableInfo.data);
                  }}
                  loadTableInstance={loadTableInstance}
                  isExternalFilterPresent={isExternalFilterPresent}
                  doesExternalFilterPass={doesExternalFilterPass}
                  uniqueRowId="uniqueID"
                  sideBar={false}
                  sizeColumnsToFitFlag
                  adjustTableHeight={true}
                  staticColId={true}
                />
              </div>
            ) : null}
            <div className={classes.choiceActionDiv}>
              <Button
                variant="contained"
                color="primary"
                title={"Save"}
                id={"save"}
                onClick={() => checkValidation()}
                className={`${classes.buttonFitContent} ${classes.choiceBtnAlignRight}`}
              >
                Save
              </Button>
              <Button
                variant="outlined"
                color="primary"
                title={"Cancel"}
                id={"cancel"}
                onClick={() => props.toggleViewAddChoiceModal(false, "set")}
                className={`${classes.buttonFitContent} ${classes.choiceBtnAlignRight}`}
              >
                Cancel
              </Button>
            </div>
          </div>
        </LoadingOverlay>
      )}
    </React.Fragment>
  );
};

const mapStateToProps = (state) => {
  return {
    planDetails: planDashboardServiceActions.planDetailsDataSelector(state),
    planLevels: planDashboardServiceActions.planLevelsDataSelector(state),
    planMetricsData: planWedgeServiceActions.planMetricsDataSelector(state),
    columnHeaderJson: planDashboardServiceActions.columnHeaderJsonSelector(
      state
    ),
    screenConfiguration: commonAssortServiceActions.screenConfigurationSelector(
      state
    ),
  };
};

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators(
    {
      fetchChoiceSet,
      updateChoiceSet,
      getPlanMetricsData,
      addSnack,
    },
    dispatch
  );
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(AddPackComponent));
