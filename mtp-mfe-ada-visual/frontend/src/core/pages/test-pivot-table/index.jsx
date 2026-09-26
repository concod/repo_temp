import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { useEffect, useState } from "react";
import AgGridComponent from "core/Utils/agGrid";
import { useStyles } from "./style.js";
import CellRenderers from "core/Utils/agGrid/cellRenderer";
import { cloneDeep, isFunction, isNumber, toNumber } from "lodash";
import LoadingOverlay from "core/Utils/Loader/loader.js";

const TestPivotTable = () => {
  let [columnData, setColumnData] = useState([]);
  let [rowData, setRowData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  let duplicateRowDetails = {};
  const classes = useStyles();

  const addExtraColumns = (cols, columnName, numberOfExtraColumns) => {
    try {
      let duplicateCol = {};
      let extraColumns = [];
      let label = "";
      for (let i = 0; i < cols.length; i++) {
        if (cols[i]?.column_name == columnName) {
          duplicateCol = cloneDeep(cols[i]);
          label = cols[i].label;
          break;
        }
      }
      let iteration = 1;
      while (iteration <= numberOfExtraColumns) {
        extraColumns.push({
          ...duplicateCol,
          column_name: `temp_${columnName}_${iteration}`,
          label: `Temp ${label} ${iteration}`,
        });
        iteration++;
      }
      duplicateRowDetails = {
        numberOfRows: numberOfExtraColumns,
        columnName,
      };
      return extraColumns;
    } catch (error) {
      console.error("addExtraColumns error", error);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    let columnConfig = [
      {
        column_name: "advanced_search",
        tab_code: 0,
        search_preference: {
          range: [],
          search: [],
        },
      },
      {
        sub_headers: [],
        tc_code: 504,
        label: "SKU ID",
        column_name: "product_id",
        dimension: "Product",
        type: "number",
        is_frozen: false,
        is_editable: false,
        is_aggregated: false,
        order_of_display: 1,
        is_hidden: false,
        is_required: false,
        tc_mapping_code: "200030",
        aggregate_type: "",
        formatter: "",
        is_row_span: false,
        footer: "",
        is_searchable: true,
        extra: {},
        is_sortable: true,
        width: 200,
        is_deleted: false,
        is_master_group: false,
      },
      {
        sub_headers: [],
        tc_code: 504,
        label: "Dep",
        column_name: "department",
        dimension: "Product",
        type: "string",
        is_frozen: false,
        is_editable: false,
        is_aggregated: false,
        order_of_display: 1,
        is_hidden: false,
        is_required: false,
        tc_mapping_code: "200030",
        aggregate_type: "",
        formatter: "",
        is_row_span: false,
        footer: "",
        is_searchable: true,
        extra: {},
        is_sortable: true,
        width: 200,
        is_deleted: false,
        is_master_group: false,
      },
      {
        sub_headers: [],
        tc_code: 504,
        label: "Class",
        column_name: "class",
        dimension: "Product",
        type: "string",
        is_frozen: false,
        is_editable: false,
        is_aggregated: false,
        order_of_display: 1,
        is_hidden: false,
        is_required: false,
        tc_mapping_code: "200030",
        aggregate_type: "",
        formatter: "",
        is_row_span: false,
        footer: "",
        is_searchable: true,
        extra: {},
        is_sortable: true,
        width: 200,
        is_deleted: false,
        is_master_group: false,
      },
      {
        sub_headers: [],
        tc_code: 504,
        label: "Weeks",
        column_name: "week",
        dimension: "Product",
        type: "string",
        is_frozen: false,
        is_editable: false,
        is_aggregated: false,
        order_of_display: 1,
        is_hidden: false,
        is_required: false,
        tc_mapping_code: "200030",
        aggregate_type: "",
        formatter: "",
        is_row_span: false,
        footer: "",
        is_searchable: true,
        extra: {},
        is_sortable: true,
        width: 200,
        is_deleted: false,
        is_master_group: false,
      },
      {
        sub_headers: [],
        tc_code: 504,
        label: "Month",
        column_name: "month",
        dimension: "Product",
        type: "string",
        is_frozen: false,
        is_editable: false,
        is_aggregated: false,
        order_of_display: 1,
        is_hidden: false,
        is_required: false,
        tc_mapping_code: "200030",
        aggregate_type: "",
        formatter: "",
        is_row_span: false,
        footer: "",
        is_searchable: true,
        extra: {},
        is_sortable: true,
        width: 200,
        is_deleted: false,
        is_master_group: false,
      },
      {
        sub_headers: [],
        tc_code: 504,
        label: "Year",
        column_name: "year",
        dimension: "Product",
        type: "string",
        is_frozen: false,
        is_editable: false,
        is_aggregated: false,
        order_of_display: 1,
        is_hidden: false,
        is_required: false,
        tc_mapping_code: "200030",
        aggregate_type: "",
        formatter: "",
        is_row_span: false,
        footer: "",
        is_searchable: true,
        extra: {},
        is_sortable: true,
        width: 200,
        is_deleted: false,
        is_master_group: false,
      },
      {
        sub_headers: [],
        tc_code: 504,
        label: "Revenue",
        column_name: "revenue",
        dimension: "Product",
        type: "int",
        is_frozen: false,
        is_editable: true,
        is_aggregated: false,
        order_of_display: 1,
        is_hidden: false,
        is_required: false,
        tc_mapping_code: "200030",
        aggregate_type: "",
        formatter: "",
        is_row_span: false,
        footer: "",
        is_searchable: true,
        extra: {},
        is_sortable: true,
        width: 200,
        is_deleted: false,
        is_master_group: false,
      },
      {
        sub_headers: [],
        tc_code: 504,
        label: "Inventory",
        column_name: "inventory",
        dimension: "Product",
        type: "int",
        is_frozen: false,
        is_editable: true,
        is_aggregated: false,
        order_of_display: 1,
        is_hidden: false,
        is_required: false,
        tc_mapping_code: "200030",
        aggregate_type: "",
        formatter: "",
        is_row_span: false,
        footer: "",
        is_searchable: true,
        extra: {},
        is_sortable: true,
        width: 200,
        is_deleted: false,
        is_master_group: false,
      },
      {
        sub_headers: [],
        tc_code: 504,
        label: "OOS - Flag",
        column_name: "oos_flag",
        dimension: "Product",
        type: "number",
        is_frozen: false,
        is_editable: true,
        is_aggregated: false,
        order_of_display: 1,
        is_hidden: false,
        is_required: false,
        tc_mapping_code: "200030",
        aggregate_type: "",
        formatter: "",
        is_row_span: false,
        footer: "",
        is_searchable: true,
        extra: {},
        is_sortable: true,
        width: 200,
        is_deleted: false,
        is_master_group: false,
      },
    ];

    let pivotExtraColumns = 0;
    if (isNumber(toNumber(localStorage.getItem("pivotExtraColumns")))) {
      pivotExtraColumns = toNumber(localStorage.getItem("pivotExtraColumns"));
    }
    let extraColumns = addExtraColumns(
      columnConfig,
      "product_id",
      pivotExtraColumns
    );

    columnConfig = [...columnConfig, ...extraColumns];

    let columnInfo = agGridColumnFormatter(
      columnConfig,
      {},
      {},
      false,
      null,
      false
    );
    columnInfo = columnInfo.map((item) => {
      if (item.is_editable) {
        item.cellRenderer = (cellProps, extraProps) => {
          // if (
          //   cellProps?.node?.expanded === true &&
          //   cellProps?.node?.id?.includes("row-group")
          // ) {
          //   return "";
          // }
          if (cellProps?.colDef?.pivotKeys) {
            return cellProps?.value;
          }
          return (
            <CellRenderers
              cellData={cellProps}
              column={item}
              extraProps={extraProps}
              actions={null}
            ></CellRenderers>
          );
        };
      }
      return item;
    });
    setColumnData(columnInfo);
    // let rowConfig = [
    //   {
    //     product_id: 134143,
    //     department: "D1",
    //     class: "C1",
    //     revenue: 10,
    //     inventory: 87,
    //     oos_flag: 1,
    //     week: "FW 1",
    //     month: "M 1",
    //     year: "2022",
    //   },
    //   {
    //     product_id: 124123,
    //     department: "D1",
    //     class: "C2",
    //     revenue: 20,
    //     inventory: 75,
    //     oos_flag: 1,
    //     week: "FW 2",
    //     month: "M 1",
    //     year: "2022",
    //   },
    //   {
    //     product_id: 214,
    //     department: "D1",
    //     class: "C3",
    //     revenue: 30,
    //     inventory: 66,
    //     oos_flag: 1,
    //     week: "FW 3",
    //     month: "M 1",
    //     year: "2022",
    //   },
    //   {
    //     product_id: 123,
    //     department: "D2",
    //     class: "C4",
    //     revenue: 40,
    //     inventory: 90,
    //     oos_flag: 0,
    //     week: "FW 4",
    //     month: "M 1",
    //     year: "2022",
    //   },
    //   {
    //     product_id: 124124,
    //     department: "D2",
    //     class: "C5",
    //     revenue: 50,
    //     inventory: 77,
    //     oos_flag: 0,
    //     week: "FW 5",
    //     month: "M 2",
    //     year: "2022",
    //   },
    //   {
    //     product_id: 1231,
    //     department: "D2",
    //     class: "C6",
    //     revenue: 60,
    //     inventory: 69,
    //     oos_flag: 0,
    //     week: "FW 6",
    //     month: "M 2",
    //     year: "2022",
    //   },
    //   {
    //     product_id: 13214,
    //     department: "D3",
    //     class: "C7",
    //     revenue: 70,
    //     inventory: 65,
    //     oos_flag: 1,
    //     week: "FW 7",
    //     month: "M 2",
    //     year: "2022",
    //   },
    //   {
    //     product_id: 123213,
    //     department: "D3",
    //     class: "C8",
    //     revenue: 10,
    //     inventory: 85,
    //     oos_flag: 1,
    //     week: "FW 8",
    //     month: "M 2",
    //     year: "2022",
    //   },
    //   {
    //     product_id: 123124,
    //     department: "D1",
    //     class: "C1",
    //     revenue: 20,
    //     inventory: 87,
    //     oos_flag: 1,
    //     week: "FW 1",
    //     month: "M 1",
    //     year: "2021",
    //   },
    //   {
    //     product_id: 12312,
    //     department: "D1",
    //     class: "C2",
    //     revenue: 30,
    //     inventory: 75,
    //     oos_flag: 1,
    //     week: "FW 2",
    //     month: "M 1",
    //     year: "2021",
    //   },
    //   {
    //     product_id: 421,
    //     department: "D1",
    //     class: "C3",
    //     revenue: 40,
    //     inventory: 66,
    //     oos_flag: 1,
    //     week: "FW 3",
    //     month: "M 1",
    //     year: "2021",
    //   },
    //   {
    //     product_id: 123124213,
    //     department: "D2",
    //     class: "C4",
    //     revenue: 50,
    //     inventory: 90,
    //     oos_flag: 0,
    //     week: "FW 4",
    //     month: "M 1",
    //     year: "2021",
    //   },
    //   {
    //     product_id: 12312421,
    //     department: "D2",
    //     class: "C5",
    //     revenue: 60,
    //     inventory: 77,
    //     oos_flag: 0,
    //     week: "FW 5",
    //     month: "M 2",
    //     year: "2021",
    //   },
    //   {
    //     product_id: 213124,
    //     department: "D2",
    //     class: "C6",
    //     revenue: 70,
    //     inventory: 69,
    //     oos_flag: 0,
    //     week: "FW 6",
    //     month: "M 2",
    //     year: "2021",
    //   },
    //   {
    //     product_id: 12312321,
    //     department: "D3",
    //     class: "C7",
    //     revenue: 10,
    //     inventory: 65,
    //     oos_flag: 1,
    //     week: "FW 7",
    //     month: "M 2",
    //     year: "2021",
    //   },
    //   {
    //     product_id: 321422,
    //     department: "D3",
    //     class: "C8",
    //     revenue: 20,
    //     inventory: 85,
    //     oos_flag: 1,
    //     week: "FW 8",
    //     month: "M 2",
    //     year: "2021",
    //   },
    // ];

    // let rowConfig = [
    //   {
    //     value: 21835,
    //     values_label: "Sum of revenue",
    //     year: "2022",
    //   },
    //   {
    //     value: 614,
    //     values_label: "Sum of inventory",
    //     year: "",
    //   },
    //   {
    //     value: 21835,
    //     values_label: "Sum of revenue",
    //     year: "2021",
    //   },
    //   {
    //     value: 614,
    //     values_label: "Sum of inventory",
    //     year: "",
    //   },
    // ];
    // let rowConfig = [];
    const getRandomNumber = (max) => {
      return Math.floor(Math.random() * max) + 1;
    };
    const generateExtraRows = () => {
      try {
        let extraRows = {};
        let iteration = 1;
        while (iteration <= duplicateRowDetails.numberOfRows) {
          extraRows[
            `temp_${duplicateRowDetails.columnName}_${iteration}`
          ] = getRandomNumber(100);
          iteration++;
        }
        return extraRows;
      } catch (error) {
        console.error("generateExtraRows error:", error);
      }
    };
    const generateLargeDataSet = (rowCount) => {
      const rows = [];
      for (let i = 1; i <= rowCount; i++) {
        let rowData = {
          product_id: i,
          department: `D${getRandomNumber(50)}`,
          class: `C${getRandomNumber(50)}`,
          week: `FW ${getRandomNumber(52)}`,
          month: `M ${getRandomNumber(12)}`,
          year: `20${getRandomNumber(40)}`,
          revenue: `${getRandomNumber(100)}`,
          inventory: `${getRandomNumber(150)}`,
          oos_flag: getRandomNumber(100) > 50 ? 1 : 0,
        };
        let extraRowData = generateExtraRows();
        rowData = { ...rowData, ...extraRowData };
        rows.push(rowData);
      }
      return rows;
    };
    let pivotTotalRows = 10000;
    if (isNumber(toNumber(localStorage.getItem("pivotTotalRows")))) {
      pivotTotalRows = toNumber(localStorage.getItem("pivotTotalRows"));
    }
    const rowConfig = generateLargeDataSet(pivotTotalRows); // Generate 100k rows
    setRowData(rowConfig);
    setIsLoading(false);
  }, []);

  const fixedDistributionCalculation = (params) => {
    const dataKey = params?.column?.colId;
    const totalDistributionValue = params?.data?.[dataKey];
    const totalRows = params?.node?.allLeafChildren?.length;
    if (totalRows) {
      params?.node?.allLeafChildren.forEach((leafChildNode) => {
        const newValue = totalDistributionValue / totalRows;
        leafChildNode.setDataValue(dataKey, newValue);
      });
    }
  };

  const weightedDistributionCalculation = (params) => {
    const dataKey = params?.column?.colId;
    const updatedTotalValue = params?.data?.[dataKey];
    const originalTotalValue = params?.oldValue;

    if (params?.node?.allLeafChildren?.length) {
      params?.node?.allLeafChildren.forEach((leafChildNode) => {
        const weightage =
          oldValue === 0
            ? 1 / params?.node?.allLeafChildren?.length
            : leafChildNode?.data?.[dataKey] / originalTotalValue;
        const newValue = weightage * updatedTotalValue;
        leafChildNode.setDataValue(dataKey, newValue);
      });
    }
  };

  // function is called on edit action in table
  const onCellValueChanged = (params) => {
    if (params?.column?.aggFunc === "sum") {
      const deaggregationFunction = params?.colDef?.deaggregationFunction;
      if (isFunction(deaggregationFunction)) {
        deaggregationFunction(params);
      } else if (deaggregationFunction === "weightedDistributionCalculation") {
        weightedDistributionCalculation(params);
      } else {
        fixedDistributionCalculation(params);
      }
    }
    params?.api?.refreshCells({
      force: true,
      suppressFlash: false,
    });
  };

  const getRowStyle = (params) => {
    if (params.node.id.includes("rowGroupFooter")) {
      return { display: "none" };
    }
    return null;
  };

  let customAggFunctions = {
    mul: {
      function: (params) => {
        const values = params.values;

        if (values.length === 0) return 0;

        // Step 1: Multiply all values together
        const product = values.reduce((acc, value) => acc * value, 1);

        // Step 2: Return the product
        return product;
      },
      label: "MUL",
    },
  };

  return (
    <LoadingOverlay text="Please wait..." loader={isLoading} spinner>
      <div className={classes.container}>
        <p>
          <strong>Pivot Testing Table :</strong>
        </p>
        <AgGridComponent
          columns={columnData}
          rowdata={rowData}
          pagination={true}
          uniqueRowId="product_id"
          sizeColumnsToFitFlag
          adjustTableHeight
          groupIncludeTotalFooter={true}
          groupIncludeFooter={true}
          onCellValueChanged={onCellValueChanged}
          enablePivot={true}
          setIsLoading={setIsLoading}
          customAggFunctions={customAggFunctions}
          // getRowStyle={getRowStyle}
          // autoGroupColumnDef={autoGroupColumnDef}
        />
      </div>
    </LoadingOverlay>
  );
};

export default TestPivotTable;
