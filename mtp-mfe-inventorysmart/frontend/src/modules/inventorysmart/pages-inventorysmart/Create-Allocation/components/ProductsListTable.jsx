import React, { useEffect, useState, useRef } from "react";
import { useDispatch } from "react-redux";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import globalStyles from "core/Styles/globalStyles";
import { addSnack } from "core/actions/snackbarActions";
import { getProductBreakdown, sbcnaFinalise } from "modules/inventorysmart/services-inventorysmart/Create-Allocation/create-allocation-services";
import { getWeekFromActionCell, getDateRangePayload, applyWeekLevelFinalisedRenderer } from "../helperFunctions";
import ReplenishmentMatrixTable from "./ReplenishmentMatrixTable";

const ProductsListTable = (props) => {
  const dispatch = useDispatch();
  const globalClasses = globalStyles();

  const [tableColumns, setTableColumns] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showReplenishmentMatrix, setShowReplenishmentMatrix] = useState(false);
  const [finaliseLoading, setFinaliseLoading] = useState(false);
  const tableInstance = useRef(null);

  const onProductCodeClick = (data) => {
    setSelectedProduct(data);
    setShowReplenishmentMatrix(true);
  };

  // Build payload for product-breakdown API
  const buildPayload = () => {
    const baseFilters = props.parentFilterPayload?.filters || [];
    // Ensure the selected alert article is included (when redirected from
    // alerts), without duplicating it if already present in the parent payload.
    const hasArticleFilter =
      props.articleFilter &&
      baseFilters.some((f) => f.filter_id === props.articleFilter.filter_id);
    const filters =
      props.articleFilter && !hasArticleFilter
        ? [...baseFilters, props.articleFilter]
        : baseFilters;
    const shipColName = props.shipLinkColumnName;
    const shipCode = props.selectedShip?.[shipColName] || "";

    return {
      filters,
      ship_code: String(shipCode),
      meta: {
        search: [],
        range: [],
        sort: [],
      },
      ...getDateRangePayload(props.startEndDate),
    };
  };

  const getTableData = async () => {
    if (!props.selectedShip) return;

    setTableData([]);
    setTableColumns([]);
    setLoading(true);
    try {
      const dataResponse = await dispatch(getProductBreakdown(buildPayload()));

      if (dataResponse?.data?.status) {
        const responseData = dataResponse.data.data;
        const columns = responseData.columns || [];
        const rows = responseData.rows || [];

        // Set label for the action button since API returns empty extra
        const actionConfig = columns.find((col) => col.column_name === "action");
        if (actionConfig) {
          actionConfig.extra = { ...actionConfig.extra, label: "Finalise" };
        }

        const dynamicActionMap = {
          product_code: onProductCodeClick,
          finalise: onFinaliseClick,
        };
        const finalColumns = agGridColumnFormatter(columns, null, dynamicActionMap);

        // Show "Finalised" text instead of button for weeks already finalised
        applyWeekLevelFinalisedRenderer(finalColumns);

        setTableColumns(finalColumns);
        setTableData(rows);
      }
    } catch (e) {
      console.error("Error fetching product breakdown data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (props.selectedShip) {
      setShowReplenishmentMatrix(false);
      setSelectedProduct(null);
      getTableData();
    }
  }, [props.selectedShip]);

  const loadTableInstance = (params) => {
    tableInstance.current = params;
  };

  const onFinaliseClick = async (data, cellProps) => {
    const shipColName = props.shipLinkColumnName;
    const shipCode = props.selectedShip?.[shipColName] || "";
    const productCode = data?.product_code || "";
    const week = getWeekFromActionCell(cellProps);

    const payload = {
      level: "product",
      hierarchy_attribute_name: props.hierarchyAttributeName,
      hierarchy_attribute_value: props.hierarchyAttributeValue,
      ship_code: String(shipCode),
      product_code: String(productCode),
      week,
      status: "FINALISED",
      ...getDateRangePayload(props.startEndDate),
      ...(props.articleFilter?.values?.length > 0 && { article: props.articleFilter.values }),
    };

    setFinaliseLoading(true);
    try {
      const response = await dispatch(sbcnaFinalise(payload));
      if (response?.data?.status) {
        dispatch(addSnack({ message: response?.data?.message || "Finalised successfully", options: { variant: "success" } }));
        getTableData();
        props.refreshParent?.();
      } else {
        dispatch(addSnack({ message: response?.data?.message || "Failed to finalise", options: { variant: "error" } }));
      }
    } catch (e) {
      console.error("Error finalising product:", e);
      const errMsg = e?.response?.data?.message || "Error finalising. Please try again.";
      dispatch(addSnack({ message: errMsg, options: { variant: "error" } }));
    } finally {
      setFinaliseLoading(false);
    }
  };

  const shipColName = props.shipLinkColumnName;
  const shipDisplayValue = props.selectedShip?.[shipColName] || "";
  const tableTitle = `Product Breakdown${
    shipDisplayValue ? ` - ${shipDisplayValue}` : ""
  }`;

  return (
    <div className={globalClasses.marginTop}>
      <Loader loader={loading || finaliseLoading}>
        <AgGridComponent
          columns={tableColumns}
          rowdata={tableData}
          uniqueRowId="product_code"
          tableHeader={tableTitle}
          sizeColumnsToFitFlag={false}
          suppressFieldDotNotation
          pagination={false}
          loadTableInstance={loadTableInstance}
          onReviewClick={(cellProps) => onFinaliseClick(cellProps?.data, cellProps)}
          nestedTable={showReplenishmentMatrix}
          nestedTableComponent={
            <ReplenishmentMatrixTable
              selectedShip={props.selectedShip}
              parentFilterPayload={props.parentFilterPayload}
              shipLinkColumnName={props.shipLinkColumnName}
              hierarchyAttributeName={props.hierarchyAttributeName}
              hierarchyAttributeValue={props.hierarchyAttributeValue}
              startEndDate={props.startEndDate}
              isViewOnly={props.isViewOnly}
              selectedProductCode={selectedProduct?.product_code}
              isProductFinalized={selectedProduct?.is_finalized}
              articleFilter={props.articleFilter}
              refreshParent={() => {
                getTableData();
                props.refreshParent?.();
              }}
            />
          }
        />
      </Loader>
    </div>
  );
};

export default ProductsListTable;
