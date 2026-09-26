import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { connect } from "react-redux";
import { useNavigate } from "react-router-dom-v5-compat";
import { Button, Chips, useTranslation } from "impact-ui-v3";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import { addSnack } from "core/actions/snackbarActions";
import { cloneDeep } from "lodash";
import { applyEditChanges } from "modules/inventorysmart/services-inventorysmart/Finalize/new-flow-product-view-services";
import {
  getStoreProductView,
  getStoreSizeView,
  setFetchProductDetails,
  setPackConfigurations,
  refreshProductViews,
} from "modules/inventorysmart/services-inventorysmart/Finalize/new-flow-store-view-services";
import { ERROR_MESSAGE } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { CREATE_SCENARIO } from "modules/inventorysmart/constants-inventorysmart/routesConstants";
import {
  getIgnoreAllocationCode,
  getScenarioStyleIds,
} from "../../../Create-Allocation/helperFunctions";
import { applyAbsentKeyHyphen, applyBadgeColumns } from "../../utils/columnUtils";
import useRefreshSignal from "../../utils/useRefreshSignal";
import useScrollIntoViewOnOpen from "../../utils/useScrollIntoViewOnOpen";
import { finalizeAllocationContext } from "../../index";
import {
  ALLOC_QTY_GROUP,
  CAPPED_WARNING_MSG,
  EDIT_VIEW_STORE_PRODUCT,
  EDIT_VIEW_STORE_PRODUCT_SIZE,
  REMAINING_DC_ATA_GROUP,
} from "../constants/allocationEditConstants";
import {
  applyAllocNullHyphen,
  buildApplyEnvelope,
  capValueAtAvailable,
  makeEditGate,
  matchDcOption,
  notifyApplyResult,
} from "../utils/allocationEditUtils";
import {
  attachOtherColumnRenderers,
  attachStoreAllocRenderers,
} from "../utils/allocRenderers";
import {
  collectDcGridEditableLeaves,
  prepareOtherColumns,
} from "../utils/storeEditUtils";
import {
  buildSetAllByProductSizeUpdates,
  buildSetAllByProductUpdates,
  buildSetAllProductShipDateUpdates,
  buildStoreProductAllocationUpdates,
  buildStoreProductOtherUpdates,
  buildStoreProductSizeAllocationUpdates,
} from "../utils/storeProductEditUtils";
import useSnack from "../utils/useSnack";
import useEditTracker from "../utils/useEditTracker";
import { EDIT_BY_PRODUCT, EDIT_BY_SIZE } from "./constants";
import { useStoreViewStyles } from "./storeViewStyles";
import SetAllStoreProductView from "./SetAllStoreProductView";
import StoreProductSizeView from "./StoreProductSizeView";

const productEditOn = makeEditGate(EDIT_BY_PRODUCT);

/** Master-detail renderer for the store→product→size nested grid. */
const StoreProductSizeDetailInner = ({ data, propsRef }) => {
  const panelProps = propsRef.current || {};
  return (
    <StoreProductSizeView
      selectedStore={panelProps.selectedStore}
      selectedArticle={data?.article}
      allocationCode={panelProps.allocationCode}
      originalAllocationCode={panelProps.originalAllocationCode}
      planStatus={panelProps.planStatus}
      planType={panelProps.planType}
      isV3={panelProps.isV3}
      fetchFn={panelProps.fetchFn}
      addSnack={panelProps.addSnack}
      editStateRef={panelProps.editStateRef}
      onSizeEditsChange={panelProps.onSizeEditsChange}
    />
  );
};

const StoreProductView = (props) => {
  const {
    selectedStore,
    onClose,
    isEditMode = false,
    productEditActive = false,
    onChildEditActiveChange,
    onLoadingChange,
  } = props;
  const { t } = useTranslation();
  const navigate = useNavigate();
  const classes = useStoreViewStyles();
  const panelRef = useScrollIntoViewOnOpen(selectedStore);

  const finalizeCtx = useContext(finalizeAllocationContext);
  const { editSchema, sessionId } = finalizeCtx || {};
  const editSchemaForView = editSchema?.store_product;

  const [columns, setColumns] = useState([]);
  const [rows, setRows] = useState([]);
  const [loader, setLoader] = useState(true);
  const [remount, setRemount] = useState(false);
  const [editByDimension, setEditByDimension] = useState(EDIT_BY_PRODUCT);
  const [selectedRows, setSelectedRows] = useState([]);
  const [showSetAllModal, setShowSetAllModal] = useState(false);
  const [setAllLoading, setSetAllLoading] = useState(false);
  const [setAllSizeView, setSetAllSizeView] = useState({
    loading: false,
    columns: [],
    rows: [],
    dcDict: [],
    sizeArticleMap: {},
  });
  const tableInstance = useRef(null);
  const previousFetchContextRef = useRef(null);
  const setAllSizeRequestRef = useRef(0);
  const modeChangeFetchRef = useRef(false);

  const editStateRef = useRef({
    isEditMode,
    editByDimension,
    productEditActive,
  });
  editStateRef.current = { isEditMode, editByDimension, productEditActive };

  const originalRowsRef = useRef([]);
  const originalColumnsRef = useRef([]);
  const dcOptionsRef = useRef([]);
  const [editableAllocLeaves, setEditableAllocLeaves] = useState([]);
  const [otherEditableColumns, setOtherEditableColumns] = useState([]);

  const [productGrainEditActive, setProductGrainEditActive] = useState(false);
  const {
    updatedRowEdits,
    updatedRowEditsRef,
    updateEditedRowState,
    resetEdits: resetProductEdits,
  } = useEditTracker(
    "article",
    editableAllocLeaves,
    originalRowsRef,
    otherEditableColumns
  );

  const sizeEditsMapRef = useRef({});
  const [sizeEditActive, setSizeEditActive] = useState(false);
  const [dirtySizeSplitCount, setDirtySizeSplitCount] = useState(0);
  const [sizeEditResetKey, setSizeEditResetKey] = useState(0);

  const onSizeEditsChange = useCallback((article, payload) => {
    const map = sizeEditsMapRef.current;
    if (!payload || payload.edits.length === 0) {
      delete map[article];
    } else {
      map[article] = payload;
    }
    const count = Object.keys(map).length;
    setSizeEditActive(count > 0);
    setDirtySizeSplitCount(count);
  }, []);

  const detailPropsRef = useRef({});
  detailPropsRef.current = {
    selectedStore,
    allocationCode: props.allocationCode,
    originalAllocationCode: props.originalAllocationCode,
    planStatus: props.planStatus,
    planType: props.planType,
    isV3: props.isV3,
    fetchFn: props.getStoreSizeView,
    addSnack: props.addSnack,
    editStateRef,
    onSizeEditsChange,
  };
  const sizeDetailRendererRef = useRef((innerProps) => (
    <StoreProductSizeDetailInner
      data={innerProps.data}
      propsRef={detailPropsRef}
    />
  ));

  const displaySnackMessages = useSnack(props.addSnack);

  /** Track ag-Grid row selection changes for Set All. */
  const onSelectionChanged = useCallback((event) => {
    const selected = event?.api?.getSelectedRows() || [];
    setSelectedRows(selected);
  }, []);

  /** Open Set All modal and prefetch store→product→size aggregated data for selected articles. */
  const openSetAll = useCallback(() => {
    setShowSetAllModal(true);
    const requestId = ++setAllSizeRequestRef.current;
    const articleCodes = selectedRows
      .map((row) => row?.article)
      .filter((code) => code !== undefined && code !== null)
      .map(String);

    setSetAllSizeView({
      loading: true,
      columns: [],
      rows: [],
      dcDict: [],
      sizeArticleMap: {},
    });

    const payload = {
      allocation_code: props.allocationCode,
      article: null,
      ignore_allocation_code: getIgnoreAllocationCode(
        props.originalAllocationCode
      ),
      plan_status: props.planStatus,
      plan_type: props.planType || "",
      store_code: selectedStore,
      set_all_articles: articleCodes,
    };

    props
      .getStoreSizeView(payload, props.isV3?.includes("productStoreDetails"))
      .then((res) => {
        if (setAllSizeRequestRef.current !== requestId) return;
        if (res?.data?.status) {
          const data = res.data.data || {};
          setSetAllSizeView({
            loading: false,
            columns: data.table_config || [],
            rows: data.table_data || [],
            dcDict: data.dc_dict || [],
            sizeArticleMap: data.size_article_map || {},
          });
          return;
        }
        setSetAllSizeView({
          loading: false,
          columns: [],
          rows: [],
          dcDict: [],
          sizeArticleMap: {},
        });
      })
      .catch((e) => {
        if (setAllSizeRequestRef.current !== requestId) return;
        const errObj = e?.response?.data;
        displaySnackMessages(
          errObj?.show_message ? errObj.message : ERROR_MESSAGE,
          "error"
        );
        setSetAllSizeView({
          loading: false,
          columns: [],
          rows: [],
          dcDict: [],
          sizeArticleMap: {},
        });
      });
  }, [
    selectedRows,
    selectedStore,
    props.allocationCode,
    props.originalAllocationCode,
    props.planStatus,
    props.planType,
    props.isV3,
    props.getStoreSizeView,
    displaySnackMessages,
  ]);

  /** Fetch store→product grid: articles for the selected store with nested product→size expansion. */
  const fetchStoreProductData = async ({ skipRemount = false } = {}) => {
    if (!selectedStore) return;

    sizeEditsMapRef.current = {};
    setSizeEditActive(false);
    setDirtySizeSplitCount(0);
    setProductGrainEditActive(false);
    resetProductEdits();
    setSelectedRows([]);

    try {
      setLoader(true);
      // Overlay first: remounting unmounts the grid, and a blank slot with
      // loader still false collapses the nested panel (product-store avoids
      // that because ProductExpansionPanel is already covering it).
      if (!skipRemount) {
        setRemount(false);
      }
      onLoadingChange?.(true);
      const payload = {
        allocation_code: props.allocationCode,
        article: props.articles || [],
        ignore_allocation_code: getIgnoreAllocationCode(
          props.originalAllocationCode,
          props.allocationCode
        ),
        plan_status: props.planStatus,
        plan_type: props.planType,
        store_code: selectedStore,
      };
      const res = await props.getStoreProductView(
        payload,
        props.isV3?.includes("productDetails")
      );
      if (res?.data?.status) {
        const resData = res.data.data;
        dcOptionsRef.current = resData.dc_dict || [];

        const rawConfig = resData.table_config || [];
        const processedOtherCols = prepareOtherColumns(
          rawConfig,
          editSchemaForView?.other_columns
        );
        setOtherEditableColumns(processedOtherCols);

        const formattedCols = agGridColumnFormatter(rawConfig);
        applyAbsentKeyHyphen(formattedCols);
        applyBadgeColumns(formattedCols);

        formattedCols.forEach((col) => {
          if (col.field === "article" || col.column_name === "article") {
            col.cellRenderer = "agGroupCellRenderer";
            col.is_editable = false;
          }
        });

        const { editableLeaves } = collectDcGridEditableLeaves(
          formattedCols,
          dcOptionsRef.current,
          editSchemaForView
        );
        editableLeaves.forEach((leaf) => {
          if (leaf.dc_code) return;
          const dcHeaderLabel = leaf.columnLabel.split(" - ")[0];
          const dcOption = matchDcOption(dcOptionsRef.current, {
            label: dcHeaderLabel,
          });
          leaf.dc_code = dcOption?.value || dcOption?.dc_code;
        });
        setEditableAllocLeaves(editableLeaves);
        applyAllocNullHyphen(formattedCols, ALLOC_QTY_GROUP);

        if (editableLeaves.length > 0) {
          attachStoreAllocRenderers(
            formattedCols,
            editableLeaves.map((c) => c.column_name),
            editStateRef,
            productEditOn
          );
        }
        attachOtherColumnRenderers(
          formattedCols,
          processedOtherCols,
          editStateRef,
          productEditOn
        );

        originalRowsRef.current = cloneDeep(resData.table_data || []);
        originalColumnsRef.current = formattedCols;
        setColumns(formattedCols);
        setRows(resData.table_data || []);
      }
    } catch (e) {
      const errObj = e?.response?.data;
      displaySnackMessages(
        errObj?.show_message ? errObj.message : ERROR_MESSAGE,
        "error"
      );
    } finally {
      setLoader(false);
      if (!skipRemount) {
        setRemount(true);
      }
      onLoadingChange?.(false);
    }
  };

  const dataMode = isEditMode ? (editSchema ? "edit" : "view") : "view";

  // Initial fetch on mount when allocationCode + planType are ready and fetchProductDetails is null.
  useEffect(() => {
    if (
      selectedStore &&
      props.allocationCode &&
      props.planType &&
      props.fetchProductDetails === null
    ) {
      // Skip if the dataMode effect already triggered a fetch for this cycle
      // (refreshAllTables fires fetchProductDetails: false → null after a mode
      // switch, but the dataMode effect already handled it with skipRemount).
      if (modeChangeFetchRef.current) {
        modeChangeFetchRef.current = false;
        return;
      }
      fetchStoreProductData();
    }
    // Narrow deps: fetchStoreProductData is stable, allocationCode is guarded in condition
  }, [selectedStore, props.planType, props.fetchProductDetails]);

  useEffect(() => {
    if (props.fetchProductDetails) {
      fetchStoreProductData()
        .then(() => {
          props.setFetchProductDetails(false);
        })
        .catch(() => {
          props.setFetchProductDetails(false);
        });
    }
    // Narrow deps: setFetchProductDetails is a stable dispatch function
  }, [props.fetchProductDetails]);

  useEffect(() => {
    if (!selectedStore || !props.allocationCode) return;
    const previous = previousFetchContextRef.current;
    const preserveOpenDetails =
      previous?.store === selectedStore && previous?.mode !== dataMode;
    previousFetchContextRef.current = {
      store: selectedStore,
      mode: dataMode,
    };
    if (previous?.store === selectedStore && previous?.mode !== dataMode) {
      modeChangeFetchRef.current = true;
      fetchStoreProductData({ skipRemount: preserveOpenDetails });
    }
    // Narrow deps: allocationCode is guarded in condition
  }, [dataMode, selectedStore]);

  useRefreshSignal(props.productViewRefreshToken, () => {
    if (selectedStore && props.allocationCode) {
      fetchStoreProductData({ skipRemount: false });
    }
  });

  useEffect(() => {
    setEditByDimension(EDIT_BY_PRODUCT);
  }, [selectedStore]);

  useEffect(() => {
    tableInstance.current?.api?.refreshCells({ force: true });
  }, [isEditMode, editByDimension, productEditActive]);

  /** Cancel product-level edits: revert rows and exit edit mode. */
  const handleCancelProductEdit = () => {
    setProductGrainEditActive(false);
    resetProductEdits();
    setRows(cloneDeep(originalRowsRef.current));
    tableInstance.current?.api?.refreshCells({ force: true });
  };

  // Auto-cancel product edits when user switches away from Edit by Product mode.
  useEffect(() => {
    if (
      (!isEditMode || editByDimension !== EDIT_BY_PRODUCT) &&
      productGrainEditActive
    ) {
      handleCancelProductEdit();
    }
    // Narrow deps: handleCancelProductEdit is stable, productGrainEditActive is guarded
  }, [isEditMode, editByDimension]);

  useEffect(() => {
    const active = productGrainEditActive || sizeEditActive;
    onChildEditActiveChange?.(active);
    return () => onChildEditActiveChange?.(false);
  }, [productGrainEditActive, sizeEditActive, onChildEditActiveChange]);

  /** Handle date column changes: track dirty row, collapse open details. */
  const onCellValueChanged = (params) => {
    const colId = params?.column?.colId;
    if (!colId) return;

    const isOtherColumn = otherEditableColumns.includes(colId);
    if (!isOtherColumn) return;

    if (!productGrainEditActive) {
      setProductGrainEditActive(true);
    }

    tableInstance.current?.api?.forEachNode((node) => {
      if (node.expanded) node.setExpanded(false);
    });

    updateEditedRowState(params.data);
  };

  /** Handle blur on alloc/date cells: cap value, track dirty row, collapse details. */
  const onBlur = (e, data, column, isChanged, value) => {
    const colId = column.colId;
    const isAllocationColumn = colId.startsWith(ALLOC_QTY_GROUP);
    const isOtherColumn = otherEditableColumns.includes(colId);

    if (!isChanged) return;

    if (!productGrainEditActive) {
      setProductGrainEditActive(true);
    }

    tableInstance.current?.api?.forEachNode((node) => {
      if (node.expanded) node.setExpanded(false);
    });

    if (isAllocationColumn) {
      // data[colId] already holds the freshly-typed value (committed by the
      // wrapper's handleInputChange before blur). The 5th `value` arg is the
      // previous render value, so it lags one edit behind — do not use it.
      const numValue = Number(data[colId] ?? 0);
      const originalRow = originalRowsRef.current.find(
        (r) => r.article === data.article
      );
      const { capped, finalValue } = capValueAtAvailable({
        value: numValue,
        originalRow,
        columnId: colId,
        allocGroup: ALLOC_QTY_GROUP,
        availableGroup: REMAINING_DC_ATA_GROUP,
      });
      if (capped) {
        displaySnackMessages(CAPPED_WARNING_MSG, "warning");
      }
      data[colId] = finalValue;
      updateEditedRowState(data);

      const rowNode = tableInstance.current?.api?.getRowNode(data.article);
      if (rowNode) {
        rowNode.setData(data);
        tableInstance.current.api.redrawRows({ rowNodes: [rowNode] });
      }
    } else if (isOtherColumn) {
      updateEditedRowState(data);

      const rowNode = tableInstance.current?.api?.getRowNode(data.article);
      if (rowNode) {
        rowNode.setData(data);
        tableInstance.current.api.redrawRows({ rowNodes: [rowNode] });
      }
    }
  };

  /** Apply store_product grid edits: build payload, call API, refresh all views on success. */
  const handleApplyProductEdit = async () => {
    const allocationUpdates = buildStoreProductAllocationUpdates(
      updatedRowEditsRef.current,
      originalRowsRef.current,
      editableAllocLeaves
    );
    const otherUpdates = buildStoreProductOtherUpdates(
      updatedRowEditsRef.current,
      originalRowsRef.current,
      otherEditableColumns
    );

    if (allocationUpdates.length === 0 && otherUpdates.length === 0) {
      displaySnackMessages("No changes to apply", "error");
      return;
    }

    try {
      setLoader(true);
      onLoadingChange?.(true);
      const payload = buildApplyEnvelope({
        allocationCode: props.allocationCode,
        originalAllocationCode: props.originalAllocationCode,
        sessionId,
        view: EDIT_VIEW_STORE_PRODUCT,
        article: null,
        store: selectedStore,
        size: null,
        allocationUpdates,
        otherUpdates,
      });

      const res = await props.applyEditChanges(payload);
      if (res?.data?.status) {
        notifyApplyResult(
          res,
          displaySnackMessages,
          "Changes applied successfully"
        );
        setProductGrainEditActive(false);
        resetProductEdits();
        setSelectedRows([]);
        tableInstance.current?.api?.deselectAll();
        props.refreshProductViews();
      } else {
        displaySnackMessages(res?.data?.message || ERROR_MESSAGE, "error");
        setLoader(false);
        onLoadingChange?.(false);
      }
    } catch (e) {
      const errObj = e?.response?.data;
      displaySnackMessages(
        errObj?.show_message ? errObj.message : ERROR_MESSAGE,
        "error"
      );
      setLoader(false);
      onLoadingChange?.(false);
    }
  };

  /** Cancel nested size edits from the in-memory fetch snapshot. No refetch. */
  const handleCancelSizeEdit = () => {
    sizeEditsMapRef.current = {};
    setSizeEditActive(false);
    setDirtySizeSplitCount(0);
    setSizeEditResetKey((key) => key + 1);
  };

  /** Apply nested size edits: aggregate from all product→size panels, submit, refresh on success. */
  const handleApplySizeEdit = async () => {
    // Single included article → hoist article onto the envelope.
    // Several included articles → envelope article stays null; each
    // allocation_updates entry carries article (+ size for eaches).
    const { updates, article } = buildStoreProductSizeAllocationUpdates(
      sizeEditsMapRef.current
    );
    if (updates.length === 0) {
      displaySnackMessages("No changes to apply", "error");
      return;
    }

    try {
      setLoader(true);
      onLoadingChange?.(true);
      const payload = buildApplyEnvelope({
        allocationCode: props.allocationCode,
        originalAllocationCode: props.originalAllocationCode,
        sessionId,
        view: EDIT_VIEW_STORE_PRODUCT_SIZE,
        article,
        store: selectedStore,
        size: null,
        allocationUpdates: updates,
      });

      const res = await props.applyEditChanges(payload);
      if (res?.data?.status) {
        notifyApplyResult(
          res,
          displaySnackMessages,
          "Changes applied successfully"
        );
        sizeEditsMapRef.current = {};
        setSizeEditActive(false);
        setDirtySizeSplitCount(0);
        props.refreshProductViews();
      } else {
        displaySnackMessages(res?.data?.message || ERROR_MESSAGE, "error");
        setLoader(false);
        onLoadingChange?.(false);
      }
    } catch (e) {
      const errObj = e?.response?.data;
      displaySnackMessages(
        errObj?.show_message ? errObj.message : ERROR_MESSAGE,
        "error"
      );
      setLoader(false);
      onLoadingChange?.(false);
    }
  };

  /** Navigate to Create Scenario with selected articles as initial state. */
  const handleCreateScenario = () => {
    const selected = tableInstance.current?.api?.getSelectedRows() || [];
    if (selected.length === 0) {
      displaySnackMessages("Please select at least one row", "warning");
      return;
    }
    const articleIds = getScenarioStyleIds(
      selected,
      props.finalizeAllocationConfig
    );
    const scenarioAllocationCode =
      props.originalAllocationCode || props.allocationCode;
    navigate(
      `${CREATE_SCENARIO}?step=0&allocation_code=${scenarioAllocationCode}`,
      {
        state: {
          allocationCode: scenarioAllocationCode,
          articleIds,
        },
      }
    );
  };

  /** Apply Set All: expand uniform values across selected articles and submit. */
  const handleSetAllApply = async ({
    activeTab,
    fieldValues,
    mapping: setAllMapping,
    sizeFieldValues,
    sizeMapping: setSizeMapping,
    shipDate,
  }) => {
    const isSize = activeTab === EDIT_BY_SIZE;

    let allocationUpdates = [];

    if (!isSize) {
      // EDIT_BY_PRODUCT: one entry per selected article, only fields present
      // on that row's DC columns. Dates go in other_updates.
      allocationUpdates = buildSetAllByProductUpdates(
        selectedRows,
        setAllMapping,
        fieldValues
      );
    } else {
      // EDIT_BY_SIZE: expand each filled field across articles from the mapping.
      // Pack type ID → row_filters: { article } (no size — Pack Count aggregate).
      // Eaches → row_filters: { size, article } (per store-product-size split).
      if (!setSizeMapping?.dcGroups) return;
      allocationUpdates = buildSetAllByProductSizeUpdates(
        setSizeMapping,
        sizeFieldValues
      );
    }

    const otherUpdates = isSize
      ? []
      : buildSetAllProductShipDateUpdates(
          selectedRows,
          setAllMapping?.shipDateColumn?.column_name,
          shipDate
        );

    if (allocationUpdates.length === 0 && otherUpdates.length === 0) {
      displaySnackMessages("No changes to apply", "error");
      return;
    }

    try {
      setSetAllLoading(true);
      const payload = buildApplyEnvelope({
        allocationCode: props.allocationCode,
        originalAllocationCode: props.originalAllocationCode,
        sessionId,
        view: isSize ? EDIT_VIEW_STORE_PRODUCT_SIZE : EDIT_VIEW_STORE_PRODUCT,
        article: null,
        store: selectedStore,
        size: null,
        allocationUpdates,
        otherUpdates,
      });

      const res = await props.applyEditChanges(payload);
      if (res?.data?.status) {
        notifyApplyResult(
          res,
          displaySnackMessages,
          "Changes applied successfully"
        );
        setShowSetAllModal(false);
        setSetAllLoading(false);
        setSelectedRows([]);
        tableInstance.current?.api?.deselectAll();
        props.refreshProductViews();
      } else {
        displaySnackMessages(res?.data?.message || ERROR_MESSAGE, "error");
        setSetAllLoading(false);
      }
    } catch (e) {
      const errObj = e?.response?.data;
      displaySnackMessages(
        errObj?.show_message ? errObj.message : ERROR_MESSAGE,
        "error"
      );
      setSetAllLoading(false);
    }
  };

  /** Build toolbar buttons based on current edit/selection state. */
  const topRightOptions = useMemo(() => {
    const options = [];
    const anyEditActive = productGrainEditActive || sizeEditActive;
    const showCreateScenario =
      props.finalizeAllocationConfig?.createSceanrio &&
      selectedRows.length > 0 &&
      !anyEditActive;

    if (!isEditMode) {
      if (showCreateScenario) {
        options.push(
          <Button
            key="create-scenario"
            variant="primary"
            size="large"
            type="default"
            disabled={props.planStatus === "Finalized"}
            onClick={handleCreateScenario}
          >
            Create Scenario
          </Button>
        );
      }
      return options;
    }

    const showEditChips = !anyEditActive && selectedRows.length === 0;
    if (showEditChips) {
      options.push(
        <div key="edit-by-row" className={classes.topRightRow}>
          <span className={classes.editByLabel}>Edit by</span>
          <div className={classes.chipsRow}>
            <Chips
              type="single"
              label="Product"
              isActive={editByDimension === EDIT_BY_PRODUCT}
              disabled={productEditActive}
              onClick={() => {
                if (!productEditActive) setEditByDimension(EDIT_BY_PRODUCT);
              }}
            />
            <Chips
              type="single"
              label="Size"
              isActive={editByDimension === EDIT_BY_SIZE}
              disabled={productEditActive}
              onClick={() => {
                if (!productEditActive) setEditByDimension(EDIT_BY_SIZE);
              }}
            />
          </div>
        </div>
      );
    }

    if (showCreateScenario) {
      options.push(
        <Button
          key="create-scenario"
          variant="secondary"
          size="large"
          type="default"
          disabled={props.planStatus === "Finalized"}
          onClick={handleCreateScenario}
        >
          Create Scenario
        </Button>
      );
    }

    if (selectedRows.length > 0 && !anyEditActive && !productEditActive) {
      options.push(
        <Button
          key="set-all"
          variant="primary"
          size="large"
          type="default"
          onClick={openSetAll}
        >
          {t("inventorysmart.setAll")}
        </Button>
      );
    }

    // Product edit: Cancel always shown, Apply only when dirty
    if (productGrainEditActive) {
      options.push(
        <Button
          key="cancel-product-edit"
          size="large"
          type="default"
          variant="secondary"
          onClick={handleCancelProductEdit}
        >
          Cancel
        </Button>
      );
      if (updatedRowEdits.length > 0) {
        options.push(
          <Button
            key="apply-product-edit"
            variant="primary"
            size="large"
            type="default"
            onClick={handleApplyProductEdit}
          >
            Apply
          </Button>
        );
      }
    }

    if (sizeEditActive) {
      options.push(
        <Button
          key="cancel-size-edit"
          size="large"
          type="default"
          variant="secondary"
          onClick={handleCancelSizeEdit}
        >
          Cancel
        </Button>,
        <Button
          key="apply-size-edit"
          variant="primary"
          size="large"
          type="default"
          onClick={handleApplySizeEdit}
        >
          Apply
        </Button>
      );
    }

    return options;
  }, [
    classes,
    isEditMode,
    productEditActive,
    productGrainEditActive,
    sizeEditActive,
    editByDimension,
    updatedRowEdits.length,
    selectedRows.length,
    props.finalizeAllocationConfig,
    props.planStatus,
    openSetAll,
    editableAllocLeaves,
    t,
  ]);

  const storeFinalizeCtx = useMemo(
    () => ({
      ...(finalizeCtx || {}),
      editByDimension,
      productEditActive,
      dirtySizeSplitCount,
      sizeEditResetKey,
    }),
    [
      finalizeCtx,
      editByDimension,
      productEditActive,
      dirtySizeSplitCount,
      sizeEditResetKey,
    ]
  );

  const tableHeaderLabel = useMemo(
    () => (
      <div className={classes.headerBar}>
        <span className={classes.headerTitle}>
          {t("inventorysmart.finalize.recommendation.productBreakdown")}
        </span>
        <div className={classes.verticalDivider} />
        <div className={classes.headerStoreWrap}>
          <span className={classes.headerStoreLabel}>
            {t("inventorysmart.finalize.recommendation.storeNumber")}:{" "}
            <span>{selectedStore || "N/A"}</span>
          </span>
        </div>
      </div>
    ),
    [classes, selectedStore, t]
  );

  if (!selectedStore) return null;

  return (
    <finalizeAllocationContext.Provider value={storeFinalizeCtx}>
      <div ref={panelRef} className={classes.nestedPanel}>
        <Loader loader={loader} minHeight="400px">
          {remount ? (
            <div className={classes.nestedSlot}>
              <AgGridComponent
                columns={columns}
                rowdata={rows}
                uniqueRowId="article"
                tableHeader={tableHeaderLabel}
                sizeColumnsToFitFlag
                suppressFieldDotNotation
                pagination={false}
                loadTableInstance={(params) => {
                  tableInstance.current = params;
                }}
                masterDetail
                detailRowAutoHeight
                keepDetailRows
                detailCellRenderer={sizeDetailRendererRef.current}
                closeButton
                handleCloseButtonClick={onClose}
                rowSelection="multiple"
                selectAllHeaderComponent
                onSelectionChanged={onSelectionChanged}
                onBlur={onBlur}
                onCellValueChanged={onCellValueChanged}
                topRightOptions={topRightOptions}
                downloadAsExcel={rows.length > 0}
                showDownloadTooltip
              />
            </div>
          ) : (
            <div className={classes.nestedSlot} style={{ height: 400 }} />
          )}
        </Loader>
      </div>
      <SetAllStoreProductView
        open={showSetAllModal}
        onClose={() => {
          if (setAllLoading) return;
          setAllSizeRequestRef.current += 1;
          setShowSetAllModal(false);
        }}
        onApply={handleSetAllApply}
        displaySnack={displaySnackMessages}
        loading={setAllLoading}
        columns={originalColumnsRef.current}
        dcDict={dcOptionsRef.current}
        originalRows={originalRowsRef.current}
        selectedRows={selectedRows}
        editSchema={editSchemaForView}
        editByDimension={editByDimension}
        sizeColumns={setAllSizeView.columns}
        sizeRows={setAllSizeView.rows}
        sizeDcDict={setAllSizeView.dcDict}
        sizeArticleMap={setAllSizeView.sizeArticleMap}
        sizeLoading={setAllSizeView.loading}
        allocationCode={props.allocationCode}
        originalAllocationCode={props.originalAllocationCode}
        planStatus={props.planStatus}
        planType={props.planType}
        selectedArticles={selectedRows
          .map((row) => row?.article)
          .filter((code) => code != null && code !== "")
          .map(String)}
      />
    </finalizeAllocationContext.Provider>
  );
};

const mapStateToProps = (store) => ({
  allocationCode:
    store.inventorysmartReducer.inventorySmartNewFlowStoreViewService
      .allocationCode,
  planStatus:
    store.inventorysmartReducer.inventorySmartNewFlowStoreViewService
      .planStatus,
  planType:
    store.inventorysmartReducer.inventorySmartNewFlowStoreViewService.planType,
  originalAllocationCode:
    store.inventorysmartReducer.inventorySmartNewFlowStoreViewService
      .originalAllocationCode,
  articles:
    store.inventorysmartReducer.inventorySmartNewFlowStoreViewService.articles,
  isV3:
    store?.inventorysmartReducer?.inventorySmartCommonService
      ?.inventorysmartScreenConfig?.isV3,
  fetchProductDetails:
    store.inventorysmartReducer.inventorySmartNewFlowStoreViewService
      .fetchProductDetails,
  productViewRefreshToken:
    store.inventorysmartReducer.inventorySmartNewFlowStoreViewService
      .productViewRefreshToken,
  finalizeAllocationConfig:
    store?.inventorysmartReducer?.inventorySmartCommonService
      ?.inventorysmartFinalizeAllocationConfig,
});

const mapDispatchToProps = (dispatch) => ({
  getStoreProductView: (payload, isV3) =>
    dispatch(getStoreProductView(payload, isV3)),
  getStoreSizeView: (payload, isV3) =>
    dispatch(getStoreSizeView(payload, isV3)),
  setPackConfigurations: (payload) => dispatch(setPackConfigurations(payload)),
  setFetchProductDetails: (payload) =>
    dispatch(setFetchProductDetails(payload)),
  applyEditChanges: (payload) => dispatch(applyEditChanges(payload)),
  refreshProductViews: () => dispatch(refreshProductViews()),
  addSnack: (snack) => dispatch(addSnack(snack)),
});

export default connect(mapStateToProps, mapDispatchToProps)(StoreProductView);
