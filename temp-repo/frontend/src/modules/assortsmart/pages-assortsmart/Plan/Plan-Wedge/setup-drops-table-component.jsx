import React, { useState, useEffect, useRef, useCallback } from "react";
import { connect } from "react-redux";
import { Button, Box } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import HeightIcon from "@mui/icons-material/Height";
import { cloneDeep, compact, groupBy, isEmpty, uniqBy } from "lodash";
import Loader from "core/Utils/Loader/loader";

import {
  parseValue,
  attributeFormatter,
  isDropPlan,
  isChannelMultiple,
  assortAgGridCustomCellRenderer,
  getDefaultChannelValue,
  filterView,
  externalFilterLevelsChannelSubChannel,
} from "../../../utils-assortsmart/utilityFunctions";
import { useStyles as sharedStyles } from "core/Utils/styles/assortSmartUsestyles";
import { set2_3_Loader } from "../../../services-assortsmart/Plan/Plan-Wedge/plan-wedge-service";
import PlanDropTabViewComponent from "../plan-drop-tab-view-component";
import AgGridTable from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { configureLevels } from "modules/assortsmart/pages-assortsmart/Plan-Dashboard/components/common-plan-functions";
import { bindActionCreators } from "redux";
import * as planDashboardServiceActions from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import * as planWedgeServiceActions from "modules/assortsmart/services-assortsmart/Plan/Plan-Wedge/plan-wedge-service";
import * as commonAssortServiceActions from "modules/assortsmart/services-assortsmart/common-assort-service";
import {
  getNumberFromKey,
  setPenColumnValuesToMax,
  setReceiptDropValue,
  setValuesScaledPerCell,
} from "./optimization-constraint-table-functions";

const useStyles = makeStyles((theme) => ({
  setupDropsHeader: {
    display: "flex",
    justifyContent: "flex-end",
  },
  setupDropsTableContainer: {
    marginTop: theme.typography.pxToRem(24),
  },
}));

const SetupDropsTableComponent = (props) => {
  const [setupDropsTableColumns, setSetupDropsTableColumns] = useState([]);
  const [setupDropsTableData, setSetupDropsTableData] = useState([]);
  const [groupedDrops, setGroupedDrops] = useState(null);
  const [selectedDropData, setSelectedDropData] = useState(null);
  const [channelFormFields, setChannelFormFields] = useState([]);
  const [selectedFormData, setSelectedFormData] = useState({});
  const [levelsOptions, setLevelsOptions] = useState({});
  const [levelSelected, setLevelSelected] = useState({});
  const [channelSelected, setChannelSelected] = useState({});
  const classes = useStyles();
  const sharedClasses = sharedStyles();
  const SetupDropInstance = useRef({});
  let formData = {};

  useEffect(() => {
    props.fetchPlanSetupDrops();
  }, []);

  useEffect(() => {
    if (setupDropsTableData?.length) {
      const levelsData = configureLevels(
        props.planDetails?.data,
        props.levelsJson,
        setupDropsTableData
      );
      setLevelsOptions(levelsData?.options);
      setLevelSelected(levelsData?.selectedValue);
      // Configure formdata for levels
      Object.keys(props.levelsJson).forEach((level) => {
        if (!isEmpty(levelsData?.selectedValue?.[level])) {
          formData[level] = levelsData?.selectedValue?.[level]?.label;
        }
      });
      setSelectedFormData(formData);
    }
  }, [setupDropsTableData]);

  useEffect(() => {
    if (!isEmpty(props.planSetupDropsData.data)) {
      formatSetupDropCol();
      setDataForSetupDropsTable();
    }
  }, [props.planSetupDropsData]);

  useEffect(() => {
    if (
      props.planSetupDropsData.data?.data?.length &&
      isDropPlan(
        props.planDetails?.data,
        `${props.screenConfiguration?.common?.drop_key || "drops"}_count`
      )
    ) {
      let drops = groupBy(props.planSetupDropsData.data?.data, "drop");
      setGroupedDrops(drops);
    }
    if (
      isChannelMultiple(props.planDetails?.data) &&
      props.planSetupDropsData.data?.data?.length
    ) {
      let channel = groupBy(props.planSetupDropsData.data?.data, "channel");
      let channelOpt = Object.keys(channel).map((chan) => {
        return {
          label: chan,
          value: chan,
          id: chan,
        };
      });
      let defaultChannel = getDefaultChannelValue(
        channelOpt,
        props.planDetails?.data
      );
      formData.channel_list = defaultChannel?.label;
      setSelectedFormData(formData);
      setChannelFormFields(channelOpt);
      setChannelSelected(defaultChannel);
    }
  }, [props.planSetupDropsData.data?.data]);

  useEffect(() => {
    formData = selectedFormData;
    if (SetupDropInstance?.current?.api) {
      SetupDropInstance.current.api.onFilterChanged();
    }
  }, [selectedFormData, SetupDropInstance]);

  useEffect(() => {
    if (
      selectedDropData &&
      isDropPlan(
        props.planDetails?.data,
        `${props.screenConfiguration?.common?.drop_key || "drops"}_count`
      ) &&
      SetupDropInstance?.current?.api
    ) {
      var hardcodedFilter = {
        drop: { type: "equals", filter: selectedDropData },
      };
      SetupDropInstance.current.api.setFilterModel(hardcodedFilter);
      SetupDropInstance.current.api.redrawRows();
      formatSetupDropCol();
    }
  }, [selectedDropData, SetupDropInstance]);

  const setDataForSetupDropsTable = () => {
    if (!isEmpty(props.planSetupDropsData.data?.data)) {
      let setupDropsTempData = props.planSetupDropsData.data?.data.map(
        (obj) => {
          // creating a new object due to the error cannot assign to read only object
          let item = {};
          for (let i = 1; i <= props.drops_count; i++) {
            item[`penetration_flow_${i}`] =
              Math.round((obj[`flow_${i}_percentage_flow`] || 0) * 10000) / 100;
            item[`receipt($)_flow_${i}`] = obj[`flow_${i}_rcpt_$`] || 0;
            item[`receipt_unit_flow_${i}`] = isNaN(
              Math.round(parseValue(obj[`flow_${i}_rcpt_qty`] || 0))
            )
              ? ""
              : Math.round(parseValue(obj[`flow_${i}_rcpt_qty`] || 0));
          }
          item["penetration_total"] = parseInt(obj["total_percentage_flow"]);
          // using same key total_rcpt_qty
          item["receipt_unit_total"] = obj["total_rcpt_qty"];
          item["total_receipts($)"] = obj["total_rcpt_$"];
          item["receipt_unit_total"] = obj["total_rcpt_qty"];
          item["l0_name"] = obj["l0_name"];
          item["l1_name"] = obj["l1_name"];
          item["l2_name"] = obj["l2_name"];
          item["l3_name"] = obj["l3_name"];
          item["channel"] = obj["channel"];
          item["plan_code"] = obj["plan_code"];
          item["plan_wedge_opt_drop_id"] = obj["plan_wedge_opt_drop_id"];
          item["drop_split"] = obj["drop_split"];
          item["choice_flow"] = obj["choice_flow"];
          item["drop"] = obj.drop || "";
          item["uniqueID"] =
            obj["l3_name"] +
            obj.drop +
            obj.channel +
            obj.sub_channel +
            obj["l1_name"] +
            obj["l2_name"];
          return item;
        }
      );
      setSetupDropsTableData(setupDropsTempData);
      let dataWithoutFooter = setupDropsTempData.filter(
        (obj) => obj.l3_name !== "Total"
      );
      props.updateSetupDropsDetails(dataWithoutFooter);
    }
    props.setSetupDropsLoader(false);
  };

  const setCellsToBeDisabled = (row, item) => {
    let arrayList = ["penetration", "choice_flow"];
    for (let i = 1; i <= props.drops_count; i++) {
      arrayList.push(`penetration_drop_${i}`);
    }
    return row?.drop_split && arrayList.indexOf(!item.accessor) ? false : true;
  };

  const updateSetUpDropsTableData = (params) => {
    const { colDef, newValue, rowIndex } = params;
    let columnId = params.column.colId;
    let row = params.data;
    let tempRowData = [];
    SetupDropInstance.current.api.forEachNode((obj, index) => {
      obj = obj.data;
      if (obj.uniqueID === row.uniqueID) {
        if (
          columnId.includes("penetration") ||
          columnId.includes("receipt_unit")
        ) {
          obj[columnId] = setPenColumnValuesToMax(columnId.includes("receipt_unit") ? parseInt(newValue): newValue);
          // calculating total within the function as a separate function will take the old values & data will not be updated accordingly
          setReceiptDropValue(
            obj,
            columnId,
            columnId.includes("receipt_unit") ? parseInt(newValue): newValue,
            row,
            index,
            props
          );
        }
        obj[columnId] =
          columnId === "drop_split" ? newValue : parseInt(newValue);
      }
      if (obj.l3_name !== "Total") {
        tempRowData.push(obj);
      }
    });
    props.updateSetupDropsDetails(tempRowData);
    SetupDropInstance.current.api.refreshCells({
      force: true,
      suppressFlash: false,
    });
  };

  // To do setup drop down for qtys
  const scaleUpAndDownSetupDropsTable = () => {
    if (SetupDropInstance?.current?.api) {
      let tempData = [];
      SetupDropInstance.current.api.forEachNode((node) => {
        if (node.data.l3_name !== "Total") {
          tempData.push(node.data);
        }
      });
      tempData.forEach((obj, index) => {
        let sum = 0; // sum of all values in the drop
        for (let i = 0; i < props.drops_count; i++) {
          sum = sum + parseFloat(obj[`penetration_flow_${i + 1}`]);
        }

        //remaining value  = 100 - sum of all drops
        let remainingValue = 100 - sum;
        if (remainingValue !== 0 && sum) {
          setValuesScaledPerCell(remainingValue, obj, sum, index, props);
        }
      });
      setSetupDropsTableData([]);
      setSetupDropsTableData(tempData);

      let dataWithoutFooter = tempData.filter((obj) => obj.l3_name !== "Total");
      props.updateSetupDropsDetails(dataWithoutFooter);
      SetupDropInstance.current.api.refreshCells({
        force: true,
        suppressFlash: false,
      });
    }
  };

  const formatSetupDropCol = () => {
    let columnData = cloneDeep(props.planSetupDropsData.data?.columns);
    let columnsWithDisablekey = columnData.map((obj) => {
      if (obj.column_name === "choice_flow") {
        obj.disabled = setCellsToBeDisabled;
      }
      if (obj.column_name === "penetration") {
        obj.sub_headers = obj.sub_headers.map((item) => {
          item.disabled = setCellsToBeDisabled;
          return item;
        });
      }
      return obj;
    });
    // filtering out is_hidden columns for now as to do add a quick fix
    let visibleColumns = columnsWithDisablekey.map((col) => {
      if (col.column_name === "total") {
        col.sub_headers = col.sub_headers.filter((subCol) => !subCol.is_hidden);
      }
      return col;
    });
    if (selectedDropData) {
      let dropNumber = getNumberFromKey(
        attributeFormatter(selectedDropData),
        "Drops "
      );
      visibleColumns.forEach((parCol) => {
        if (parCol.sub_headers.length) {
          parCol.sub_headers.forEach((subCol) => {
            subCol.disableSortBy = true;
            let flowNumber = getNumberFromKey(subCol.column_name, "flow_");
            if (flowNumber < dropNumber) {
              subCol.is_editable = false;
            }
          });
        }
      });
    }
    let cols = agGridColumnFormatter(visibleColumns, props.columnHeaderJson);
    cols.forEach((col) => {
      if (col.accessor === "drop") {
        col.filter = "agTextColumnFilter";
      }
      if (col?.children?.length) {
        col.children = col.children.map((children) => {
          return {
            ...children,
            aggFunc: children.footer,
          };
        });
      }
    });
    setSetupDropsTableColumns(cols);
  };

  const handleChangeChannelFilter = (updatedFormData, id) => {
    setChannelSelected(updatedFormData);
    let formOption = cloneDeep(formData);
    formOption.channel_list = updatedFormData?.label;
    formData = formOption;
    setSelectedFormData(formOption);
    SetupDropInstance.current.api.onFilterChanged();
  };

  const handleLevelsChange = (option, key) => {
    const selectedValue = levelSelected;
    let formOption = cloneDeep(formData);
    selectedValue[key.filter_id] = option;
    formOption[key.filter_id] = option?.label;
    formData = formOption;
    if (key.filter_id === "l1_name") {
      let l2Values = uniqBy(setupDropsTableData, "l2_name");
      let l2ValuesOpt = l2Values?.map((item) => {
        if (item.l1_name === option?.label) {
          return {
            label: item.l2_name,
            value: item.l2_name,
            id: item.l2_name,
          };
        }
      });
      l2ValuesOpt = compact(l2ValuesOpt);
      levelsOptions.l2_name_option = l2ValuesOpt;
      formOption.l2_name = l2ValuesOpt[0]?.label;
      selectedValue.l2_name = l2ValuesOpt[0];
      setLevelsOptions(levelsOptions);
    }
    setSelectedFormData(formOption);
    setLevelSelected(selectedValue);
    SetupDropInstance.current.api.onFilterChanged();
  };

  const isExternalFilterPresent = useCallback(() => {
    // if formData is not empty, then we are filtering
    return isChannelMultiple(props.planDetails?.data) ||
      props.planDetails?.data?.l1_name?.length > 1 ||
      props.planDetails?.data?.l2_name?.length > 1
      ? true
      : false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doesExternalFilterPass = useCallback(
    //whenever channel or sub channel, levels changes data get filtered here
    (node) => {
      return externalFilterLevelsChannelSubChannel(
        node,
        setupDropsTableData,
        selectedFormData,
        props.planDetails?.data,
        props.levelsJson
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [formData, selectedFormData, setupDropsTableData]
  );

  const loadTableInstance = (params) => {
    SetupDropInstance.current = params;
    if (
      isDropPlan(
        props.planDetails?.data,
        `${props.screenConfiguration?.common?.drop_key || "drops"}_count`
      )
    ) {
      let selectedDrop = Object.keys(
        groupBy(props.planSetupDropsData.data?.data, "drop")
      )[0];
      var hardcodedFilter = {
        drop: { type: "equals", filter: selectedDrop },
      };
      SetupDropInstance.current.api.setFilterModel(hardcodedFilter);
    }
  };

  return (
    <Loader loader={props.setupDropsLoader}>
      <Box display="flex" alignItems="center">
        <Box>
          {groupedDrops && (
            <div>
              <PlanDropTabViewComponent
                groupedDrops={groupedDrops}
                onChangeTab={setSelectedDropData}
              />
            </div>
          )}
        </Box>
        <Box width={"50%"} display="flex">
          {channelFormFields?.length && setupDropsTableData?.length
            ? filterView(
                "Channel",
                "channel",
                channelFormFields,
                handleChangeChannelFilter,
                channelSelected,
                sharedClasses.formContainer,
                sharedClasses.inputLabel
              )
            : null}
          {Object.keys(props.levelsJson).map((levelKey) => {
            return (
              levelsOptions[levelKey]?.length > 0 &&
              filterView(
                props.columnHeaderJson?.[levelKey],
                levelKey,
                levelsOptions[levelKey],
                handleLevelsChange,
                levelSelected[levelKey],
                sharedClasses.formContainer,
                sharedClasses.inputLabel
              )
            );
          })}
        </Box>
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          marginLeft="auto"
        >
          <Button
            color="primary"
            variant="outlined"
            className={sharedClasses.buttonFitContent}
            onClick={() => scaleUpAndDownSetupDropsTable()}
            id="scale-up-down-setupdrops"
          >
            <HeightIcon />
          </Button>
          <div>Scale up/down</div>
        </Box>
      </Box>

      <div className={classes.setupDropsTableContainer}>
        <AgGridTable
          rowdata={setupDropsTableData || []}
          columns={setupDropsTableColumns}
          loadTableInstance={loadTableInstance}
          //onBlur={updateSetUpDropsTableData}
          onCellValueChanged={updateSetUpDropsTableData}
          uniqueRowId={"uniqueID"}
          customCellRenderer={(cellProps) =>
            assortAgGridCustomCellRenderer(cellProps, "setupflowtable")
          }
          isExternalFilterPresent={isExternalFilterPresent}
          doesExternalFilterPass={doesExternalFilterPass}
          sideBar={false}
          pagination={false}
        />
      </div>
    </Loader>
  );
};

const mapStateToProps = (state) => {
  return {
    planDetails: planDashboardServiceActions.planDetailsDataSelector(state),
    planLevels: planDashboardServiceActions.levelsJsonDataSelector(state),
    planSetupDropsData: planWedgeServiceActions.planSetupDropsDataSelector(
      state
    ),
    levelsJson: planDashboardServiceActions.levelsJsonDataSelector(state),
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
      set2_3_Loader,
    },
    dispatch
  );
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(SetupDropsTableComponent);
