import Loader from "core/Utils/Loader/loader";
import AgGridComponent from "core/Utils/agGrid";
import { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { addSnack } from "core/actions/snackbarActions";
import { getColumnsAg } from "core/actions/tableColumnActions";
import CellRenderers from "core/Utils/agGrid/cellRenderer";
import {
  downloadProductStoreViewDataInRecomendation,
  getProductStoreViewInRecomendation,
} from "../../services-inventorysmart/Create-Scenario/store-view-services";
import { displaySnackMessages } from "../inventorysmart-utility";
import agGridColumnFormatter from "../../../../core/Utils/agGrid/column-formatter";
import ProductAndStoreDetailsInRecommendation from "./ProductAndStoreDetailsInRecommendation";
import {
  buildScenarioSimBody,
  shouldFetchScenarioRecommendation,
} from "./scenarioCompareUtils";
import { Alert } from "impact-ui-v3";
import {
  ensureTrendSafeColumns,
  renderTrendSafeCell,
} from "./trendCellUtils";

const DEFAULT_SCENARIO_RECOMMENDATION_LINK_COLUMNS = [
  "article",
  "display_article",
  "style_colour_id",
  "store_code",
];

const isScenarioRecommendationLinkColumn = (columnName, config) => {
  if (DEFAULT_SCENARIO_RECOMMENDATION_LINK_COLUMNS.includes(columnName)) {
    return true;
  }
  const configuredField = config?.scenarioRecommendationLinkField;
  return Boolean(configuredField && columnName === configuredField);
};

function ProductStoreViewInRecomendation(props) {
  const [isLoading, setIsLoading] = useState(false);
  const [productViewTableData, setProductViewTableData] = useState([]);
  const [tableColumnConfig, setTableColumnConfig] = useState(null);
  const [selectedProductDetails, setSelectedProductDetails] = useState(null);
  const SelectedProductDetailsRef = useRef(null);
  const agGridInstance = useRef(null);

  const isNewFlow =
    !props.isReadOnlyCompare &&
    !!props.finalizeAllocationConfig?.scenarioRecommendationNewFlow;
  const showProductViewAlert =
    isNewFlow &&
    props.tabName === "product" &&
    props.showScenarioAppliedAlert;

  useEffect(() => {
    if (
      shouldFetchScenarioRecommendation({
        scenarioId: props.scenarioId,
        compareCodes: props.compareCodes,
      })
    ) {
      const getProductView = async () => {
        if (
          shouldFetchScenarioRecommendation({
            scenarioId: props.scenarioId,
            compareCodes: props.compareCodes,
          })
        ) {
          setProductViewTableData([]);
          try {
            setIsLoading(true);
            const body = buildScenarioSimBody({
              scenarioId: props.scenarioId,
              compareCodes: props.compareCodes,
            });

            let productStoreViewInRecomendationResponse = await props.getProductStoreViewInRecomendation(
              body,
              props.tabName
            );
            if (productStoreViewInRecomendationResponse?.data?.show_message) {
              displaySnackMessages(
                productStoreViewInRecomendationResponse?.data?.message,
                "success",
                props
              );
            }
            const tableData = (
              productStoreViewInRecomendationResponse?.data?.data?.data
                ?.table_data || []
            ).map((item) => {
              if (!props.isReadOnlyCompare) {
                item.is_selected = true;
              }
              return item;
            });
            setProductViewTableData(tableData);
            if (!props.isReadOnlyCompare) {
              props.setTotalProductListInRecommendation(tableData.length);
            }
            let tempColumnConfig =
              productStoreViewInRecomendationResponse?.data?.data?.data
                ?.table_config;
            tempColumnConfig = agGridColumnFormatter(tempColumnConfig) || [];
            tempColumnConfig = tempColumnConfig.map((item) => {
              const isDrilldownLink = isScenarioRecommendationLinkColumn(
                item.column_name,
                props.finalizeAllocationConfig
              );
              // Product/store identifier columns open nested details.
              // Default: article + store_code. Also style_colour_id / display_article
              // (and optional TAM scenarioRecommendationLinkField) so Option is a link.
              if (isDrilldownLink) {
                item.type = "link";
                item.is_aggregated = false;
                item.is_editable = true;
                item.cellRenderer = (cellProps, extraProps) => {
                  return (
                    <CellRenderers
                      cellData={cellProps}
                      column={item}
                      extraProps={extraProps}
                    ></CellRenderers>
                  );
                };
              } else {
                item.cellStyle = getCellStyle;
              }
              if (item.sub_headers?.length) {
                item.sub_headers.forEach((subHeader) => {
                  subHeader.cellStyle = getCellStyle;
                });
              }
              item.onClick = (tableInfo) => {
                setSelectedProductDetails(tableInfo?.cellData?.data);
              };
              return item;
            });

            setTableColumnConfig(
              isNewFlow
                ? ensureTrendSafeColumns(tempColumnConfig, tableData[0])
                : tempColumnConfig
            );
            setIsLoading(false);
          } catch (error) {
            console.error("Error fetching columns:", error);
            setIsLoading(false);
          }
        }
      };
      getProductView();
    }
  }, []);

  const loadTableInstance = (params) => {
    agGridInstance.current = params;
  };

  const getCellStyle = () => {
    if (SelectedProductDetailsRef.current) {
      return {
        pointerEvents: "none",
        opacity: 0.5,
      };
    }
    return {};
  };

  const onSelectionChanged = (event) => {
    let selectedRows = [];
    agGridInstance?.current?.api?.forEachNode((node) => {
      if (node?.level === 0)
        node.selected &&
          selectedRows.push({
            ...node.data,
          });
    });
    props.setSelectedProductListInRecommendation(selectedRows);
  };

  useEffect(() => {
    SelectedProductDetailsRef.current = selectedProductDetails;
    agGridInstance?.current?.api.refreshCells({ force: true });
  }, [selectedProductDetails]);

  // const handleDownload = async () => {
  //   try {
  //     let response = await props.downloadProductStoreViewDataInRecomendation(
  //       {
  //         scenario_id: props.scenarioId,
  //       },
  //       props.tabName
  //     );
  //     displaySnackMessages(response?.data?.data?.message, "success", props);
  //   } catch (err) {
  //     displaySnackMessages(err?.response?.data?.message, "error", props);
  //   }
  // };

  return (
    <Loader loader={isLoading} minHeight={150}>
      {productViewTableData.length > 0 && (
        <AgGridComponent
          selectAllHeaderComponent={!props.isReadOnlyCompare}
          pagination={false}
          columns={tableColumnConfig}
          onSelectionChanged={
            props.isReadOnlyCompare ? undefined : onSelectionChanged
          }
          loadTableInstance={loadTableInstance}
          rowdata={productViewTableData}
          tableHeader="Product details"
          customSelectCellStyle={getCellStyle}
          // onDownloadButtonClick={() => handleDownload()}
          // showDownloadButton={true}
          downloadAsExcel={true}
          hideSelectCurrentPageRecords={true}
          nestedTable={selectedProductDetails}
          sizeColumnsToFitFlag={true}
          suppressFieldDotNotation
          {...(isNewFlow
            ? {
                customCellRenderer: renderTrendSafeCell,
                noEditableCustomCellRender: (cellProps) =>
                  renderTrendSafeCell(cellProps, cellProps?.colDef),
              }
            : {})}
          topCenterOptions={
            showProductViewAlert ? (
              <Alert
                severity="success"
                title="Scenario applied successfully"
                onClose={() => props.onCloseScenarioAppliedAlert?.()}
                style={{
                  border: "none",
                  boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.12)",
                }}
              />
            ) : null
          }
          nestedTableComponent={
            <ProductAndStoreDetailsInRecommendation
              scenarioId={props.scenarioId}
              compareCodes={props.compareCodes}
              selectedDataDetails={selectedProductDetails}
              setSelectedDataDetails={setSelectedProductDetails}
              tabName={props.tabName}
              scenarioRecommendationNewFlow={isNewFlow}
              {...props}
            />
          }
        />
      )}
    </Loader>
  );
}

const mapStateToProps = (state) => {
  return {
    finalizeAllocationConfig:
      state?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartFinalizeAllocationConfig,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (snack) => dispatch(addSnack(snack)),
    getColumnsAg: (params) => dispatch(getColumnsAg(params)),
    getProductStoreViewInRecomendation: (payload, viewType) =>
      dispatch(getProductStoreViewInRecomendation(payload, viewType)),
    downloadProductStoreViewDataInRecomendation: (payload, viewType) =>
      dispatch(downloadProductStoreViewDataInRecomendation(payload, viewType)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ProductStoreViewInRecomendation);
