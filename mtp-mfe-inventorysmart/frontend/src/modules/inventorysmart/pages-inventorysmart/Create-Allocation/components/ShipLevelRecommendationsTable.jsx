import React, { useEffect, useState, useRef } from "react";
import { useDispatch } from "react-redux";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import globalStyles from "core/Styles/globalStyles";
import { isEmpty } from "lodash";
import { addSnack } from "core/actions/snackbarActions";
import { getShipLevelRecommendations, sbcnaFinalise } from "modules/inventorysmart/services-inventorysmart/Create-Allocation/create-allocation-services";
import { getWeekFromActionCell, getDateRangePayload, applyWeekLevelFinalisedRenderer } from "../helperFunctions";
import ProductsListTable from "./ProductsListTable";

const ShipLevelRecommendationsTable = (props) => {
  const dispatch = useDispatch();
  const globalClasses = globalStyles();

  const [tableColumns, setTableColumns] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedShip, setSelectedShip] = useState(null);
  const [showProductBreakdown, setShowProductBreakdown] = useState(false);
  const [linkColumnName, setLinkColumnName] = useState(null);
  const [finaliseLoading, setFinaliseLoading] = useState(false);
  const tableInstance = useRef(null);
  const linkColumnNameRef = useRef(null);
  const propsRef = useRef(props);
  propsRef.current = props;

  const onShipIdLinkClick = (data, columnName) => {
    setSelectedShip(data);
    setShowProductBreakdown(true);
  };

  // Build filter payload based on parent table's dropdown selection and clicked hyperlink value
  const buildFilterPayload = () => {
    const attributeName = props.linkColumnName;
    const clickedValue = props.selectedProgram?.[attributeName];
    if (!clickedValue) return null;

    return {
      filters: [
        ...(props.selectedFilters || []),
        {
          attribute_name: attributeName,
          values: [clickedValue],
          operator: "in",
          dimension: "product",
          filter_id: attributeName,
        },
      ],
      meta: {
        search: [],
        range: [],
        sort: [],
      },
      ...getDateRangePayload(props.startEndDate),
    };
  };

  const getTableData = async () => {
    if (!props.selectedProgram) return;

    const payload = buildFilterPayload();
    if (!payload) return;

    // Inject the selected alert article only into this ship-level API call
    // (not into buildFilterPayload, which is shared as parentFilterPayload with
    // the replenishment matrix table that must stay article-free).
    if (props.articleFilter) {
      payload.filters = [...payload.filters, props.articleFilter];
    }

    setTableData([]);
    setTableColumns([]);
    setLoading(true);
    try {
      const response = await dispatch(getShipLevelRecommendations(payload));
      if (response?.data?.status) {
        const responseData = response.data.data;
        const columns = responseData.columns || [];
        const data = responseData.data || [];

        // Identify the first link column for ship-level click
        const firstLinkColumn = columns.find((col) => col.type === "link");
        const linkColName = firstLinkColumn?.column_name;
        setLinkColumnName(linkColName);
        linkColumnNameRef.current = linkColName;

        const dynamicActionMap = {
          [linkColName]: onShipIdLinkClick,
          finalise: onFinaliseClick,
        };

        const formattedColumns = agGridColumnFormatter(columns, null, dynamicActionMap);

        // Show "Finalised" text instead of button for weeks already finalised
        applyWeekLevelFinalisedRenderer(formattedColumns);

        setTableColumns(formattedColumns);
        setTableData(data);
      }
    } catch (e) {
      console.error("Error fetching ship level recommendations:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (props.selectedProgram) {
      setShowProductBreakdown(false);
      setSelectedShip(null);
      getTableData();
    }
  }, [props.selectedProgram]);

  const loadTableInstance = (params) => {
    tableInstance.current = params;
  };

  const onFinaliseClick = async (data, cellProps) => {
    const attributeName = propsRef.current.linkColumnName;
    const attributeValue = propsRef.current.selectedProgram?.[attributeName] || "";
    const shipColName = linkColumnNameRef.current || linkColumnName;
    const shipCode = data?.[shipColName] || "";
    const week = getWeekFromActionCell(cellProps);

    const payload = {
      level: "ship",
      hierarchy_attribute_name: attributeName,
      hierarchy_attribute_value: attributeValue,
      ship_code: String(shipCode),
      week,
      status: "FINALISED",
      ...getDateRangePayload(propsRef.current.startEndDate),
      ...(propsRef.current.articleFilter?.values?.length > 0 && { article: propsRef.current.articleFilter.values }),
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
      console.error("Error finalising ship:", e);
      const errMsg = e?.response?.data?.message || "Error finalising. Please try again.";
      dispatch(addSnack({ message: errMsg, options: { variant: "error" } }));
    } finally {
      setFinaliseLoading(false);
    }
  };

  // Build title using the link column value from the clicked row
  const linkColName = props.linkColumnName;
  const selectedValue = props.selectedProgram?.[linkColName];
  const tableTitle = `Ship-level Recommendations${
    selectedValue ? ` - ${selectedValue}` : ""
  }`;

  return (
    <div className={globalClasses.marginTop}>
      <Loader loader={loading || finaliseLoading}>
        <AgGridComponent
          columns={tableColumns}
          rowdata={tableData}
          tableHeader={tableTitle}
          sizeColumnsToFitFlag={true}
          suppressFieldDotNotation
          pagination={false}
          loadTableInstance={loadTableInstance}
          onReviewClick={(cellProps) => onFinaliseClick(cellProps?.data, cellProps)}
          nestedTable={showProductBreakdown}
          nestedTableComponent={
            <ProductsListTable
              selectedShip={selectedShip}
              articleFilter={props.articleFilter}
              parentFilterPayload={buildFilterPayload()}
              shipLinkColumnName={linkColumnName}
              hierarchyAttributeName={props.linkColumnName}
              hierarchyAttributeValue={props.selectedProgram?.[props.linkColumnName] || ""}
              startEndDate={props.startEndDate}
              isViewOnly={props.isViewOnly}
              refreshParent={() => { getTableData(); props.refreshParent?.(); }}
            />
          }
        />
      </Loader>
    </div>
  );
};

export default ShipLevelRecommendationsTable;
