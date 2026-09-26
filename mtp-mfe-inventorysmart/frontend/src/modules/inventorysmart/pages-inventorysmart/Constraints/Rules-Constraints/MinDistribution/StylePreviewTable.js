import { useMemo } from "react";
import { useExceptionStyles } from "../../../Exceptions-stores/exceptionStyles";
import { DISTRIBUTION_STRATEGY_TABLE_CONFIG } from "../../../../constants-inventorysmart/stringConstants";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";

const PREVIEW_LOADER_MIN_HEIGHT = "280px";

const STYLE_PREVIEW_COLUMNS = agGridColumnFormatter(
  [
    {
      ...DISTRIBUTION_STRATEGY_TABLE_CONFIG,
      column_name: "article",
      label: "Style Color ID",
      order_of_display: 0,
      tc_mapping_code: 5053001,
      is_searchable: true,
      extra: { sortLabelType: "str" , ignoreSuppressSizeToFit: true, rightAlign: true },
    },
    {
      ...DISTRIBUTION_STRATEGY_TABLE_CONFIG,
      column_name: "min",
      label: "Min",
      order_of_display: 1,
      tc_mapping_code: 5053002,
      extra: { sortLabelType: "int" , ignoreSuppressSizeToFit: true},
      type: "int"
    },
  ],
  {},
  {},
  false,
  null,
  false,
  false
);

const StylePreviewTable = (props) => {
  const exceptionClasses = useExceptionStyles();
  const tableData = useMemo(
    () =>
      (props.rows || []).map((row, index) => ({
        ...row,
        key: `${row.article}-${index}`,
      })),
    [props.rows]
  );

  const loaderMinHeight =
    props.loader || tableData.length === 0
      ? PREVIEW_LOADER_MIN_HEIGHT
      : "unset";

  return (
    <Loader loader={props.loader} minHeight={loaderMinHeight}>
      <div className={exceptionClasses.stylePreviewTable}>
        {tableData.length > 0 && (
          <AgGridComponent
            key={props.tableKey || "style-preview"}
            rowdata={tableData}
            columns={STYLE_PREVIEW_COLUMNS}
            selectAllHeaderComponent={false}
            sizeColumnsToFitFlag={true}
            uniqueRowId="key"
            tableHeader="Preview"
            tableId={`min-style-distribution-preview-${props.tableKey || "default"}`}
            pagination={false}
            cardContainer={false}
          />
        )}
      </div>
    </Loader>
  );
};

export default StylePreviewTable;
