import {
  kpiFlow,
  rowDataInxMapping,
  sample_row_data,
  channelRollUpMapping,
  timeRollUpMapping,
  valueByColumnValueKey
} from "../../apis/budgetTable.data";

import budgetTableCalculation from "../budgetTableCalculation.util";

describe("BudgetTableCalculation", () => {
  it("Test 1: Update Sales Unit", () => {
    const sampleCellDetail = {
      columnDef: {
        label: "Retail",
        column_name: "202301_Retail_Total",
        extra: { isEditable: true },
        maxWidth: "128"
      },
      row: {
        metric: "Sales U",
        metric_key: "comp_qty",
        plan_version: "WP",
        l1_name: "Balloon",
        l2_name: "Party",
        "202301_Total": 30,
        "202301_Retail_Total": 10,
        "202301_Wholesale_Total": 20,
        "202302_Total": 70,
        "202302_Retail_Total": 30,
        "202302_Wholesale_Total": 40,
        "202303_Total": 110,
        "202303_Retail_Total": 50,
        "202303_Wholesale_Total": 60,
        "202304_Total": 150,
        "202304_Retail_Total": 70,
        "202304_Wholesale_Total": 80,
        jan_Total: 360,
        jan_ttl_Retail_Total: 160,
        jan_ttl_Wholesale_Total: 200,
        "202305_Total": 25,
        "202305_Retail_Total": 12.5,
        "202305_Wholesale_Total": 12.5,
        "202306_Total": 25,
        "202306_Retail_Total": 12.5,
        "202306_Wholesale_Total": 12.5,
        "202307_Total": 25,
        "202307_Retail_Total": 12.5,
        "202307_Wholesale_Total": 12.5,
        "202308_Total": 25,
        "202308_Retail_Total": 12.5,
        "202308_Wholesale_Total": 12.5,
        feb_Total: 100,
        feb_ttl_Retail_Total: 50,
        feb_ttl_Wholesale_Total: 50,
        "202309_Total": 25,
        "202309_Retail_Total": 12.5,
        "202309_Wholesale_Total": 12.5,
        "202310_Total": 25,
        "202310_Retail_Total": 12.5,
        "202310_Wholesale_Total": 12.5,
        "202311_Total": 25,
        "202311_Retail_Total": 12.5,
        "202311_Wholesale_Total": 12.5,
        "202312_Total": 25,
        "202312_Retail_Total": 12.5,
        "202312_Wholesale_Total": 12.5,
        March_Total: 100,
        March_ttl_Retail_Total: 50,
        March_ttl_Wholesale_Total: 50,
        "202313_Total": 25,
        "202313_Retail_Total": 12.5,
        "202313_Wholesale_Total": 12.5,
        "202314_Total": 25,
        "202314_Retail_Total": 12.5,
        "202314_Wholesale_Total": 12.5,
        "202315_Total": 25,
        "202315_Retail_Total": 12.5,
        "202315_Wholesale_Total": 12.5,
        "202316_Total": 25,
        "202316_Retail_Total": 12.5,
        "202316_Wholesale_Total": 12.5,
        April_Total: 100,
        April_ttl_Retail_Total: 50,
        April_ttl_Wholesale_Total: 50,
        q1_Total: 660,
        q1_ttl_Retail_Total: 330,
        q1_ttl_Wholesale_Total: 330,
        uniqueId: 2
      },
      rowIndex: 1,
      changedCellData: {
        before_user_entered_value: 10,
        user_entered_value: 20
      }
    };

    budgetTableCalculation.bind({})({
      rowData: sample_row_data,
      columnDefs: [],
      changedColumnDef: {
        accessor: "some_accessor",
        column_name: "some_column_name"
      },
      changedRow: sampleCellDetail.row,
      changedRowInx: sampleCellDetail.rowIndex,
      changedCellData: sampleCellDetail.changedCellData,
      timeRollUpMapping: timeRollUpMapping,
      channelRollUpMapping: channelRollUpMapping,
      valueByColumnValueKey: valueByColumnValueKey,
      rowDataInxMapping: rowDataInxMapping,
      kpiFlow: kpiFlow
    });
  });
});
