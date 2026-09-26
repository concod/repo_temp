import React, { useState, useEffect } from "react";
import { useExceptionStyles } from "../../../Exceptions-stores/exceptionStyles";
import { DISTRIBUTION_STRATEGY_TABLE_CONFIG } from "../../../../constants-inventorysmart/stringConstants";
import { cloneDeep } from "lodash";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import { useTranslation } from "impact-ui-v3";

const SizeDistributionTable = (props) => {
  const { t } = useTranslation();
  const [tableCols, setTableCols] = useState([]);
  const [sizeDistributionTableData, setSizeDistributionTableData] = useState(
    []
  );

  useEffect(() => {
    if (props.data.length > 0) {
      let tableData = [];
      let configs = [
        {
          ...DISTRIBUTION_STRATEGY_TABLE_CONFIG,
          column_name: "store_number",
          is_frozen: true,
          order_of_display: 0,
          label: t("inventorysmart.rclStoreNumberColumn"),
          is_searchable: true,
          is_sortable: true,
          tc_mapping_code: 5052001,
          extra: { sortLabelType: "int" },
        },
        {
          ...DISTRIBUTION_STRATEGY_TABLE_CONFIG,
          column_name: "Size Distribution",
          label: t("inventorysmart.rclSizeDistributionUnitsLabel"),
          order_of_display: 1,
          tc_mapping_code: 5052002,
        },
      ];
      props?.data?.map((store, index) => {
        let rowData = {};
        let sizeDistributionCol = cloneDeep(configs[1]);
        let mappingCode = 5052002;
        store.data.map((item, sizeIdx) => {
          if (index === 0) {
            sizeDistributionCol.sub_headers.push({
              ...DISTRIBUTION_STRATEGY_TABLE_CONFIG,
              label: item.size,
              column_name: item.size,
              tc_mapping_code: ++mappingCode,
              order_of_display: sizeIdx + 2,
              child_tc_mapping_code: 5052002,
              extra: { sortLabelType: "int", ignoreSuppressSizeToFit: true },
            });
          }
          rowData[item.size] = item.normalized_size_level_proportion;
        });
        configs[1] = sizeDistributionCol;
        rowData["store_number"] = store.store_code;
        tableData.push(rowData);
      });
      configs = agGridColumnFormatter(
        configs,
        {},
        {},
        false,
        null,
        false,
        false
      );
      setTableCols(configs);
      setSizeDistributionTableData(tableData);
    }
  }, [props.data]);

  const useStyles = useExceptionStyles();
  return (
    <Loader loader={props.sizeDistributionLoader}>
      <div className={useStyles.sizeDistributionTable}>
        {tableCols.length > 0 && (
          <AgGridComponent
            rowdata={sizeDistributionTableData}
            columns={tableCols}
            selectAllHeaderComponent={false}
            sizeColumnsToFitFlag={true}
            uniqueRowId={"store_number"}
            tableHeader={t("inventorysmart.rclSizeDistributionHeader")}
            tableId="min-size-distribution"
            pagination={false}
          />
        )}
      </div>
    </Loader>
  );
};

export default SizeDistributionTable;
