import { connect } from "react-redux";
import { useEffect, useState, useRef } from "react";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import { addSnack } from "core/actions/snackbarActions";
import {
  getScenarioStoreSizeView,
  getScenarioProductSizeStoreView,
} from "../../services-inventorysmart/Create-Scenario/store-view-services";
import { displaySnackMessages } from "../inventorysmart-utility";
import {
  ensureTrendSafeColumns,
  renderTrendSafeCell,
} from "./trendCellUtils";
import { getPackCountRowStyle } from "./packCountRowUtils";
import {
  buildScenarioSimBody,
  shouldFetchScenarioRecommendation,
} from "./scenarioCompareUtils";

/**
 * Master-detail expand table for Size Breakdown.
 * - expandMode "by_store": POST scenario-store-size-view-data → header "Sizes"
 * - expandMode "by_size": POST scenario-product-size-store-view-data → header "Stores"
 */
const ScenarioBreakdownDetailExpand = (props) => {
  const [tableData, setTableData] = useState([]);
  const [tableColumnConfig, setTableColumnConfig] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const agGridInstance = useRef(null);

  const parentRow = props.parentRow || props.data || props.node?.data || {};
  const isByStoreExpand = props.expandMode === "by_store";
  const size = props.size ?? parentRow?.size;
  const storeCode = props.store_code ?? parentRow?.store_code;
  const article = props.article || parentRow?.article;

  useEffect(() => {
    const fetchDetailData = async () => {
      const canFetch = shouldFetchScenarioRecommendation({
        scenarioId: props.scenarioId,
        compareCodes: props.compareCodes,
      });
      if (!canFetch || !article) {
        setIsLoading(false);
        return;
      }

      setTableData([]);
      setIsLoading(true);
      try {
        const extra = { article };
        if (isByStoreExpand) {
          extra.store_code = storeCode;
        } else {
          extra.size = size;
        }
        const body = buildScenarioSimBody({
          scenarioId: props.scenarioId,
          compareCodes: props.compareCodes,
          extra,
        });

        let response;
        if (isByStoreExpand) {
          response = await props.getScenarioStoreSizeView(body);
        } else {
          // By Size expand → scenario-product-size-store-view-data
          response = await props.getScenarioProductSizeStoreView(body);
        }

        if (response?.data?.show_message) {
          displaySnackMessages(response?.data?.message, "success", props);
        }

        const responseData = response?.data?.data?.data || response?.data?.data;
        const rawTableData = responseData?.table_data || [];
        setTableData(
          rawTableData.map((row, index) => ({
            ...row,
            __rowId: `${
              isByStoreExpand ? row?.size : row?.store_code
            }_${index}`,
          }))
        );
        const formattedColumns =
          agGridColumnFormatter(responseData?.table_config) || [];
        setTableColumnConfig(
          ensureTrendSafeColumns(formattedColumns, rawTableData[0])
        );
      } catch (error) {
        console.error("Error fetching breakdown detail:", error);
        displaySnackMessages(
          error?.response?.data?.message || "Failed to load details",
          "error",
          props
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetailData();
  }, [
    props.scenarioId,
    props.compareCodes,
    article,
    props.expandMode,
    storeCode,
    size,
  ]);

  const loadTableInstance = (params) => {
    agGridInstance.current = params;
  };

  return (
    <Loader loader={isLoading} minHeight={120}>
      <AgGridComponent
        selectAllHeaderComponent={false}
        pagination={false}
        columns={tableColumnConfig}
        rowdata={tableData}
        loadTableInstance={loadTableInstance}
        sizeColumnsToFitFlag={true}
        hideSelectCurrentPageRecords={true}
        uniqueRowId="__rowId"
        suppressFieldDotNotation={true}
        tableHeader={isByStoreExpand ? "Sizes" : "Stores"}
        customCellRenderer={renderTrendSafeCell}
        noEditableCustomCellRender={(cellProps) =>
          renderTrendSafeCell(cellProps, cellProps?.colDef)
        }
        {...(isByStoreExpand
          ? {
              getRowStyle: getPackCountRowStyle,
            }
          : {})}
      />
    </Loader>
  );
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (snack) => dispatch(addSnack(snack)),
  getScenarioStoreSizeView: (payload) =>
    dispatch(getScenarioStoreSizeView(payload)),
  getScenarioProductSizeStoreView: (payload) =>
    dispatch(getScenarioProductSizeStoreView(payload)),
});

export default connect(
  null,
  mapDispatchToProps
)(ScenarioBreakdownDetailExpand);
