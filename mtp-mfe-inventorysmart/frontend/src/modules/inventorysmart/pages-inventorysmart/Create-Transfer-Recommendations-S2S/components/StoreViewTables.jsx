import { useEffect, useMemo, useState } from "react";
import { connect } from "react-redux";
import { useLocation } from "react-router";
import { makeStyles } from "@mui/styles";
import { Select, useTranslation } from "impact-ui-v3";
import AgGridComponent from "core/Utils/agGrid";
import { addSnack } from "core/actions/snackbarActions";
import Loader from "core/Utils/Loader/loader";
import {
  setStoreViewLoader,
  getStoreView,
} from "../../../services-inventorysmart/Create-Transfer-Recommendations-S2S/create-transfer-recommendations-service";
import StoreProductViewTable from "./StoreProductViewTable";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { isEmpty } from "lodash";
import {
  getRowStyleForGrandTotal,
  getTreeDataPath,
  transformToTreeData,
} from "modules/inventorysmart/utils-inventorysmart/clientSideRowGrouping";
import { handleErrorMessage } from "../../inventorysmart-utility";
import colours from "core/Styles/colours";
import { commonTableContainerStyle } from "./commonStyles";
import {
  greenRedColorNumberRenderer,
  progressBarCellRenderer,
  resolveStoreCodeFromRow,
  mergeFiltersWithIntersection,
} from "./transferUnitsUtils";
import { REDIRECT_FROM_VIEW_PAST_ALLOCATION } from "modules/inventorysmart/constants-inventorysmart/stringConstants";

const useStyles = makeStyles(() => ({
  linkContainer: {
    display: "flex",
    justifyContent: "space-between",
    width: "100%",
    height: "100%",
    "& .inv-btn-link": {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "4px",
      cursor: "pointer",
      color: colours.brightRoyalBlue,
      fontFamily: "Manrope",
      fontSize: "14px",
      fontWeight: 500,
      lineHeight: "20px",
      border: "none",
      background: "transparent",
      padding: 0,
      "& svg": {
        width: "26px",
        height: "26px",
      },
    },
  },
}));

const colorColumns = ["outbound_units", "inbound_units", "transfer_units"];

const VIEW_TYPE_OPTIONS = [
  { label: "Store", value: "store" },
  { label: "Grade", value: "grade" },
  { label: "Region", value: "region" },
];

const uniqueRowIdMap = {
  Grade: "psa_name",
  Region: "region",
  Store: "store_code",
};

const StoreViewTables = (props) => {
  const classes = useStyles();
  const commonStyles = commonTableContainerStyle();

  const { t } = useTranslation();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const redirectFromQuery = searchParams.get("rd");
  const allocationCodeFromQuery = searchParams.get("allocation_code");

  const [viewData, setViewData] = useState([]);
  const [viewColumns, setViewColumns] = useState([]);
  const [grandTotal, setGrandTotal] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const [selectedStore, setSelectedStore] = useState(null);
  const [showProductView, setShowProductView] = useState(false);
  const [isViewTypeOpen, setIsViewTypeOpen] = useState(false);
  const [selectedViewType, setSelectedViewType] = useState(
    VIEW_TYPE_OPTIONS[0]
  );

  const showTreeData = selectedViewType?.value !== "store";

  const addCellRenderer = (columns) => {
    return columns.map((column) => {
      if (column.children && column.children.length > 0) {
        const nested = addCellRenderer(column.children);
        column.children = nested;
        column.sub_headers = nested;
      }

      if (
        column.column_name === "psa_name" ||
        column.column_name === "region"
      ) {
        return {
          ...column,
          cellRendererSelector: (params) => {
            if (params.node.rowPinned === "top") {
              return {
                component: (params) => params.value || "",
              };
            }
            return {
              component: "agGroupCellRenderer",
              params: {
                suppressCount: true,
                innerRenderer: (params) => {
                  return params.value || "";
                },
              },
            };
          },
        };
      }

      if (colorColumns.includes(column.column_name)) {
        return greenRedColorNumberRenderer(column);
      }
      return progressBarCellRenderer(column);
    });
  };

  const fetchStoreViewData = async () => {
    try {
      setIsLoading(true);
      const payload = {
        ...(props.isOrderBatching
          ? {
              screen: "order_batching",
              ...(allocationCodeFromQuery
                ? { allocation_code: allocationCodeFromQuery }
                : {}),
            }
          : {
              allocation_code: props.allocationCode,
              ...(props.planStatus === "Finalized" &&
              REDIRECT_FROM_VIEW_PAST_ALLOCATION === redirectFromQuery
                ? { plan_status: props.planStatus }
                : {}),
            }),
        view: selectedViewType.label,
        filters: props.isOrderBatching
          ? props.s2sFilterDependency
          : mergeFiltersWithIntersection(
              props.createStoreTransferRecommFilterDependency,
              props.microFilterSelectedFilters
            ),
      };
      const response = await props.getStoreView(payload);

      if (response?.data?.status) {
        const selectedViewTypeLabel = uniqueRowIdMap[selectedViewType.label];
        const tableDataRes = response.data.data.data || [];
        const tableData = showTreeData
          ? transformToTreeData(tableDataRes, "child", selectedViewTypeLabel)
          : tableDataRes;
        const grandTotalData = response.data.data.grand_total || {};
        const columns = response.data.data.columns || [];
        const grandTotal = !isEmpty(grandTotalData)
          ? {
              ...grandTotalData,
              isGrandTotal: true,
              [selectedViewTypeLabel]: t("inventorysmart.grandTotal"),
            }
          : {};

        let updatedColumns = agGridColumnFormatter(columns, null, {});
        updatedColumns = addCellRenderer(updatedColumns);
        setViewColumns(updatedColumns);
        setViewData(tableData);
        setGrandTotal(grandTotal);
      } else {
        setViewData([]);
        setGrandTotal({});
        handleErrorMessage({ response: { data: response?.data } }, props);
      }
    } catch (err) {
      setViewData([]);
      setGrandTotal({});
      handleErrorMessage(err, props);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const filters = props.isOrderBatching
      ? props.s2sFilterDependency
      : props.createStoreTransferRecommFilterDependency;
    const shouldFetch = props.isOrderBatching
      ? !isEmpty(filters)
      : props.allocationCode && !isEmpty(filters);
    if (shouldFetch) {
      setShowProductView(false);
      setSelectedStore(null);
      fetchStoreViewData();
    }
  }, [
    props.allocationCode,
    selectedViewType,
    props.createStoreTransferRecommFilterDependency,
    props.s2sFilterDependency,
    props.microFilterSelectedFilters,
  ]);

  useEffect(() => {
    if (
      props.refreshKey > 0 &&
      (props.allocationCode || props.isOrderBatching)
    ) {
      fetchStoreViewData();
    }
  }, [props.refreshKey]);

  const handleViewTypeChange = (option) => {
    if (option) setSelectedViewType(option);
  };

  const tableColumns = useMemo(() => {
    const viewActionColumn = {
      field: "sto_reg_gra_view",
      headerName: "",
      is_frozen: true,
      pinned: "right",
      width: 63,
      maxWidth: 63,
      suppressMenu: true,
      resizable: false,
      cellRenderer: (params) => {
        // We have to show this view icon only for the store rows not for other rows that
        // why added this condition manually
        if (
          params.node.rowPinned !== "top" &&
          ((params.node.level === 0 && selectedViewType.value === "store") ||
            (params.node.level === 1 && selectedViewType.value === "grade") ||
            (params.node.level === 2 && selectedViewType.value === "region"))
        ) {
          return (
            <div className={classes.linkContainer}>
              <button
                className="inv-btn-link"
                onClick={() => {
                  const storeCode = resolveStoreCodeFromRow(params.data);
                  if (!storeCode) return;
                  setSelectedStore({ ...params.data, store_code: storeCode });
                  setShowProductView(true);
                }}
              >
                {t("inventorysmart.view")}
              </button>
            </div>
          );
        }
        return null;
      },
    };

    return [...viewColumns, viewActionColumn];
  }, [viewColumns, selectedViewType]);

  return (
    <Loader loader={isLoading} minHeight="383px">
      <div className={commonStyles.commonContainer}>
        <AgGridComponent
          key={`${selectedViewType?.value}-${viewData?.length}`}
          tableHeader={`${selectedViewType?.label || "Store"} View`}
          topRightOptions={
            <Select
              label={t("inventorysmart.viewBy")}
              labelOrientation="left"
              isClearable={true}
              isOpen={isViewTypeOpen}
              setIsOpen={setIsViewTypeOpen}
              currentOptions={VIEW_TYPE_OPTIONS}
              selectedOptions={selectedViewType}
              initialOptions={VIEW_TYPE_OPTIONS}
              handleChange={handleViewTypeChange}
              setSelectedOptions={() => {}}
              setCurrentOptions={() => {}}
              width="200px"
              minWidth="200px"
            />
          }
          columns={tableColumns}
          rowdata={viewData}
          pinnedTopRowData={!isEmpty(grandTotal) ? [grandTotal] : []}
          pagination={false}
          height="460px"
          adjustTableHeight={true}
          showCustomNoRowOverlay={false}
          uniqueRowId={showTreeData ? "index" : "store_code"}
          getRowStyle={getRowStyleForGrandTotal}
          treeData={showTreeData}
          getDataPath={showTreeData ? getTreeDataPath : undefined}
          groupDisplayType={showTreeData ? "custom" : undefined}
          nestedTable={showProductView}
          hideMarginBottom={true}
          nestedTableComponent={
            <StoreProductViewTable
              allocationCode={props.allocationCode}
              selectedStore={selectedStore}
              setShowProductView={setShowProductView}
              setSelectedStore={setSelectedStore}
              isOrderBatching={props.isOrderBatching}
            />
          }
        />
      </div>
    </Loader>
  );
};

const mapStateToProps = (store) => {
  return {
    storeViewLoader:
      store?.inventorysmartReducer?.createTransferRecommendationsService
        ?.storeViewLoader,
    createStoreTransferRecommFilterDependency:
      store?.inventorysmartReducer?.createStoreTransferService
        ?.createStoreTransferRecommFilterDependency,
    refreshKey:
      store?.inventorysmartReducer?.createTransferRecommendationsService
        ?.refreshKey,
    s2sFilterDependency:
      store?.inventorysmartReducer?.inventorySmartOrderBatchingS2SService
        ?.s2sFilterDependency,
    planStatus:
      store?.inventorysmartReducer?.createTransferRecommendationsService
        ?.planStatus,
    microFilterSelectedFilters:
      store?.inventorysmartReducer?.createTransferRecommendationsService
        ?.microFilterSelectedFilters,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setStoreViewLoader: (payload) => dispatch(setStoreViewLoader(payload)),
  getStoreView: (payload) => dispatch(getStoreView(payload)),
  addSnack: (snack) => dispatch(addSnack(snack)),
});

export default connect(mapStateToProps, mapDispatchToProps)(StoreViewTables);
