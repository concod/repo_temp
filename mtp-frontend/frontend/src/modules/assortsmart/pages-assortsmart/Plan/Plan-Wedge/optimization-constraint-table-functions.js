import { Button, Stack } from "@mui/material";
import ConfirmPrompt from "core/commonComponents/confirmPrompt";
import { times } from "lodash";
export const getLevelDetailValues = (props, data) => {
  let levels = Object.keys(props.levelsJson).map((levelKey) => {
    return { [levelKey]: data[levelKey] };
  });
  return Object.assign(...levels);
};
// Update api Will be called when toggle is at Overall Constraint
export const saveOptimizationValues = async (
  type,
  OptConstraintInstance,
  props,
  displaySnackBarMessage,
  fetchOptimizationTableData,
  reload_wedge,
  isValueChanged,
  setIsValueChanged,
  isView = false
) => {
  try {
    let optimizationUpdateData = [];
    OptConstraintInstance.current.api.forEachNode((node) => {
      let data = node.data;
      data["l3_name"] = data["original_l3_name"];
      optimizationUpdateData.push({
        plan_code: props.planDetails.data?.plan_code,
        levels: {
          ...getLevelDetailValues(props, data), 
          channel: data.type
        },
        attribute_value: {
          min_value: Math.round(data.store_type_min),
          max_value: Math.round(data.store_type_max),
          increment: Math.round(data.store_type_increments),
          min_size: Math.round(data.store_type_min_size),
          moq: Math.round(data.store_type_moq),
        },
      });
    });
    let body = {
      plan_optimization: optimizationUpdateData,
      is_value_changed: isValueChanged,
    };
    if (!isView) {
      await props.updateOptimizationConstraintData(
        body,
        props.screenConfiguration?.common?.endpoint_project_name || "assort",
        props.planDetails?.data?.plan_code
      );
      displaySnackBarMessage(
        "Successfully updated optimization data",
        "success"
      );
    }
    setIsValueChanged(false);
    let param = type && type === "toggle" ? "cluster_code" : "l3_name";
    await fetchOptimizationTableData(param, reload_wedge);
    if (
      (props.drops_count <= 1 && !type) ||
      (props.screenConfiguration?.common?.endpoint_project_name ===
        "assort-smart" &&
        !type)
    ) {
      props.callOptimizeWedge();
    }
  } catch (error) {
    displaySnackBarMessage("Failed to update optimization data", "error");
  }
};
//Update api Will be called when toggle is at Cluster wise Constraint
export const saveClusterOptimizationValues = async (
  type,
  OptConstraintInstance,
  props,
  uniqueRowData,
  displaySnackBarMessage,
  fetchOptimizationTableData,
  reload_wedge,
  isValueChanged,
  setIsValueChanged,
  isView = false
) => {
  try {
    let payloadData = [];
    OptConstraintInstance.current.api.forEachNode((node) => {
      let tableData = node.data;
      times(uniqueRowData.length, (index) => {
        let cluster =
          tableData[`cluster_display_name${index + 1}`] &&
          tableData[`cluster_display_name${index + 1}`]?.toLowerCase();
        payloadData.push({
          ...getLevelDetailValues(props, tableData),
          l3_name: tableData["original_l3_name"],
          channel: tableData["type"],
          cluster_display_name: tableData[`cluster_display_name${index + 1}`],
          cluster_code: tableData[`cluster_code${index + 1}`],
          min_value: parseInt(tableData[`${cluster}_min`]),
          max_value: parseInt(tableData[`${cluster}_max`]),
          increment: parseInt(tableData[`${cluster}_increments`]),
          min_size: parseInt(tableData[`${cluster}_min_size`]),
        });
      });
    });
    let jsonData = [];
    let dataset = [].concat.apply([], payloadData).forEach((item) => {
      if (item.cluster_code !== undefined) {
        item["l3_name"] = item["l3_name"];
        jsonData.push({
          plan_code: props.planDetails.data?.plan_code,
          levels: {
            ...getLevelDetailValues(props, item),
            cluster_code: item.cluster_code,
            cluster_display_name: item.cluster_display_name,
            channel: item.channel
          },
          attribute_value: {
            min_value: parseInt(item.min_value),
            max_value: parseInt(item.max_value),
            increment: parseInt(item.increment),
            min_size: parseInt(item.min_size),
          },
        });
      }
    });
    let body = {
      plan_optimization: jsonData,
      is_value_changed: isValueChanged,
    };
    if (!isView) {
      await props.updateOptimizationConstraintData(
        body,
        props.screenConfiguration?.common?.endpoint_project_name || "assort",
        props.planDetails?.data?.plan_code
      );
      displaySnackBarMessage(
        "Successfully updated cluster wise optimization data",
        "success"
      );
    }
    setIsValueChanged(false);
    let param = type && type === "toggle" ? "l3_name" : "cluster_code";
    await fetchOptimizationTableData(param, reload_wedge);
    if (
      (props.drops_count <= 1 && !type) ||
      (props.screenConfiguration?.common?.endpoint_project_name ===
        "assort-smart" &&
        !type)
    ) {
      props.callOptimizeWedge();
    }
  } catch (error) {
    displaySnackBarMessage(
      "Failed to update cluster wise optimization data",
      "error"
    );
  }
};
export const renderSetupDropsTable = (
  props,
  enableSetupDrops,
  SetupDropsTableComponent,
  setupDropsLoader,
  setSetupDropsLoader,
  globalClasses
) => {
  return (
    <ConfirmPrompt
      message=""
      title="Set Up Flows"
      hideActionFooter={true}
      size="xl"
      showCloseIcon={true}
      setConfirm={enableSetupDrops}
      confirmCallback={enableSetupDrops}
      ariaLabeledBy="setup-flows"
    >
      <SetupDropsTableComponent
        drops_count={props.drops_count}
        columnHeaderJson={props.columnHeaderJson}
        planDetails={props.planDetails.data}
        updateSetupDropsDetails={props.updateSetupDropsDetails}
        addSnack={props.addSnack}
        callUpdateSetupDrop={props.callUpdateSetupDrop}
        setupDropsLoader={setupDropsLoader}
        setSetupDropsLoader={setSetupDropsLoader}
        fetchPlanSetupDrops={props.fetchPlanSetupDrops}
      />
      <Stack
        direction="row"
        justifyContent="flex-end"
        alignItems="center"
        className={globalClasses.marginTop}
      >
        <Button
          color="primary"
          variant="contained"
          id="generate-wedge"
          onClick={props.generateWedge}
          disabled={setupDropsLoader}
        >
          Generate Wedge
        </Button>
      </Stack>
    </ConfirmPrompt>
  );
};
// setup drop table functions
export const getNumberFromKey = (key, seperator) => {
  let splitArr = key.split(seperator);
  return parseInt(splitArr[1]);
};
// To set pen drop values to 100
export const setPenColumnValuesToMax = (value) => {
  if (value > 100) {
    return 1;
  } else return value;
};
// To calculate the price of receipt($) and receipt unit drop based on pen drop quantities
export const setReceiptDropValue = (
  obj,
  columnId,
  value,
  row,
  index,
  props
) => {
  let totalPen = 0;
  let totalReceipt = 0;
  for (let i = 0; i < props.drops_count; i++) {
    let pen_key = `penetration_flow_${i + 1}`;
    let receipt_key = `receipt($)_flow_${i + 1}`;
    let receipt_qty_key = `receipt_unit_flow_${i + 1}`;
    // keys from API response
    let pen_rowData_key = `flow_${i + 1}_percentage_flow`;
    let receipt_rowData_key = `flow_${i + 1}_rcpt_$`;
    let receipt_qty_rowData_key = `flow_${i + 1}_rcpt_qty`;
    // Calculations are done based on api response to maintain aspect ratio
    /*
        example -
        drop 1 pen      drop 1 recpt ($)
        8               10
        50(val)         x
        x = 50 * (10/8) or  50 * 1.25
        1.25 being the recpt ($) for 1% pen , the same value would be multiplied across for diff pen %
      */
    // To check the calculations once the datasets are present
    if (pen_key === columnId && pen_key.includes("penetration")) {
      // receipt cost
      obj[receipt_key] =
        value *
        (props.planSetupDropsData.data?.data[index][receipt_rowData_key] /
          props.planSetupDropsData.data?.data[index][pen_rowData_key]);
      // receipt units
      obj[receipt_qty_key] =
        value *
        (props.planSetupDropsData.data?.data[index][receipt_qty_rowData_key] /
          props.planSetupDropsData.data?.data[index][pen_rowData_key]);
    } else if (
      receipt_qty_key === columnId &&
      receipt_qty_key.includes("receipt_unit")
    ) {
      // receipt cost
      obj[receipt_key] =
        value *
        (props.planSetupDropsData.data?.data[index][receipt_rowData_key] /
          props.planSetupDropsData.data?.data[index][receipt_qty_rowData_key]);
      //  pen
      obj[pen_key] =
        value *
        (props.planSetupDropsData.data?.data[index][pen_rowData_key] /
          props.planSetupDropsData.data?.data[index][receipt_qty_rowData_key]);
    } else {
      obj[receipt_key] = row[receipt_key];
      obj[pen_key] = row[pen_key];
      obj[receipt_qty_key] = row[receipt_qty_key];
    }
    // penetration total
    totalPen += obj[pen_key];
    obj["penetration_total"] = totalPen / 100;
    // receipt unit total
    totalReceipt += obj[receipt_qty_key];
    obj["receipt_unit_total"] = totalReceipt;
  }
  return obj;
};
export const setValuesScaledPerCell = (
  lockPen,
  unlockPen,
  row,
  sum,
  index,
  props
) => {
  //  To check on scaling functions with proper data
  let receiptUnitTotal = 0;
  if (lockPen > 100) {
    props.addSnack({
      message: `Locked percentage cannot be more than 100%`,
      options: {
        variant: "error",
      },
    });
  } else if (unlockPen == 0) {
    props.addSnack({
      message: "Total Non-Locked penetration should not be 0",
      options: {
        variant: "error",
      },
    });
  } else {
    for (let j = 1; j <= props.drops_count; j++) {
      let lockKey = `${row.uniqueID}penetration_flow_${j}`;
      let value = parseFloat(
        Math.round(row[`penetration_flow_${j}`] * 100) / 100
      );
      if (!row?.cellLocked?.[`${lockKey}`]) {
        value = (value / unlockPen) * (100 - lockPen);
      }
      row[`penetration_flow_${j}`] = Math.round(value * 100) / 100;
      row["penetration_total"] = 1;
      row[`receipt($)_flow_${j}`] =
        row[`penetration_flow_${j}`] *
        (props.planSetupDropsData.data?.data[index][`flow_${j}_rcpt_$`] /
          props.planSetupDropsData.data?.data[index][
            `flow_${j}_percentage_flow`
          ]);
      row[`receipt_unit_flow_${j}`] =
        row[`penetration_flow_${j}`] *
        (props.planSetupDropsData.data?.data[index][`flow_${j}_rcpt_qty`] /
          props.planSetupDropsData.data?.data[index][
            `flow_${j}_percentage_flow`
          ]);
      receiptUnitTotal += row[`receipt_unit_flow_${j}`];
      row["receipt_unit_total"] = receiptUnitTotal;
    }
  }
  return row;
};
