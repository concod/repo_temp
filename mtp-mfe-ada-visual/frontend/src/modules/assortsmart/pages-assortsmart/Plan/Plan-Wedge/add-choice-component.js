import React, { useEffect, useRef, useState } from "react";
import { Button } from "@mui/material";
import LoadingOverlay from "core/Utils/Loader/loader";
import AgGridTable from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import { addSnack } from "core/actions/snackbarActions";
import { Prompt } from "impact-ui";
import { cloneDeep, isEmpty } from "lodash";
import * as planDashboardServiceActions from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import * as planWedgeServiceActions from "modules/assortsmart/services-assortsmart/Plan/Plan-Wedge/plan-wedge-service";
import {
  assortAgGridCustomCellRenderer,
  getPlanPayload,
  isChannelMultiple,
  isDropPlan,
} from "modules/assortsmart/utils-assortsmart/utilityFunctions";
import { connect } from "react-redux";
import { withRouter } from "react-router-dom";
import { bindActionCreators } from "redux";
import {
  addWedgeChoice,
  addWedgeChoiceValidtion,
  addWedgeStyle,
  getWedgeAttributesData,
  set2_3_Loader,
  setWedgeAttributeData,
} from "../../../services-assortsmart/Plan/Plan-Wedge/plan-wedge-service";
import {
  displaySnackMessage,
  getAddChoicePayload,
  setOptionsForAttribute,
} from "./plan-wedge-functions";

const AddChoiceComponent = (props) => {
  const [columns, setColumns] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [attributeList, setAttributeList] = useState([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  const classes = useStyles();
  const AddChoiceInstance = useRef({});

  useEffect(() => {
    if (props.wedgeAttributeData?.length) {
      let tempAttributeList = props.wedgeAttributeData.map((attrJson) => {
        return `attributes_${attrJson.attribute_name}`;
      });
      setAttributeList(tempAttributeList);
    }
  }, [props.wedgeAttributeData]);

  useEffect(() => {
    const channels = props.planDetails?.data?.channel;
    let choiceColumn = cloneDeep(props.wedgeColumn)
      .map((obj) => {
        if (isChannelMultiple(props.planDetails?.data)) {
          if (channels.includes(obj.column_name.split("_")[0])) {
            obj.is_editable = true;
          }
        }
        switch (obj.column_name) {
          case "choice_name":
            obj.is_editable = true;
            break;
          case "style_id":
            obj.is_hidden = true;
            break;
          case "school":
            obj.is_hidden = true;
            break;
          case "total_qty":
            obj.is_editable = isChannelMultiple(props.planDetails?.data)
              ? false
              : true;
            break;
          case "drop_name" || "launch_name":
            if (
              isDropPlan(
                props.planDetails?.data,
                `${
                  props.screenConfiguration?.common?.drop_key || "drops"
                }_count`
              )
            ) {
              obj.is_hidden = false;
              obj.is_editable = true;
              obj.type = "list";
              obj.options = props.dropOptions;
            }
            break;
          case "l3_name":
            obj.is_hidden = false;
            obj.is_frozen = true;
            obj.is_editable = true;
            obj.type = "list";
            obj.options = props.l3Options;
            break;
          case "attributes":
            obj.is_editable = true;
            obj.extra = {
              hideToolTip: true,
            };
            obj.sub_headers.map((child) => {
              child.is_editable = true;
              child.extra = {
                hideToolTip: true,
              };
            });
            break;
          case "forecasted_qty":
            if (props.screenConfiguration["2.2"]?.graph_hide_carryover) {
              obj.is_hidden = true;
              return obj;
            }
            if (
              !props.screenConfiguration?.common?.show_style_level &&
              !props.screenConfiguration["2.2"]?.graph_hide_carryover
            ) {
              obj.is_editable = true;
              return obj;
            }
            return null;
            break;
          case obj.column_name:
            if (
              obj.column_name.includes("_units") &&
              obj.column_name !== "ia_projected_units" &&
              isChannelMultiple(props.planDetails?.data)
            ) {
              obj.is_hidden = false;
              obj.is_editable = true;
              return obj;
            }
            return null;
            break;
          default:
            return null;
        }
        return obj;
      })
      .filter((col) => col);
    let wedgeColumns = setOptionsForAttribute(
      cloneDeep(choiceColumn),
      attributeList,
      props
    );
    choiceColumn = agGridColumnFormatter(wedgeColumns, props.columnHeaderJson);
    choiceColumn.map((col) => {
      col.extra = {
        autoComplete: "off",
      };
    });
    setColumns(choiceColumn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.wedgeColumn]);

  useEffect(() => {
    let number = props.choiceNumber;
    let tableArr = [];
    let attributeData = {};
    let channelUnitObject = {};
    attributeList.forEach((attr) => {
      if (attr.includes("attributes_")) {
        attributeData[attr] = null;
      }
    });
    if (isChannelMultiple(props.planDetails?.data)) {
      props.planDetails?.data?.channel.map((chan) => {
        channelUnitObject[`${chan}_units`] = null;
      });
    }

    if (tableData.length > number) {
      tableArr = tableData.splice(0, number);
      setTableData(tableArr);
      AddChoiceInstance.current.api.refreshCells({
        force: true,
        suppressFlash: false,
      });
      return;
    }
    for (var i = 1; i <= number; i++) {
      if (tableData.length < i) {
        tableArr.push({
          choice_name: ``,
          total_qty: 0,
          forecasted_qty: props.screenConfiguration?.["2.2"]
            ?.graph_hide_carryover
            ? 1
            : 0,
          l3_name: null,
          uniqueID: `Choice_${i}`,
          ...attributeData,
          ...channelUnitObject,
        });
      }
    }
    if (!isEmpty(attributeData)) {
      tableArr = tableData.concat(tableArr);
      setTableData(tableArr);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.choiceNumber, attributeList]);

  const handleConfirmDialog = () => {
    let isChoiceNull = false,
      isTotalQtyNull = false,
      isCollegiate = false,
      isChoiceNameNull = false,
      isChoiceUniform = false,
      choiceName = "",
      isForecastQtyNull = false;

    AddChoiceInstance.current.api.forEachNode((choiceData) => {
      choiceData = choiceData.data;
      //Validate if all fields are filled
      Object.keys(choiceData).forEach((key) => {
        if (!(isChoiceNull || isTotalQtyNull)) {
          if (key.includes("_units")) {
            return (isChoiceNull = choiceData[key] === "" ? true : false);
          }
          if (
            key.includes("forecasted") &&
            !props.screenConfiguration["2.2"]?.graph_hide_carryover
          ) {
            return (isForecastQtyNull =
              choiceData[key] > 0 && choiceData[key] <= choiceData["total_qty"]
                ? false
                : true);
          } else if (key.includes("qty")) {
            return (isTotalQtyNull = choiceData[key] <= 0 ? true : false);
          } else if (
            key.includes("attributes_") &&
            !key.includes("selected_")
          ) {
            return (isChoiceNull = !choiceData[`selected_${key}`]
              ? true
              : false);
          } else if (!choiceData[key]) {
            return (isChoiceNull = true);
          }
        }
      });
      //Validate if added choice name is in required format
      if (!choiceData.choice_name.includes(`${choiceData.l3_name}---Choice_`)) {
        choiceName = `${choiceData.l3_name}---Choice_`;
        return (isChoiceUniform = true);
      }
      //Validate if choice has id
      if (!choiceData.choice_name.split("Choice_")[1]) {
        return (isChoiceNameNull = true);
      }
      if (choiceData.selected_attributes_selling_collection === "collegiate") {
        return (isCollegiate = true);
      }
    });
    if (isChoiceNull) {
      displaySnackMessage("All Fields are required", "error", props.addSnack);
      return;
    }
    if (isChoiceUniform) {
      displaySnackMessage(
        `Please add valid choice id (${choiceName})`,
        "error",
        props.addSnack
      );
      return;
    }
    if (isChoiceNameNull) {
      displaySnackMessage("Please add choice id", "error", props.addSnack);
      return;
    }
    if (isTotalQtyNull) {
      displaySnackMessage(
        "Total Qty should be greater than 0",
        "error",
        props.addSnack
      );
      return;
    }
    if (isForecastQtyNull) {
      displaySnackMessage(
        "Total Forecasted Qty should be greater than 0 & less than Total Qty",
        "error",
        props.addSnack
      );
      return;
    }
    if (isCollegiate) {
      displaySnackMessage(
        "New choice can't be created with collegiate selling collection",
        "error",
        props.addSnack
      );
      return;
    }
    let result = props.wedgeTableData.filter(function (wedgeData) {
      // filter out same choice name
      return tableData.some(function (choiceData) {
        return (
          wedgeData.choice_name === choiceData.choice_name &&
          (!choiceData?.[
            `${props.screenConfiguration?.common?.drop_key || "drop"}_name`
          ] ||
            wedgeData[
              `${props.screenConfiguration?.common?.drop_key || "drop"}_name`
            ] ===
              choiceData[
                `${props.screenConfiguration?.common?.drop_key || "drop"}_name`
              ])
        );
      });
    });
    let checkDuplicateChoice = tableData
      .map((tableObj) => {
        return {
          choice_name: tableObj.choice_name,
          l3_name: tableObj.l3_name,
          [`${
            props.screenConfiguration?.common?.drop_key || "drop"
          }_name`]: tableObj[
            `${props.screenConfiguration?.common?.drop_key || "drop"}_name`
          ],
        };
      })
      .filter((tableObj, index, choiceName) => {
        let choiceIndex = choiceName.findIndex(function (choiceData) {
          return JSON.stringify(choiceData) === JSON.stringify(tableObj);
        });
        return choiceIndex !== index;
      });
    if (result?.length || checkDuplicateChoice?.length) {
      displaySnackMessage(
        "Choice name cannot be same",
        "error",
        props.addSnack
      );
      return;
    }
    callAddChoiceValidation();
  };

  const callAddChoiceValidation = async () => {
    let planDetails = props.planDetails?.data;
    let addChoicePayload = getAddChoicePayload(
      planDetails,
      AddChoiceInstance,
      props
    );
    let payload = {
      plan_code: planDetails.plan_code,
      add_choices: addChoicePayload,
    };
    if (
      props.screenConfiguration?.common?.endpoint_project_name ===
        "assort-smart" &&
      !props.screenConfiguration?.common?.show_style_level
    ) {
      payload["wedge_level"] = "choice_level";
    }
    props.set2_3_Loader(true);
    await props
      .addWedgeChoiceValidtion(
        payload,
        props.screenConfiguration?.common?.endpoint_project_name || "assort"
      )
      .then((addChoiceResponse) => {
        if (addChoiceResponse?.data?.status) {
          displaySnackMessage(
            addChoiceResponse.data.data.message,
            addChoiceResponse?.data?.data?.status === "True"
              ? "success"
              : "error",
            props.addSnack
          );
          props.set2_3_Loader(false);
          if (addChoiceResponse?.data?.data?.status === "True") {
            setShowConfirmDialog(true);
          }
        }
      })
      .catch((_err) => {
        displaySnackMessage("Something went wrong", "error", props.addSnack);
        props.set2_3_Loader(false);
      });
  };

  const callAddChoiceApi = async (hold_budget) => {
    let planDetails = props.planDetails?.data;
    let addChoicePayload = getAddChoicePayload(
      planDetails,
      AddChoiceInstance,
      props
    );
    let payload = {
      plan_code: planDetails.plan_code,
      hold_budget,
    };
    if (
      props.screenConfiguration?.common?.endpoint_project_name ===
        "assort-smart" &&
      !props.screenConfiguration?.common?.show_style_level
    ) {
      payload["add_styles"] = addChoicePayload;
      payload["wedge_level"] = "choice_level";
    } else {
      payload["add_choices"] = addChoicePayload;
    }
    props.set2_3_Loader(true);
    setShowConfirmDialog(false);
    let addWedgeFun =
      props.screenConfiguration?.common?.endpoint_project_name ===
        "assort-smart" && !props.screenConfiguration?.common?.show_style_level
        ? props.addWedgeStyle
        : props.addWedgeChoice;
    await addWedgeFun(
      payload,
      props.screenConfiguration?.common?.endpoint_project_name || "assort"
    )
      .then((addChoiceResponse) => {
        if (addChoiceResponse?.data?.status) {
          displaySnackMessage(
            addChoiceResponse.data.data.message,
            addChoiceResponse?.data?.data?.status ? "success" : "error",
            props.addSnack
          );
          props.set2_3_Loader(false);
          if (addChoiceResponse?.data?.data?.status) {
            props.toggleViewAddChoiceModal(false, "choice");
            props.setCallWedge(true);
          }
        }
      })
      .catch((_err) => {
        displaySnackMessage("Something went wrong", "error", props.addSnack);
        props.set2_3_Loader(false);
      });
  };

  const fetchWedgeAttributesData = async (l3Value) => {
    let planData = cloneDeep(props.planDetails?.data);
    planData.l2_name = [props.selectedL2FilterValue?.value];
    const payload = getPlanPayload(planData, props.planLevels);
    payload.filters.push({
      attribute_name: "l3_name",
      value: [l3Value],
      prefix: "levels",
      operator: "in",
    });
    let attributeResponse = await props.getWedgeAttributesData(
      payload,
      props.screenConfiguration?.common?.endpoint_project_name || "assort"
    );
    let tempAttributeList = attributeResponse?.data?.data.map((attrJson) => {
      return `attributes_${attrJson.attribute_name}`;
    });
    setAttributeList(tempAttributeList);
    return attributeResponse?.data?.data;
  };

  const updateChoiceData = async (
    e,
    data,
    column,
    isChanged,
    newValue,
    initialValue
  ) => {
    let columnId = column.colId;
    let tempRowData = [];
    let result = [];
    const channels = props.planDetails?.data?.channel;
    if (columnId === "l3_name" && data.l3_name) {
      setShowLoader(true);
      result = await fetchWedgeAttributesData(data.l3_name);
    }
    //Update total units after updation of particular channel unit
    if (isChannelMultiple(props.planDetails?.data)) {
      if (columnId === "l3_name") {
        data[columnId] = data.l3_name;
        data["choice_name"] = `${data.l3_name}---Choice_`;
      } else if (
        columnId ===
        `${props.screenConfiguration?.common?.drop_key || "drop"}_name`
      ) {
        data[columnId] =
          data[`${props.screenConfiguration?.common?.drop_key || "drop"}_name`];
      } else {
        data[columnId] = newValue;
      }
      data["total_qty"] = 0;
      channels.forEach((chan) => {
        let key = `${chan}_units`;
        data["total_qty"] += data[key] || 0;
      });
    }
    AddChoiceInstance.current.api.forEachNode((obj, index) => {
      obj = obj.data;
      if (data.uniqueID === obj.uniqueID) {
        if(columnId === "l3_name" && data.l3_name){
          result.forEach((attribute) => {
            obj[
              `attributes_${attribute.attribute_name}`
            ] = attribute.attribute_value.map((value) => {
              return {
                label: value,
                value: value,
              };
            });
          });
          setShowLoader(false);
        }
        obj[columnId] =
          columnId === "l3_name"
            ? data.l3_name
            : columnId === "drop_name" || columnId === "launch_name"
            ? data[
                `${props.screenConfiguration?.common?.drop_key || "drop"}_name`
              ]
            : newValue;
        obj.choice_name =
          columnId === "l3_name"
            ? `${data.l3_name}---Choice_`
            : obj.choice_name;
      }
      tempRowData.push(obj);
    });
    setTableData(tempRowData);
    AddChoiceInstance.current.api.refreshCells({
      force: true,
      suppressFlash: false,
    });
  };

  const closeConfirmPrompt = () => {
    setShowConfirmDialog(false);
  };

  const loadTableInstance = (params) => {
    AddChoiceInstance.current = params;
  };

  return (
    <React.Fragment>
      <LoadingOverlay loader={showLoader} spinner>
        <div className={`${classes.choiceTable} choiceViewTable`}>
          <AgGridTable
            rowdata={tableData}
            columns={columns}
            loadTableInstance={loadTableInstance}
            onBlur={updateChoiceData}
            uniqueRowId="uniqueID"
            customCellRenderer={(cellProps) =>
              assortAgGridCustomCellRenderer(
                cellProps,
                "add_choice_table",
                null,
                props
              )
            }
            sizeColumnsToFitFlag
            adjustTableHeight={true}
          />
        </div>
        <div className={classes.choiceActionDiv}>
          <Button
            variant="contained"
            color="primary"
            title={"Save"}
            id={"save"}
            disabled={!attributeList?.length}
            onClick={() => handleConfirmDialog()}
            className={`${classes.buttonFitContent} ${classes.choiceBtnAlignRight}`}
          >
            Save
          </Button>
          <Button
            variant="outlined"
            color="primary"
            title={"Cancel"}
            id={"cancel"}
            onClick={() => props.toggleViewAddChoiceModal(false, "choice")}
            className={`${classes.buttonFitContent} ${classes.choiceBtnAlignRight}`}
          >
            Cancel
          </Button>
        </div>
        <Prompt
          isOpen={showConfirmDialog}
          title="Confirm Budget"
          subHeading="You want to hold on to budget?"
          infoList={[]}
          primaryButtonProps={{
            children: "Yes",
            onClick: () => {
              callAddChoiceApi(true);
            },
          }}
          tertiaryButtonProps={{
            children: "No",
            onClick: () => callAddChoiceApi(false),
          }}
        />
      </LoadingOverlay>
    </React.Fragment>
  );
};

const mapStateToProps = (state) => {
  return {
    planDetails: planDashboardServiceActions.planDetailsDataSelector(state),
    levelsJson: planDashboardServiceActions.levelsJsonDataSelector(state),
    planLevels: planDashboardServiceActions.planLevelsDataSelector(state),
    planMetricsData: planWedgeServiceActions.planMetricsDataSelector(state),
    columnHeaderJson: planDashboardServiceActions.columnHeaderJsonSelector(
      state
    ),
    screenConfiguration:
      state.assortsmartReducer.commonAssortReducer.screenConfiguration,
  };
};

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators(
    {
      addWedgeChoiceValidtion,
      addWedgeChoice,
      getWedgeAttributesData,
      setWedgeAttributeData,
      addWedgeStyle,
      set2_3_Loader,
      addSnack,
    },
    dispatch
  );
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(AddChoiceComponent));
