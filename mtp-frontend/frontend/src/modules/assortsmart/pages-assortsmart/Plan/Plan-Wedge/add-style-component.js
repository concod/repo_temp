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
  addWedgeStyle,
  getWedgeAttributesData,
  set2_3_Loader,
} from "../../../services-assortsmart/Plan/Plan-Wedge/plan-wedge-service";
import {
  displaySnackMessage,
  getAddStylePayload,
  setOptionsForAttribute,
} from "./plan-wedge-functions";

const AddStyleComponent = (props) => {
  const [columns, setColumns] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [showLoader, setShowLoader] = useState(false);
  const [attributeList, setAttributeList] = useState([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const classes = useStyles();
  const AddStyleInstance = useRef({});

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
    let styleColumns = cloneDeep(props.styleLevelColumn)
      .map((col) => {
        if (channels.includes(col.column_name)) {
          let column = col.sub_headers
            .map((child) => {
              child.is_editable = true;
              return child;
            })
            .filter(
              (obj) =>
                obj.column_name === col.column_name + "_total_qty" ||
                obj.column_name === col.column_name + "_forecasted_qty"
            );
          col.sub_headers = column;
          return col;
        }
        switch (col.column_name) {
          case "style_id":
            col.is_editable = true;
            break;
          case "attributes":
            return col;
          case "color_count_ty":
            return col;
          case "launch_name" || "drop_name":
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
              col.is_hidden = false;
              col.is_editable = true;
              col.type = "list";
              col.options = props.dropOptions;
              return col;
            }
            break;
          case "l3_name":
            col.is_hidden = false;
            col.is_frozen = true;
            col.is_editable = true;
            col.type = "list";
            col.options = props.l3Options;
            break;
          default:
            return null;
        }
        return col;
      })
      .filter((col) => col);
    let wedgeStyleColumns = styleColumns;
    if (tableData?.length) {
      wedgeStyleColumns = setOptionsForAttribute(
        cloneDeep(styleColumns),
        attributeList,
        props
      );
    }
    let column = agGridColumnFormatter(
      wedgeStyleColumns,
      props.columnHeaderJson
    );
    setColumns(column);
  }, [props.styleLevelColumn]);

  useEffect(() => {
    let number = props.styleNumber;
    let tableArr = [];
    let attributeData = {};
    attributeList.forEach((attr) => {
      if (attr.includes("attributes_")) {
        attributeData[attr] = null;
      }
    });

    if (tableData.length > number) {
      tableArr = tableData.splice(0, number);
      setTableData(tableArr);
      AddStyleInstance.current.api.refreshCells({
        force: true,
        suppressFlash: false,
      });
      return;
    }
    for (var i = 1; i <= number; i++) {
      if (tableData.length < i) {
        tableArr.push({
          style_id: ``,
          color_count_ty: null,
          uniqueID: `style_${number}`,
          ...attributeData,
        });
      }
    }
    if (!isEmpty(attributeData)) {
      tableArr = tableData.concat(tableArr);
      setTableData(tableArr);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.styleNumber, attributeList]);

  const fetchWedgeAttributesData = async (l3Value) => {
    let planData = cloneDeep(props.planDetails?.data);
    planData.l2_name = [
      props.selectedL2FilterValue?.value || planData?.l2_name[0],
    ];
    const payload = getPlanPayload(planData, props.planLevels);
    if (props.screenConfiguration?.common?.final_level === "l2_name") {
      payload.filters.push({
        attribute_name: "l2_name",
        value: planData["l2_name"],
        prefix: "levels",
        operator: "in",
      });
    } else {
      payload.filters.push({
        attribute_name: "l3_name",
        value: [l3Value],
        prefix: "levels",
        operator: "in",
      });
    }
    let attributeResponse = await props.getWedgeAttributesData(
      payload,
      props.screenConfiguration?.common?.endpoint_project_name || "assort",
      props.planDetails?.data?.plan_code
    );
    let tempAttributeList = attributeResponse?.data?.data?.mapped_product_attributes.map(
      (attrJson) => {
        return `attributes_${attrJson.attribute_name}`;
      }
    );
    setAttributeList(tempAttributeList);
    return attributeResponse?.data?.data?.mapped_product_attributes;
  };

  const updateStyleData = async (
    e,
    data,
    column,
    isChanged,
    newValue,
    initialValue
  ) => {
    let columnId = column.colDef.accessor;
    let tempRowData = [];
    let result = [];
    if (columnId === "l3_name" && data.l3_name) {
      setShowLoader(true);
      result = await fetchWedgeAttributesData(data.l3_name);
    }
    AddStyleInstance.current.api.forEachNode((obj, index) => {
      obj = obj.data;
      if (data.uniqueID === obj.uniqueID && columnId === "l3_name") {
        result.forEach((attribute) => {
          data[
            `attributes_${attribute.attribute_name}`
          ] = attribute.attribute_value.map((value) => {
            return {
              label: value,
              value: value,
            };
          });
        });
        setShowLoader(false);
        if (!result?.length) {
          Object.keys(data).map((key) => {
            if (key.includes("attributes_")) {
              data[key] = [];
            }
            return key;
          });
        }
        obj[columnId] = columnId === "l3_name" ? data.l3_name : newValue;
        obj.style_id =
          columnId === "l3_name" && data.l3_name
            ? `${data.l3_name}---style_`
            : data.style_id;
      }
      tempRowData.push(obj);
    });
    setTableData(tempRowData);
    AddStyleInstance.current.api.refreshCells({
      force: true,
      suppressFlash: false,
    });
  };

  const addStyleValidations = () => {
    let isAddStyleNull = false,
      isStyleIDNull = false,
      buyUnitGreaterForecast = false,
      isStyleUniform = false,
      styleID = "";
    AddStyleInstance.current.api.forEachNode((styleData) => {
      styleData = styleData.data;
      //Validate if all fields are filled
      Object.keys(styleData).forEach((key) => {
        if (!styleData[key]) {
          return (isAddStyleNull = true);
        } else if (isChannelMultiple(props.planDetails?.data)) {
          const channels = props.planDetails?.data?.channel;
          channels.forEach((channel) => {
            if (
              styleData[`${channel}_total_qty`] <
              styleData[`${channel}_forecasted_qty`]
            ) {
              return (buyUnitGreaterForecast = true);
            }
          });
        } else if (
          styleData[`${props.planDetails?.data?.channel?.[0]}_total_qty`] <
          styleData[`${props.planDetails?.data?.channel?.[0]}_forecasted_qty`]
        ) {
          return (buyUnitGreaterForecast = true);
        }
      });
      //Validate if style has id
      if (!styleData.style_id.split("style_")[1]) {
        return (isStyleIDNull = true);
      }
      //Validate if added style id is in required format
      if (!styleData.style_id.includes(`${styleData.l3_name}---style_`)) {
        styleID = `${styleData.l3_name}---style_`;
        return (isStyleUniform = true);
      }
    });
    if (isAddStyleNull) {
      displaySnackMessage("All Fields are required", "error", props.addSnack);
      return;
    }
    if (isStyleIDNull) {
      displaySnackMessage("Please add style id", "error", props.addSnack);
      return;
    }
    if (buyUnitGreaterForecast) {
      displaySnackMessage(
        "Buy units should be greater than Sales units",
        "error",
        props.addSnack
      );
      return;
    }
    if (isStyleUniform) {
      displaySnackMessage(
        `Please add valid style id (${styleID})`,
        "error",
        props.addSnack
      );
      return;
    }
    let result = props.wedgeStyleTableData.filter(function (wedgeData) {
      // filter out same style id
      return tableData.some(function (styleData) {
        return (
          wedgeData.style_id === styleData.style_id &&
          (!styleData?.[
            `${props.screenConfiguration?.common?.drop_key || "drop"}_name`
          ] ||
            wedgeData[
              `${props.screenConfiguration?.common?.drop_key || "drop"}_name`
            ] ===
              styleData[
                `${props.screenConfiguration?.common?.drop_key || "drop"}_name`
              ])
        );
      });
    });
    let checkDuplicateStyle = tableData
      .map((tableObj) => {
        return {
          style_id: tableObj.style_id,
          l3_name: tableObj.l3_name,
          [`${
            props.screenConfiguration?.common?.drop_key || "drop"
          }_name`]: tableObj[
            `${props.screenConfiguration?.common?.drop_key || "drop"}_name`
          ],
        };
      })
      .filter((tableObj, index, styleID) => {
        let styleIndex = styleID.findIndex(function (styleData) {
          return JSON.stringify(styleData) === JSON.stringify(tableObj);
        });
        return styleIndex !== index;
      });
    if (result?.length || checkDuplicateStyle?.length) {
      displaySnackMessage("Style id cannot be same", "error", props.addSnack);
      return;
    }
    setShowConfirmDialog(true);
  };

  const callAddStyleApi = async (hold_budget) => {
    let planDetails = props.planDetails?.data;
    let addStylePayload = getAddStylePayload(
      planDetails,
      AddStyleInstance,
      props
    );
    let payload = {
      plan_code: planDetails.plan_code,
      hold_budget,
      add_styles: addStylePayload,
      wedge_level: "style_level",
      filters: [
        {
          attribute_name: "date",
          value: [
            `'${planDetails?.selling_period_sdate}' and '${planDetails?.selling_period_edate}'`,
          ],
          operator: "between",
        },
      ],
      compare_type: planDetails.compare_year,
    };

    props.set2_3_Loader(true);
    setShowConfirmDialog(false);
    await props
      .addWedgeStyle(
        payload,
        props.screenConfiguration?.common?.endpoint_project_name || "assort",
        props.planDetails?.data?.plan_code
      )
      .then((addStyleResponse) => {
        if (addStyleResponse?.data?.status) {
          displaySnackMessage(
            addStyleResponse?.data?.data?.message,
            addStyleResponse?.data?.data?.status ? "success" : "error",
            props.addSnack
          );
          props.set2_3_Loader(false);
          if (addStyleResponse?.data?.data?.status) {
            props.toggleViewAddChoiceModal(false, "style");
            props.setCallUpdateStyleWedge(true);
          }
        }
      })
      .catch((_err) => {
        displaySnackMessage("Something went wrong", "error", props.addSnack);
        props.set2_3_Loader(false);
      });
  };

  const closeConfirmPrompt = () => {
    setShowConfirmDialog(false);
  };

  const loadTableInstance = (params) => {
    AddStyleInstance.current = params;
  };

  return (
    <React.Fragment>
      <LoadingOverlay loader={showLoader} spinner>
        <div className={`${classes.choiceTable} choiceViewTable`}>
          <AgGridTable
            rowdata={tableData}
            columns={columns}
            loadTableInstance={loadTableInstance}
            onBlur={updateStyleData}
            uniqueRowId="uniqueID"
            customCellRenderer={(cellProps) =>
              assortAgGridCustomCellRenderer(cellProps, "add_style_table")
            }
            sideBar={false}
            sizeColumnsToFitFlag
            adjustTableHeight={true}
            staticColId={true}
          />
        </div>
        <div className={classes.choiceActionDiv}>
          <Button
            variant="contained"
            color="primary"
            title={"Save"}
            id={"save"}
            disabled={!attributeList?.length}
            onClick={() => addStyleValidations()}
            className={`${classes.buttonFitContent} ${classes.choiceBtnAlignRight}`}
          >
            Save
          </Button>
          <Button
            variant="outlined"
            color="primary"
            title={"Cancel"}
            id={"cancel"}
            onClick={() => props.toggleViewAddChoiceModal(false, "style")}
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
              callAddStyleApi(true);
            },
          }}
          tertiaryButtonProps={{
            children: "No",
            onClick: () => callAddStyleApi(false),
          }}
        />
      </LoadingOverlay>
    </React.Fragment>
  );
};

const mapStateToProps = (state) => {
  return {
    planDetails: planDashboardServiceActions.planDetailsDataSelector(state),
    planLevels: planDashboardServiceActions.planLevelsDataSelector(state),
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
      addWedgeStyle,
      getWedgeAttributesData,
      set2_3_Loader,
      addSnack,
    },
    dispatch
  );
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(AddStyleComponent));
