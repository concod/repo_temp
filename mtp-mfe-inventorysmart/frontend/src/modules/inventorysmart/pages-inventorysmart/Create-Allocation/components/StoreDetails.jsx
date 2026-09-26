import AgGridComponent from "core/Utils/agGrid";
import { useStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";
import globalStyles from "core/Styles/globalStyles";
import { addSnack } from "core/actions/snackbarActions";
import { Prompt,Tooltip } from "impact-ui-v3";
import { cloneDeep, fill, isEmpty, isUndefined, omit } from "lodash";
import { common } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { CREATE_ALLOCATION } from "modules/inventorysmart/constants-inventorysmart/routesConstants";
import {
  DRAFT_FLOW,
  ERROR_MESSAGE,
  INVENTORY_SUBMODULES_NAMES,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import {
  createAllocationApi,
  deleteDrafts,
  saveDraft,
  savePlanForDraft,
  setIsFiltersValid,
  setStoreDcTableLoader,
  setDraftsResult,
  setInventorysmartCreateAllocationFilterDependency,
  setArticleAgGridParams,
  setCreateAllocationArticles,
  setSelectedFilters,
  setIsValidDraft,
  setBackButtonClicked,
  setShowInvalidDraftModal,
  setPOCode,
  setFilteredSelection,
  setPopUpLinkFromDashbaord,
} from "modules/inventorysmart/services-inventorysmart/Create-Allocation/create-allocation-services";
import { getDrafts } from "modules/inventorysmart/services-inventorysmart/Finalize/store-view-services";
import { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { useNavigate } from "react-router-dom-v5-compat";
import { isActionAllowedOnSubModule } from "../../inventorysmart-utility";
import {
  checkValidationForArticles,
  getEffectiveChannelKey,
  getValuesFromObject,
  onlySpaces,
} from "../helperFunctions";
import StoreSetAllModal from "./StoreSetAllModal";
import Validation from "./Validation";
import { Button } from "impact-ui-v3";
import { Grid } from "@mui/material";
import InfoIcon from "assets/Info.svg";
import RefreshIcon from "assets/IS_icons/IS_Refresh.svg";

const REVIEWED_ARTICLES_MAPPING_TO_PREP_REQUEST = {
  APS_ROS: "APS_ROS",
  min_stock: "Min_Stock",
  max_stock: "Max_Stock",
  wos_rounded: "WOS",
  on_hand: "on_hand",
  in_transit: "in_transit",
  on_order: "on_order",
  transit_time: "Transit_Time",
  original_forecast: "original_forecast",
  lt_forecast: "lt_forecast",
  isWosEdited: "is_Wos_Edited_List",
};

const EDITABLE_STORE_FIELDS = ["min_stock", "max_stock", "wos_rounded"];

const isEditableStoreField = (colId) =>
  EDITABLE_STORE_FIELDS.includes(colId) ||
  colId?.includes("_min_stock") ||
  colId?.includes("_max_stock");

// Grid column is wos_rounded; refresh API expects edits.wos
const getRefreshEditsFieldKey = (colId) =>
  colId === "wos_rounded" ? "wos" : colId;

const normalizeRefreshEditValue = (colId, value) => {
  if (colId !== "wos_rounded") return value;

  const raw = String(value).replace(/,/g, "").trim();
  if (raw === "") return value;

  const parsed = Number(parseFloat(raw));
  if (Number.isNaN(parsed)) return value;

  return Number.isInteger(parsed) ? parsed : parseInt(parsed, 10);
};

const trackStoreEdit = (edits, storeCode, colId, value) => {
  const next = cloneDeep(edits);

  if (EDITABLE_STORE_FIELDS.includes(colId)) {
    const fieldKey = getRefreshEditsFieldKey(colId);
    if (!next[fieldKey]) next[fieldKey] = {};
    next[fieldKey][storeCode] = normalizeRefreshEditValue(colId, value);
    return next;
  }

  const isMin = colId.endsWith("_min_stock");
  const isMax = colId.endsWith("_max_stock");
  if (!isMin && !isMax) return next;

  const field = isMin ? "min_stock" : "max_stock";
  const suffix = isMin ? "_min_stock" : "_max_stock";
  const size = colId.slice(0, -suffix.length);

  if (!next[field]) next[field] = {};
  if (!next[field][storeCode]) next[field][storeCode] = {};
  next[field][storeCode][size] = value;
  return next;
};

const buildSetAllEditsPayload = (
  formData,
  selections,
  sizeRows,
  totalRows,
  showSizeLevelBulkEdit
) => {
  const edits = {};
  const isAllSelected = selections.length === totalRows && totalRows > 0;

  const assignScalarField = (field, formKey) => {
    if (isEmpty(formData[formKey])) return;
    const normalizedValue =
      field === "wos"
        ? normalizeRefreshEditValue("wos_rounded", formData[formKey])
        : formData[formKey];
    edits[field] = isAllSelected ? { "*": normalizedValue } : {};
    if (!isAllSelected) {
      selections.forEach((sel) => {
        edits[field][sel.data.store_code] = normalizedValue;
      });
    }
  };

  assignScalarField("wos", "wos_rounded");
  assignScalarField("min_stock", "min");
  assignScalarField("max_stock", "max");

  if (showSizeLevelBulkEdit && sizeRows?.length) {
    sizeRows.forEach((item) => {
      if (!isUndefined(item.min) && !onlySpaces(item.min)) {
        if (!edits.min_stock) edits.min_stock = {};
        if (isAllSelected) {
          if (typeof edits.min_stock["*"] !== "object") edits.min_stock["*"] = {};
          edits.min_stock["*"][item.sizeKey] = item.min;
        } else {
          selections.forEach((sel) => {
            const storeCode = sel.data.store_code;
            if (!edits.min_stock[storeCode]) edits.min_stock[storeCode] = {};
            edits.min_stock[storeCode][item.sizeKey] = item.min;
          });
        }
      }
      if (!isUndefined(item.max) && !onlySpaces(item.max)) {
        if (!edits.max_stock) edits.max_stock = {};
        if (isAllSelected) {
          if (typeof edits.max_stock["*"] !== "object") edits.max_stock["*"] = {};
          edits.max_stock["*"][item.sizeKey] = item.max;
        } else {
          selections.forEach((sel) => {
            const storeCode = sel.data.store_code;
            if (!edits.max_stock[storeCode]) edits.max_stock[storeCode] = {};
            edits.max_stock[storeCode][item.sizeKey] = item.max;
          });
        }
      }
    });
  }

  return edits;
};

const extractEditableFieldsFromRow = (row) => {
  if (!row?.store_code) return null;

  const snapshot = {
    min_stock: row.min_stock,
    max_stock: row.max_stock,
    wos_rounded: row.wos_rounded,
  };

  row.size_desc?.forEach((size) => {
    snapshot[`${size}_min_stock`] = row[`${size}_min_stock`];
    snapshot[`${size}_max_stock`] = row[`${size}_max_stock`];
  });

  return snapshot;
};

const editableFieldValuesDiffer = (currentValue, baselineValue) => {
  if (currentValue === baselineValue) return false;

  const isEmptyish = (val) => val === null || val === undefined || val === "";
  if (isEmptyish(currentValue) && isEmptyish(baselineValue)) return false;

  const currentNumber = Number(currentValue);
  const baselineNumber = Number(baselineValue);
  if (
    !Number.isNaN(currentNumber) &&
    !Number.isNaN(baselineNumber) &&
    currentNumber === baselineNumber
  ) {
    return false;
  }

  return true;
};

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const mergeFieldEdits = (baseFieldEdits, overrideFieldEdits) => {
  if (isEmpty(baseFieldEdits)) return cloneDeep(overrideFieldEdits || {});
  if (isEmpty(overrideFieldEdits)) return cloneDeep(baseFieldEdits);

  const merged = cloneDeep(baseFieldEdits);
  Object.keys(overrideFieldEdits).forEach((storeKey) => {
    const overrideValue = overrideFieldEdits[storeKey];
    const baseValue = merged[storeKey];

    if (isPlainObject(overrideValue) && isPlainObject(baseValue)) {
      merged[storeKey] = { ...baseValue, ...overrideValue };
      return;
    }

    merged[storeKey] = overrideValue;
  });
  return merged;
};

const mergeEditPayloads = (baseEdits, overrideEdits) => {
  if (isEmpty(baseEdits)) return cloneDeep(overrideEdits || {});
  if (isEmpty(overrideEdits)) return cloneDeep(baseEdits);

  const merged = cloneDeep(baseEdits);
  ["wos", "min_stock", "max_stock"].forEach((field) => {
    if (isEmpty(overrideEdits[field])) return;
    merged[field] = mergeFieldEdits(merged[field], overrideEdits[field]);
  });
  return merged;
};

// Set-all overrides inline edits for the same field/size/store — do not send both.
const stripEditsOverriddenBySetAll = (pendingEdits, setAllEdits) => {
  if (isEmpty(pendingEdits)) return {};
  if (isEmpty(setAllEdits)) return cloneDeep(pendingEdits);

  const stripFieldEdits = (pendingFieldEdits, setAllFieldEdits) => {
    if (isEmpty(pendingFieldEdits) || isEmpty(setAllFieldEdits)) {
      return pendingFieldEdits ? cloneDeep(pendingFieldEdits) : {};
    }

    const result = cloneDeep(pendingFieldEdits);

    if (setAllFieldEdits["*"] !== undefined) {
      const wildcardValue = setAllFieldEdits["*"];

      if (isPlainObject(wildcardValue)) {
        Object.keys(result).forEach((storeKey) => {
          if (!isPlainObject(result[storeKey])) return;
          Object.keys(wildcardValue).forEach((size) => {
            delete result[storeKey][size];
          });
          if (isEmpty(result[storeKey])) delete result[storeKey];
        });
      } else {
        Object.keys(result).forEach((storeKey) => {
          delete result[storeKey];
        });
      }
    }

    Object.keys(setAllFieldEdits).forEach((storeKey) => {
      if (storeKey === "*") return;

      const setAllValue = setAllFieldEdits[storeKey];
      if (!result[storeKey]) return;

      if (isPlainObject(setAllValue)) {
        Object.keys(setAllValue).forEach((size) => {
          delete result[storeKey][size];
        });
        if (isEmpty(result[storeKey])) delete result[storeKey];
      } else {
        delete result[storeKey];
      }
    });

    return result;
  };

  const result = cloneDeep(pendingEdits);
  ["wos", "min_stock", "max_stock"].forEach((field) => {
    if (isEmpty(setAllEdits[field])) return;
    result[field] = stripFieldEdits(result[field], setAllEdits[field]);
    if (isEmpty(result[field])) delete result[field];
  });
  return result;
};

const hydrateSessionEditsFromGrid = (sessionEdits, rows) => {
  if (isEmpty(sessionEdits) || !rows?.length) return {};

  const rowsByCode = Object.fromEntries(rows.map((row) => [row.store_code, row]));
  let hydrated = {};

  const hydrateField = (fieldKey, colId) => {
    const fieldEdits = sessionEdits[fieldKey];
    if (isEmpty(fieldEdits)) return;

    Object.keys(fieldEdits).forEach((storeKey) => {
      if (storeKey === "*") {
        const wildcardValue = fieldEdits["*"];

        if (
          isPlainObject(wildcardValue) &&
          (fieldKey === "min_stock" || fieldKey === "max_stock")
        ) {
          if (!hydrated[fieldKey]) hydrated[fieldKey] = {};
          hydrated[fieldKey]["*"] = {
            ...(hydrated[fieldKey]["*"] || {}),
            ...cloneDeep(wildcardValue),
          };
          return;
        }

        hydrated = trackStoreEdit(
          hydrated,
          "*",
          colId,
          normalizeRefreshEditValue(colId, wildcardValue)
        );
        return;
      }

      const row = rowsByCode[storeKey];
      if (!row) return;

      const editValue = fieldEdits[storeKey];
      if (editValue !== null && typeof editValue === "object") {
        Object.keys(editValue).forEach((size) => {
          const sizeColId =
            fieldKey === "min_stock" ? `${size}_min_stock` : `${size}_max_stock`;
          hydrated = trackStoreEdit(hydrated, storeKey, sizeColId, row[sizeColId]);
        });
        return;
      }

      const value =
        fieldKey === "wos"
          ? normalizeRefreshEditValue("wos_rounded", row.wos_rounded)
          : row[fieldKey];
      hydrated = trackStoreEdit(hydrated, storeKey, colId, value);
    });
  };

  hydrateField("wos", "wos_rounded");
  hydrateField("min_stock", "min_stock");
  hydrateField("max_stock", "max_stock");
  return hydrated;
};

const buildRefreshEditsPayloadFromRows = (rows, baselineByStoreCode) => {
  let edits = {};
  if (!rows?.length || isEmpty(baselineByStoreCode)) return edits;

  rows.forEach((row) => {
    const storeCode = row?.store_code;
    const baseline = baselineByStoreCode[storeCode];
    if (!storeCode || !baseline) return;

    EDITABLE_STORE_FIELDS.forEach((field) => {
      if (editableFieldValuesDiffer(row[field], baseline[field])) {
        edits = trackStoreEdit(edits, storeCode, field, row[field]);
      }
    });

    row.size_desc?.forEach((size) => {
      const minCol = `${size}_min_stock`;
      const maxCol = `${size}_max_stock`;

      if (editableFieldValuesDiffer(row[minCol], baseline[minCol])) {
        edits = trackStoreEdit(edits, storeCode, minCol, row[minCol]);
      }
      if (editableFieldValuesDiffer(row[maxCol], baseline[maxCol])) {
        edits = trackStoreEdit(edits, storeCode, maxCol, row[maxCol]);
      }
    });
  });

  return edits;
};

const parseGridInputValue = (rawValue) => {
  const raw = rawValue?.replace(/,/g, "").trim();
  if (raw === "") return null;

  const parsed = Number(parseFloat(raw));
  if (Number.isNaN(parsed)) return null;

  return Number.isInteger(parsed) ? parsed : parseInt(parsed, 10);
};

const StoreDetails = (props) => {
  const customClasses = useStyles();
  const globalClasses = globalStyles();
  const [showSetAllModal, setShowSetAllModal] = useState(false);
  const [buttonEnabled, setButtonEnabled] = useState(false);
  const [
    createAllocationButtonEnabled,
    setCreateAllocationButtonEnabled,
  ] = useState(true);
  const [forwardButtonEnabled, setForwardButtonEnabled] = useState(false);
  const [disabledForViewOnlyAccess, setDisabledForViewOnlyAccess] = useState(
    false
  );
  const [refStoreChanged, setRefStoreChanged] = useState(false);
  const [showApplyBtn, updateShowApplybtn] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [
    articlesWithValidationError,
    setArticlesWithValidationError,
  ] = useState({
    articlesWithValidationError: [],
    validationErrorMessage: "",
    articlesListWithAllPossibleValidation: [],
  });
  const sessionEditsRef = useRef({});
  const baselineStoreRowsRef = useRef({});
  const baselineArticleRef = useRef(null);
  const [hasPendingEdits, setHasPendingEdits] = useState(false);
  const navigate = useNavigate();

  const {
    storeData,
    storeColumnm,
    loadTableInstance,
    pollingReq,
    applyChanges,
    allocationName,
    storeRequest,
    storeResponse,
    selectedArticle,
    agGridInstance,
    updatedStores,
    updatedDcs,
    articleTableGridInstance,
    updatedRows,
    setUpdatedRows,
    selectedRows,
    onSelectionChanged,
    updatedStoresStoreGroup,
    updatedStoresDcs,
    updatedStoresProductProfile,
    eligibleStoresCount,
    totalEstimatedDemad,
    setSelectedRows,
    prependData,
    getNewAggMin,
    getNewAggMax,
  } = props;
  
  const { getStores } = props;

  const classes = useStyles();
  const type = new URLSearchParams(window.location.search).get("type");

  const getGridRootElement = () =>
    document.querySelector(`.${classes.storeDetailsTable}`);

  const commitGridInputToNode = (api, input) => {
    if (!api || !input || input.tagName !== "INPUT") return false;

    const value = parseGridInputValue(input.value);
    if (value === null) return false;

    const cellEl = input.closest(".ag-cell");
    const rowEl = cellEl?.closest(".ag-row");
    const colId = cellEl?.getAttribute("col-id");
    const rowIndex = parseInt(rowEl?.getAttribute("row-index"), 10);

    if (!colId || Number.isNaN(rowIndex) || !isEditableStoreField(colId)) {
      return false;
    }

    const node = api.getDisplayedRowAtIndex(rowIndex);
    if (!node) return false;

    const currentValue = node.data?.[colId];
    if (
      currentValue === value ||
      (!Number.isNaN(Number(currentValue)) && Number(currentValue) === value)
    ) {
      return false;
    }

    node.setDataValue(colId, value);
    return true;
  };

  // Sync every visible grid input into row data (fires onCellValueChanged → processCellEdit).
  const commitAllGridInputValuesSync = () => {
    const api = agGridInstance?.current?.api;
    const gridRoot = getGridRootElement();
    if (!api || !gridRoot) return;

    gridRoot.querySelectorAll(".ag-cell input").forEach((input) => {
      commitGridInputToNode(api, input);
    });
  };

  const commitActiveInputValueSync = (e) => {
    if (e?.preventDefault) e.preventDefault();
    commitAllGridInputValuesSync();
  };

  // Commit pending cell edits and wait for AG Grid / React to finish processing.
  const commitAllPendingEdits = async () => {
    commitAllGridInputValuesSync();
    agGridInstance?.current?.api?.stopEditing();

    await new Promise((resolve) => queueMicrotask(resolve));
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await new Promise((resolve) => requestAnimationFrame(resolve));
  };

  const getGridRowsForRefreshEdits = () => {
    const api = agGridInstance?.current?.api;
    if (!api) return storeData || [];

    const rows = [];
    api.forEachNode((node) => {
      if (node.data) rows.push(node.data);
    });
    return rows.length ? rows : storeData || [];
  };

  const syncBaselineFromGrid = () => {
    const rows = getGridRowsForRefreshEdits();
    const baseline = {};
    rows.forEach((row) => {
      const snapshot = extractEditableFieldsFromRow(row);
      if (snapshot && row.store_code) {
        baseline[row.store_code] = snapshot;
      }
    });
    baselineStoreRowsRef.current = baseline;
  };

  const getRefreshEditsPayload = () => {
    const rows = getGridRowsForRefreshEdits();
    const gridEdits = buildRefreshEditsPayloadFromRows(
      rows,
      baselineStoreRowsRef.current
    );
    const sessionEdits = hydrateSessionEditsFromGrid(
      sessionEditsRef.current,
      rows
    );
    return mergeEditPayloads(sessionEdits, gridEdits);
  };

  const getSelectedStoresForSave = () => {
    const api = agGridInstance?.current?.api;
    if (!api) return {};

    const mapping = {};
    api.forEachNode((node) => {
      if (node.selected && node.data) {
        mapping[node.data.store_code] = { ...node.data, is_selected: true };
      }
    });
    return mapping;
  };

  useEffect(() => {
    const articleValue = selectedArticle?.value;

    if (!storeData?.length) {
      baselineStoreRowsRef.current = {};
      baselineArticleRef.current = null;
      sessionEditsRef.current = {};
      setHasPendingEdits(false);
      return;
    }

    // Baseline resets only on article change — not after refresh/set-all storeData updates.
    if (baselineArticleRef.current !== articleValue) {
      baselineArticleRef.current = articleValue;
      sessionEditsRef.current = {};
      const baseline = {};
      storeData.forEach((row) => {
        const snapshot = extractEditableFieldsFromRow(row);
        if (snapshot && row.store_code) {
          baseline[row.store_code] = snapshot;
        }
      });
      baselineStoreRowsRef.current = baseline;
      setHasPendingEdits(false);
    }
  }, [storeData, selectedArticle?.value]);

  useEffect(() => {
    if (agGridInstance?.current) {
      agGridInstance.current.api.buttonEnabled = buttonEnabled;
    }
  }, [buttonEnabled]);

  useEffect(() => {
    if (type !== DRAFT_FLOW) {
      if (props.backButtonClicked) {
        setCreateAllocationButtonEnabled(true);
        setForwardButtonEnabled(true);
      } else {
        setCreateAllocationButtonEnabled(true);
        setForwardButtonEnabled(false);
      }
    }
  }, [props.backButtonClicked]);

  useEffect(() => {
    if (
      !isEmpty(props.inventorysmartModulesPermission) &&
      !isEmpty(props.module)
    ) {
      let l_roleWithCreateAccess = isActionAllowedOnSubModule(
        props.inventorysmartModulesPermission,
        props.module,
        INVENTORY_SUBMODULES_NAMES.INVENTORY_CREATE_ALLOCATION_STORE_TABLE,
        "create"
      );
      setDisabledForViewOnlyAccess(!l_roleWithCreateAccess);
    }
    let ref_store_col = storeColumnm.some(
      (item) => item.column_name === "ref_store"
    );
    updateShowApplybtn(ref_store_col);
  }, [props.inventorysmartModulesPermission, props.module]);

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  // Runs the expensive parent selection work (onSelectionChanged) a single time.
  const processSelectionChange = (event) => {
    let l_selections = event.api.getSelectedRows().length;
    let l_buttonEnabled = agGridInstance.current.api.buttonEnabled;
    if (l_selections) {
      !l_buttonEnabled && setButtonEnabled(true);
    } else {
      l_buttonEnabled && setButtonEnabled(false);
    }
    onSelectionChanged(event);
  };

  // Always call the latest closure (onSelectionChanged/selectedArticle change per render).
  const processSelectionChangeRef = useRef(processSelectionChange);
  processSelectionChangeRef.current = processSelectionChange;

  // On load AG Grid selects pre-selected rows one-by-one, firing selectionChanged
  // per row (O(n^2) work -> crash for large datasets). Coalesce all events in a
  // tick into one processing pass via a microtask (no delay for user clicks).
  const selectionFlushScheduledRef = useRef(false);
  const latestSelectionEventRef = useRef(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const onSelectionChangedHandler = (event) => {
    // api/columnApi are stable across the burst; keep only the latest event.
    latestSelectionEventRef.current = event;
    if (selectionFlushScheduledRef.current) return;
    selectionFlushScheduledRef.current = true;
    Promise.resolve().then(() => {
      selectionFlushScheduledRef.current = false;
      const l_event = latestSelectionEventRef.current;
      latestSelectionEventRef.current = null;
      if (l_event && isMountedRef.current) {
        processSelectionChangeRef.current(l_event);
      }
    });
  };
  const getReviewedDetails = (p_articleStoreData, p_updatesStores) => {
    let channelKey = getEffectiveChannelKey(props.createAllocationProps, props.channelKey);
    let l_req = {},
      l_reviewed = false,
      l_updatedStoresForSelectedArticle =
        p_updatesStores?.[p_articleStoreData?.article_data],
      l_selectedStores = Object.values(
        l_updatedStoresForSelectedArticle || []
      ).filter((val) => val?.is_selected),
      l_channel = props.selectedFilters?.filter(
        (filter) => filter.attribute_name === channelKey
      )[0]?.values[0];

    let l_storeArticleData = [];
    if (p_articleStoreData.article_data === selectedArticle.value) {
      l_reviewed = true;
      agGridInstance.current.api.forEachNode((node) => {
        if (node.selected && node.data) {
          l_storeArticleData.push(node.data);
        }
      });
    } else if (
      Object.keys(storeResponse).includes(p_articleStoreData.article_data)
    ) {
      l_reviewed = true;
      l_storeArticleData =
        storeResponse[p_articleStoreData.article_data]?.["data"];
      if (!isEmpty(l_selectedStores)) {
        l_storeArticleData = cloneDeep(l_selectedStores);
      }
    }
    l_req = {
      ...getValuesFromObject(
        l_storeArticleData,
        REVIEWED_ARTICLES_MAPPING_TO_PREP_REQUEST
      ),
      Modified_Flag: true,
      channel: l_channel
        ? fill(Array(l_storeArticleData.length), l_channel)
        : null,
      Store_List: props.isStoreBand
        ? []
        : l_storeArticleData?.map((storeArticle) => storeArticle.store_code),

      store_band_size_list: props.isStoreBand
        ? l_storeArticleData?.map((val) => {
            if (props.isStoreBand) {
              return {
                store_band: val["store_code"],
                total_inventory: val.oh_oo_it,
              };
            }
          })
        : [],

      store_size_list: props.isStoreBand
        ? []
        : l_storeArticleData?.map((val) => {
            return {
              store: val["store_code"],
              store_level_propotion: val["overall_proportion"],
              size: val["size_desc"],
              size_level_proportion: val["size_level_proportion"],
              original_min_stock: val?.["size_desc"]?.map((item) => {
                let final = 0;
                if (props?.createAllocationProps?.showSizeLevelBulkEdit) {
                  final = val?.[item + "_min_stock"]
                    ? val?.[item + "_min_stock"]
                    : 0;
                } else {
                  final = val?.["min_stock"]
                    ? val?.["min_stock"]
                    : val?.[item + "_min_stock"]
                    ? val?.[item + "_min_stock"]
                    : 0;
                }
                return final;
              }),
              original_max_stock: val?.["size_desc"]?.map((item) => {
                let final = 0;

                if (props?.createAllocationProps?.showSizeLevelBulkEdit) {
                  final = val?.[item + "_max_stock"]
                    ? val?.[item + "_max_stock"]
                    : 0;
                } else {
                  final = val?.["max_stock"]
                    ? val?.["max_stock"]
                    : val?.[item + "_max_stock"]
                    ? val?.[item + "_max_stock"]
                    : 0;
                }
                return final;
              }),
            };
          }),
      minMaxEdited: l_storeArticleData?.some(
        (storeArticle) => storeArticle.minMaxEdited
      ),
    };
    l_req.WOS = Boolean(props?.createAllocationProps?.isDOSAvailable) ? (l_req.WOS.length > 0 ? l_req.WOS.map((item) => item ? (item/7).toFixed(3) : null) : []) : l_req.WOS;
    if (props.isStoreBand) {
      l_req.channel = ["NC"];
      l_req.mapped_store_band = l_storeArticleData.map((item) => item.psa_name);
      l_req.mapped_stores = [];
      l_req.psa_name_list = l_storeArticleData.map((item) => item.psa_name);
    }
    if (props.isStoreBand && !l_reviewed) {
      let filterSelectedStoreBand = props.selectedFilters?.filter(
        (filter) => filter.attribute_name === "psa_name"
      )[0]?.values;
      l_req.psa_name_list = filterSelectedStoreBand;
    }
    l_req.is_reviewed = l_reviewed;
    return l_req;
  };

  // Process the cell edit after validation
  const processCellEdit = (editData) => {
    const { storeCode, colId, data, newValue } = editData;

    if (newValue !== undefined && newValue !== null) {
      data[colId] = newValue;
    }

    // Validation logic from onBlur
    if (colId === "wos_rounded") {
      if (data.wos_rounded === "" || data.wos_rounded === null) {
        data.wos_rounded = 1;
      }
      if (data.wos_rounded > 52) {
        data.wos_rounded = 52;
      }
      data.isWosEdited = true;
    }
    
    if (colId === "min_stock" || colId === "max_stock") {
      if (data.min_stock === 0 || data.min_stock === "" || data.min_stock === null) {
        data.min_stock = 0;
      }
      if (data.max_stock === 0 || data.max_stock === "" || data.max_stock === null) {
        data.max_stock = data.min_stock;
      }
      if (data.max_stock === data.min_stock) {
        data.max_stock = data.max_stock + 1;
      }
      data.minMaxEdited = true;
    }

    if (colId.includes("_min_stock") && getNewAggMin) {
      data.min_stock_sum = getNewAggMin(data);
    }
    if (colId.includes("_max_stock") && getNewAggMax) {
      data.max_stock_sum = getNewAggMax(data);
    }

    if (isEditableStoreField(colId)) {
      sessionEditsRef.current = trackStoreEdit(
        sessionEditsRef.current,
        storeCode,
        colId,
        data[colId]
      );
      setHasPendingEdits(true);
    }

    if (agGridInstance?.current?.api) {
      const columnsToRefresh = [colId, "wos_rounded"];
      if (colId.includes("_min_stock")) {
        columnsToRefresh.push("min_stock_sum");
      }
      if (colId.includes("_max_stock")) {
        columnsToRefresh.push("max_stock_sum");
      }
      agGridInstance.current.api.refreshCells({ columns: columnsToRefresh });
    }
    
    // Update the updatedRows state
    setUpdatedRows((old) => {
      const nextUpdatedRows = {
        ...old,
        [storeCode]: { ...data, is_selected: false },
      };
      return nextUpdatedRows;
    });
    
    // Update selectedRows if the edited row is selected
    if (agGridInstance?.current?.api) {
      const l_selectedRows = [];
      agGridInstance.current.api.forEachNode((node) => {
        node.selected && l_selectedRows.push({ ...node.data, is_selected: true });
      });
      
      if (l_selectedRows?.map((val) => val.store_code)?.includes(storeCode)) {
        const l_selectedRowsStoreCodeMapping = {};
        l_selectedRows.forEach((rows) => {
          l_selectedRowsStoreCodeMapping[rows.store_code] = rows;
        });
        setSelectedRows(l_selectedRowsStoreCodeMapping);
      }
    }
  };

  const refreshStoresWithEdits = async (editsPayload, successMessage) => {
    if (isEmpty(editsPayload)) return;

    props.setStoreDcTableLoader(true);

    try {
      let channelKey = getEffectiveChannelKey(props.createAllocationProps, props.channelKey);
      let channelData = props.selectedFilters?.filter(
        (filter) => filter.attribute_name === channelKey
      )?.[0]?.values;

      if (!channelData || channelData.length === 0) {
        channelData = props.defaultProductChannel
          ? props.defaultProductChannel
          : ["NC"];
      }

      const payload = {
        ...storeRequest[selectedArticle.value],
        product_channel: channelData,
        cache_key: props.cacheKeyRef?.current,
        edits: editsPayload,
      };

      const l_storeResponse = await getStores([payload]);
      props.processStoreResponse(l_storeResponse, successMessage);
      await new Promise((resolve) => requestAnimationFrame(resolve));
      syncBaselineFromGrid();
      sessionEditsRef.current = mergeEditPayloads(
        stripEditsOverriddenBySetAll(sessionEditsRef.current, editsPayload),
        editsPayload
      );
    } catch (err) {
      displaySnackMessages("Failed to refresh data", "error");
    } finally {
      props.setStoreDcTableLoader(false);
    }
  };

  const handleRefreshWithEdits = async () => {
    await commitAllPendingEdits();

    const editsPayload = getRefreshEditsPayload();

    if (isEmpty(editsPayload)) {
      displaySnackMessages("No edits to refresh", "info");
      return;
    }

    await refreshStoresWithEdits(editsPayload, "Data refreshed successfully");
    const pendingGridDiff = buildRefreshEditsPayloadFromRows(
      getGridRowsForRefreshEdits(),
      baselineStoreRowsRef.current
    );
    setHasPendingEdits(!isEmpty(pendingGridDiff));
  };

  // Set All: keep non-conflicting inline edits (e.g. wos), drop inline min/max overridden by set-all.
  const handleSetAllWithEdits = async (setAllEdits) => {
    await commitAllPendingEdits();

    const pendingEdits = getRefreshEditsPayload();
    const nonConflictingPending = stripEditsOverriddenBySetAll(
      pendingEdits,
      setAllEdits
    );
    const editsPayload = mergeEditPayloads(nonConflictingPending, setAllEdits);

    if (isEmpty(editsPayload)) {
      displaySnackMessages("No edits to apply", "info");
      return;
    }

    await refreshStoresWithEdits(
      editsPayload,
      "Set All completed successfully"
    );

    const pendingGridDiff = buildRefreshEditsPayloadFromRows(
      getGridRowsForRefreshEdits(),
      baselineStoreRowsRef.current
    );
    setHasPendingEdits(!isEmpty(pendingGridDiff));
  };

  const onCellValueChanged = (p_instance) => {
    const { column, newValue, oldValue, data } = p_instance;
    const colId = column?.colId;
    const storeCode = data?.store_code;
    
    // Handle ref_store changes
    if (colId === "ref_store" && newValue !== oldValue && !refStoreChanged) {
      setRefStoreChanged(true);
    }
    
    // Enable create allocation button for any change
    if (type !== DRAFT_FLOW) {
      !createAllocationButtonEnabled && setCreateAllocationButtonEnabled(true);
      forwardButtonEnabled && setForwardButtonEnabled(false);
    }
    
    const isSizeLevelField =
      colId?.includes("_min_stock") || colId?.includes("_max_stock");

    if (
      (EDITABLE_STORE_FIELDS.includes(colId) || isSizeLevelField) &&
      oldValue !== newValue
    ) {
      processCellEdit({ storeCode, colId, data, newValue });
    }
  };

  const pushPrevDraftData = (
    p_requestToSaveDraft,
    p_requestToSaveDraftMapping
  ) => {
    let l_storeRequest = {
      DC_Codes: [],
      ...storeRequest[selectedArticle.value],
    };
    let l_draftData = props.draftResult;
    let isDraftEmpty = isEmpty(l_draftData);
    for (let mappingKey in p_requestToSaveDraftMapping) {
      let l_mappedValues =
        l_storeRequest[p_requestToSaveDraftMapping?.[mappingKey]];
      let l_arrayValues = Array.isArray(l_mappedValues)
        ? l_mappedValues
        : [l_mappedValues];
      p_requestToSaveDraft["req_top_table"][mappingKey].push(
        ...l_arrayValues,
        ...(!isDraftEmpty ? l_draftData[mappingKey] : [])
      );
    }
  };

  const getChangedArticlesAndDcFromPrevDraft = (
    p_changedRowsFromPrevDraftFlow,
    p_accessor
  ) => {
    return (
      p_changedRowsFromPrevDraftFlow &&
      p_changedRowsFromPrevDraftFlow[p_accessor]
    );
  };

  const getRequestForSavePlanForDraft = (p_createAllocationRequest) => {
    try {
      return p_createAllocationRequest?.map((value) => {
        let reqBody = {
          article: value.product_code,
          inventory_source:
            value.inventory_source[0] === "on_hand"
              ? ["onhand"]
              : value.inventory_source,
        };
        if (props.isStoreBand) {
          let filterSelectedStoreBand = props.selectedFilters?.filter(
            (filter) => filter.attribute_name === "psa_name"
          )[0]?.values;
          reqBody.store_bands =
            value.mapped_store_band?.length > 0
              ? value.mapped_store_band
              : filterSelectedStoreBand;
        } else {
          reqBody.store_code =
            value.store_List?.length > 0
              ? value.store_List
              : value.mapped_stores;
        }
        return reqBody;
      });
    } catch {
      return [];
    }
  };
  const lowerObjectKeys = (obj) => {
    return Object.entries(obj).reduce((carry, [key, value]) => {
      carry[key.toLowerCase()] = value;

      return carry;
    }, {});
  };
  const callDraftAndAllocationApi = async ({
    l_allocationName,
    l_request,
    isDraft,
    l_updatesStores,
    excludeAndContinueWithAllocation,
  }) => {
    try {
      new URLSearchParams(window.location.search).get("allocation_code") &&
        (await props.deleteDrafts(
          new URLSearchParams(window.location.search).get("allocation_code")
        ));

      if (l_request?.req_top_table?.product_profile_codes) {
        l_request.req_top_table.product_profile_codes = l_request.req_top_table.product_profile_codes.map(
          (code) => {
            return `${code}`;
          }
        );
      }
      if (l_request?.req_top_table?.store_group_codes) {
        l_request.req_top_table.store_group_codes = l_request.req_top_table.store_group_codes.map(
          (code) => {
            return `${code}`;
          }
        );
      }
      let l_draftResponse = await props.saveDraft(l_request);
      if (
        l_draftResponse.data.status &&
        l_draftResponse.data.data.allocation_id
      ) {
        props.articleTableGlobalInstance.current = [];
        props.articleTableColumnRef.current = [];
        props?.setDraftAllocationDetails({});
        props.setAllocationPlanName("");
        let l_storeDetailsAfterExclusion = !isEmpty(
          articlesWithValidationError?.articlesListWithAllPossibleValidation
        )
          ? omit(
              storeRequest,
              articlesWithValidationError?.articlesListWithAllPossibleValidation
            )
          : storeRequest;
        let l_req = Object.values(l_storeDetailsAfterExclusion)?.map(
          (articleStoreData) => {
            articleStoreData.dc_codes =
              articleStoreData?.dc_codes?.length > 0
                ? articleStoreData.dc_codes.map((item) => `${item}`)
                : [];
            articleStoreData.inventory_source[0] =
              articleStoreData.inventory_source[0] === "onhand"
                ? "on_hand"
                : articleStoreData.inventory_source[0];
            if (articleStoreData.po_ids) {
              articleStoreData.po_ids = Array.isArray(articleStoreData.po_ids)
                ? articleStoreData.po_ids
                : [articleStoreData.po_ids];
            }
            if (articleStoreData.alloc_type === "asn" && articleStoreData.asn_ids) {
              articleStoreData.asn_ids = Array.isArray(articleStoreData.asn_ids)
                ? articleStoreData.asn_ids
                : [articleStoreData.asn_ids];
              articleStoreData.dc_codes = [];
            }

            let finalObj = {
              ...articleStoreData,
              Modified_Flag: false,
              Allocation_Name: l_draftResponse.data.data?.allocation_name,
              ...getReviewedDetails(articleStoreData, l_updatesStores),
            };
            return finalObj;
          }
        );
        if (isDraft) {
          let l_savePlanForDraftResponse = await props.savePlanForDraft({
            data: getRequestForSavePlanForDraft(l_req),
            allocation_name:
              l_draftResponse.data.data?.allocation_name ||
              l_draftResponse.data.data?.allocation_id,
            allocation_code: l_draftResponse.data.data?.allocation_id,
          });
          displaySnackMessages(l_savePlanForDraftResponse.data.message, "info");
          props.setStoreDcTableLoader(false);
          if (l_savePlanForDraftResponse.data.status) {
            props.setIsFiltersValid(false);
            // props.onDraftSaved && props.onDraftSaved();
            props.onDraftSaved && props.onDraftSaved('draft');
          }
        } else {
          let channelKey = getEffectiveChannelKey(props.createAllocationProps, props.channelKey);
          let channel = props.selectedFilters?.filter(
            (filter) => filter.attribute_name === channelKey && filter.dimension.toLowerCase() === "product"
          )?.[0]?.values;
          let channelData =
            channel?.length > 0
              ? channel
              : props.defaultProductChannel
              ? props.defaultProductChannel
              : ["NC"];
          l_req = l_req.map((item) => {
            // if (item.po_ids) {
            //   item.po_ids = [item.po_ids];
            // }
            // if (item.alloc_type === "asn" && item.asn_ids) {
            //   item.asn_ids = Array.isArray(item.asn_ids)
            //     ? item.asn_ids
            //     : [item.asn_ids];
            //   item.dc_codes = [];
            // }
            item.product_channel = channelData;
            //temp change: use Redux cacheKey when redirected from finalise (step 3) back to step 1
            item.cache_key = props.backButtonClicked
              ? props.cacheKey || props.cacheKeyRef?.current
              : props.cacheKeyRef?.current;
            let finalpayload = lowerObjectKeys(item);
            finalpayload.wos = finalpayload.wos.map((item) => Number(item));
            return finalpayload;
          });
          let l_createAllocationResponse = await props.createAllocationApi(
            {
              input_data: {
                articles: l_req,
                allocation_code: l_draftResponse.data.data?.allocation_id,
              },
            },
            props.isV3?.includes("allocation")
          );
          displaySnackMessages(l_createAllocationResponse.data.message, "info");
          props.setStoreDcTableLoader(false);
          if (l_createAllocationResponse.data.status) {
            props.setIsFiltersValid(false);
            props.onPendingAllocationCodeForFinalize?.(
              l_draftResponse?.data?.data?.allocation_id
            );
            // // Call onDraftSaved to show EmptyState component after successful Create Allocation
            props.onDraftSaved && props.onDraftSaved('allocation');
          }
        }
      }
    } catch (err) {
      handleErrorMessage(err);
      props.setStoreDcTableLoader(false);
    }
  };
  const handleErrorMessage = (e) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message) displaySnackMessages(errObj?.message, "error");
    else displaySnackMessages(ERROR_MESSAGE, "error");
  };
  const createAllocation = async ({
    isDraft,
    excludeAndContinueWithAllocation = false,
  }) => {
    try {
      if (
        (onlySpaces(allocationName) || !allocationName) &&
        props.isNameMandatory
      ) {
        displaySnackMessages("Please Enter Allocation Plan Name", "error");
        return;
      }
      let l_articlesWithValidationError = {};
      if (!excludeAndContinueWithAllocation) {
        l_articlesWithValidationError = checkValidationForArticles(
          props.polledResults?.filter(
            (result) =>
              !articlesWithValidationError.articlesListWithAllPossibleValidation?.includes(
                result.article
              )
          ),
          "article",
          props.storeGroupStoreMap,
          props.storesForSelectedStoreFilters,
          false,
          true,
          false,
          props.createAllocationProps?.allowZeroUserDefinedInventory
        );
      }
      
      if(props.allocationDetails.length > 0) {  
        props.getOptimizationDetails(props.allocationDetails);
      }

      if (
        l_articlesWithValidationError?.articlesWithValidationError?.length &&
        !excludeAndContinueWithAllocation
      )
        setArticlesWithValidationError((old) => {
          return {
            ...l_articlesWithValidationError,
            articlesListWithAllPossibleValidation: [
              ...old.articlesListWithAllPossibleValidation,
              ...l_articlesWithValidationError?.articlesWithValidationError,
            ],
          };
        });
      else {
        await commitAllPendingEdits();

        const syncedSelectedRows = getSelectedStoresForSave();
        setSelectedRows(syncedSelectedRows);

        props.setStoreDcTableLoader(true);
        let l_updatesStores = { ...updatedStores };
        let l_changedRowsFromPrevDraftFlow = props.draftResult?.changed_rows;
        if (!isEmpty(syncedSelectedRows)) {
          l_updatesStores = {
            ...l_updatesStores,
            [selectedArticle.value]: syncedSelectedRows,
          };
        }
        let articleChanges = {}
        props?.displayedAndHiddenCheckedRows?.displayedRows?.forEach(item => {
          articleChanges[item?.article] = item;
        })
        let l_request = {
          mandatory: props.mandatoryFilter,
          req_top_table: {
            filters: props.selectedFilters,
            filter_dependency:
              props.inventorysmartCreateAllocationFilterDependency,
            selection:
              articleTableGridInstance?.current?.api?.checkConfiguration ||
              props.articleAgGridParams?.selection,
            set_all:
              articleTableGridInstance?.current?.api?.checkAllSetAllRequest ||
              props.articleAgGridParams?.setAll,
            prev_action:
              articleTableGridInstance?.current?.api?.prevAction ||
              props.articleAgGridParams?.prevAction,
            allocation_name: allocationName,
            store_group_codes: [...updatedStoresStoreGroup],
            dc_codes: [...updatedStoresDcs],
            poCode: props.poCode,
            filteredSelection: !isEmpty(props.filteredSelection)
              ? props.filteredSelection
              : [],
            // props.filteredSelection,
            popupLink: props.popUpLinkFromDashbaord,
            alloc_type: props.alloc_type || null,
            asnCode: props.asnCode || null,
            product_profile_codes: [...updatedStoresProductProfile],
            displayedAndHiddenCheckedRows: {
              ...props.displayedAndHiddenCheckedRows,
            },
            createAllocationArticles: props.createAllocationArticles,
            //temp change: use Redux cacheKey when redirected from finalise (step 3) back to step 1
            cache_key: props.backButtonClicked
              ? props.cacheKey || props.cacheKeyRef?.current
              : props.cacheKeyRef?.current,
          },
          data: {
            changed_articles: {
              ...getChangedArticlesAndDcFromPrevDraft(
                l_changedRowsFromPrevDraftFlow,
                "changed_articles"
              ),
              ...(articleTableGridInstance?.current?.api?.updatedRows || {}),
              ...articleChanges,
            },
            changed_articles_store: {
              ...l_changedRowsFromPrevDraftFlow?.["changed_articles_store"],
                ...l_updatesStores
            },
            changed_articles_dc: {
              ...getChangedArticlesAndDcFromPrevDraft(
                l_changedRowsFromPrevDraftFlow,
                "changed_articles_dc"
              ),
              ...updatedDcs,
            },
          },
        };
        let l_allocationName = allocationName;
        callDraftAndAllocationApi({
          l_allocationName,
          l_request,
          isDraft,
          l_updatesStores,
          excludeAndContinueWithAllocation,
        });
      }
    } catch (e) {
      handleErrorMessage(e);
      props.setIsFiltersValid(false);
      props.setStoreDcTableLoader(false);
    }
  };

  const onApplyChangesHandler = async () => {
    setShowAlert(false);
    applyChanges();
    setRefStoreChanged(false);
  };

  const excludeAllHandler = () => {
    createAllocation({
      isDraft: false,
      excludeAndContinueWithAllocation: false,
    });
    // setUncheckableArticles({
    //   uncheckableRows: articlesWithValidationError?.articlesWithValidationError,
    //   callBackFunction: setUncheckableArticles,
    // });
  };

  const getTopleftOptions = () => {
    return (
      <div className={classes.headerTopLeftOptions}>
        <Tooltip
          title="Stores are selected by default. Deselect the ones not required."
          orientation="right"
          variant="tertiary"
        >
          <button
            type="button"
            className={classes.headerInfoIcon}
            aria-label="Stores are selected by default. Deselect the ones not required."
          >
            <InfoIcon />
          </button>
        </Tooltip>
        <div className={classes.dividerLine}></div>
        <div className={classes.headerMetricGroup}>
          <span className={classes.headerDataStyle}>
            Total est. demand for selected stores:
          </span>
          <span className={classes.headerValueDataStyle}>
            {totalEstimatedDemad ?? "N/A"}
          </span>
          <Tooltip
            title="Refresh Estimated Demand"
            orientation="top"
            variant="tertiary"
          >
            <button
              type="button"
              className={classes.headerRefreshIcon}
              aria-label="Refresh Estimated Demand"
              onMouseDown={commitActiveInputValueSync}
              onClick={handleRefreshWithEdits}
              disabled={!hasPendingEdits || disabledForViewOnlyAccess}
            >
              <RefreshIcon />
            </button>
          </Tooltip>
        </div>
        <div className={classes.dividerLine}></div>
        <div className={classes.headerMetricGroup}>
          <span className={classes.headerDataStyle}>
            #stores eligible for allocation:
          </span>
          <span className={classes.headerValueDataStyle}>
            {eligibleStoresCount ?? "N/A"}
          </span>
        </div>
      </div>
    );
  };

  const promptPrimaryBtn = () => {
    onApplyChangesHandler(true);
    setShowAlert(false);
  };
  const promptSecondaryBtn = () => {
    setShowAlert(false);
  };

  const handleBackToAllocationPlanInput = async () => {
    try {
      const allocationCode = new URLSearchParams(window.location.search).get(
        "allocation_code"
      );
      
      // If there's no allocation_code (normal flow from step 0 -> step 1),
      // do not call getDrafts. Just navigate back using existing Redux state.
      if (!allocationCode) {
        // props.setIsFiltersValid(false);
        props.setBackButtonClicked(true);
        navigate(`${CREATE_ALLOCATION}?step=0&type=backButton`);
        return;
      }
      
      // When navigating from step 1 to step 0, we should NOT call getDrafts
      // because the data is already loaded in Redux state from the initial navigation
      // from ViewPlansTable. Just navigate back using existing Redux state.
      // for bugs related to step 1 to step 0 on navigation please check the file timeline and check with the older code
      // props.setIsFiltersValid(false);
      props.setBackButtonClicked(true);
      navigate(
        `${CREATE_ALLOCATION}?step=0&type=backButton&allocation_code=${allocationCode}`
      );
    } catch (e) {
      handleErrorMessage(e);
    }
  };

  function getTopRightOptionsForStoreDetails() {
    let tempOptions = [];
    if(props.getTopRightOptions){
      tempOptions = props.getTopRightOptions();
    }
    if (!isEmpty(selectedRows)) {
      if (!isEmpty(tempOptions)) {
        tempOptions.push(
          <div key="selection-actions-separator" className={classes.dividerLine} />
        );
      }
      tempOptions.push(
        <Button
          variant="secondary"
          disabled={disabledForViewOnlyAccess || !buttonEnabled}
          onClick={() => setShowSetAllModal(true)}
        >
          Set All
        </Button>
      )
    }
    return tempOptions;
  }

  return (
    <div>
      <div className={`${classes.paddingBottom2rem} ${classes.storeDetailsTable}`}>
        <AgGridComponent
          height={"480px"}
          toPrependContent={props.createAllocationProps?.prependCustomData?.includes(
            "storeDetails"
          )}
          prependedContentDetails={prependData()}
          downloadAsExcel={props.createAllocationProps?.enableDownloadExcel?.includes(
            "storeDetails"
          )}
          rowdata={storeData}
          tableHeader="Store details"
          topLeftOptions={getTopleftOptions()}
          topRightOptions={getTopRightOptionsForStoreDetails()}
          columns={storeColumnm}
          selectAllHeaderComponent={true}
          onSelectionChanged={onSelectionChangedHandler}
          onCellValueChanged={onCellValueChanged}
          uniqueRowId={"store_code"}
          loadTableInstance={loadTableInstance}
          getRowStyle={(params) => {
            if (params.data.delta_store_flag) {
              return { background: "#ffffcc" };
            }
          }}
          suppressFieldDotNotation
          // below three props are used to remove pagination and add scrolling for table in client side row model
          pagination={false}
          hideSelectCurrentPageRecords
        />
      </div>
      {!props.storeDcTableLoader && (
        <div className={classes.bottomButtonsWrapper}>
          <div className={classes.bottomButtonsGreyBar}></div>
          <Grid
            gap={2}
            className={`${classes.bottomButtonsContainer24} ${globalClasses.flexAlignBetweenCenter}`}
          >
            <Button
              variant="tertiary"
              onClick={handleBackToAllocationPlanInput}
              sx={{
                "& .MuiButton-startIcon": {
                  marginRight: "0px",
                },
              }}
              startIcon={<span className={classes.leftArrowIcon}>‹</span>}
              iconPlacement="left"
            >
              {"Back to allocation plan input"}
            </Button>
            <div>
              {!props.isStoreBand && showApplyBtn && !isEmpty(selectedRows) && (
                <Button
                  variant="primary"
                  color="primary"
                  disabled={disabledForViewOnlyAccess || !refStoreChanged}
                  onClick={() => setShowAlert(true)}
                  sx={{ marginRight: "12px" }}
                >
                  Apply Changes
                </Button>
              )}
              <Button
                variant="secondary"
                disabled={disabledForViewOnlyAccess || !isEmpty(pollingReq)}
                onMouseDown={commitActiveInputValueSync}
                onClick={() => createAllocation({ isDraft: true })}
                sx={{ marginRight: "12px" }}
              >
                Save as Draft
              </Button>
              {!isEmpty(selectedRows) && (
                <Button
                  variant="primary"
                  disabled={
                    isEmpty(storeData) ||
                    disabledForViewOnlyAccess ||
                    !createAllocationButtonEnabled ||
                    !isEmpty(pollingReq)
                  }
                  onMouseDown={commitActiveInputValueSync}
                  onClick={() => createAllocation({ isDraft: false })}
                  sx={{ marginRight: "12px" }}
                >
                  {"Create allocation"}
                  <span className={classes.rightArrowIcon}> › </span>
                </Button>
              )}
              <Button
                variant="primary"
                disabled={disabledForViewOnlyAccess || !forwardButtonEnabled}
                onClick={() =>
                  navigate(
                    `${CREATE_ALLOCATION}?step=2&allocation_code=${new URLSearchParams(
                      window.location.search
                    ).get("allocation_code")}`
                  )
                }
              >
                Forward
              </Button>
            </div>
          </Grid>
        </div>
      )}
      <Validation
        articles={articlesWithValidationError}
        excludeAllHandler={excludeAllHandler}
      />
      {showSetAllModal && (
        <StoreSetAllModal
          setShowSetAllModal={setShowSetAllModal}
          agGridInstance={agGridInstance}
          displaySnackMessages={displaySnackMessages}
          setSelectedRows={setSelectedRows}
          showSizeLevelBulkEdit={
            props?.createAllocationProps?.showSizeLevelBulkEdit
          }
          wosLable={props.wosLable}
          showSetAllModal={showSetAllModal}
          buildSetAllEditsPayload={buildSetAllEditsPayload}
          applySetAllWithEdits={handleSetAllWithEdits}
        />
      )}

      <Prompt
        isOpen={showAlert}
        title="Confirmation Alert"
        children={<div>Are you sure you want to continue?</div>}
        infoList={[]}
        primaryButtonLabel={common.__ConfirmBtnText}
        onPrimaryButtonClick={promptPrimaryBtn}
        secondaryButtonLabel={common.__RejectBtnText}
        onSecondaryButtonClick={promptSecondaryBtn}
      />
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    storeDcTableLoader:
      store.inventorysmartReducer.inventorySmartCreateAllocationService
        .storeDcTableLoader,
    allocationName:
      store.inventorysmartReducer.inventorySmartCreateAllocationService
        .allocationName,
    selectedFilters:
      store.inventorysmartReducer.inventorySmartCreateAllocationService
        .selectedFilters,
    mandatoryFilter:
      store.inventorysmartReducer.inventorySmartCreateAllocationService
        .mandatoryFilter,
    inventorysmartCreateAllocationFilterDependency:
      store.inventorysmartReducer.inventorySmartCreateAllocationService
        .inventorysmartCreateAllocationFilterDependency,
    draftResult:
      store.inventorysmartReducer.inventorySmartCreateAllocationService
        .draftResult,
    backButtonClicked:
      store.inventorysmartReducer.inventorySmartCreateAllocationService
        .backButtonClicked,
    //temp change: cacheKey for when redirected from finalise (step 3) back to step 1
    cacheKey:
      store.inventorysmartReducer.inventorySmartCreateAllocationService
        .cacheKey,
    inventorysmartModulesPermission:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartModulesPermission,
    isV3:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.isV3,
    channelKey:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.channel_key,
    isNameMandatory:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartCreateAllocationConfig?.isNameMandatory,
    wosLable:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartCreateAllocationConfig?.wosLable,
    poCode:
      store.inventorysmartReducer.inventorySmartCreateAllocationService.poCode,
    alloc_type:
      store.inventorysmartReducer.inventorySmartCreateAllocationService.alloc_type,
    asnCode:
      store.inventorysmartReducer.inventorySmartCreateAllocationService.asnCode,
    filteredSelection:
      store.inventorysmartReducer.inventorySmartCreateAllocationService
        .filteredSelection,
    popUpLinkFromDashbaord:
      store.inventorysmartReducer.inventorySmartCreateAllocationService
        .popUpLinkFromDashbaord,
    createAllocationArticles:
      store.inventorysmartReducer.inventorySmartCreateAllocationService
        .createAllocationArticles,
    reserve_quantity_flag:
      store.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.["validationMessage"]?.[
        "reserve_quantity"
      ],
    createAllocationProps:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartCreateAllocationConfig,
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    defaultProductChannel:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartCreateAllocationConfig?.defaultProductChannel,
    articleAgGridParams:
      store.inventorysmartReducer.inventorySmartCreateAllocationService
        .articleAgGridParams,
  };
};

const mapDispatchToProps = (dispatch) => ({
  createAllocationApi: (payload, isV3) =>
    dispatch(createAllocationApi(payload, isV3)),
  savePlanForDraft: (payload) => dispatch(savePlanForDraft(payload)),
  saveDraft: (payload) => dispatch(saveDraft(payload)),
  deleteDrafts: (payload) => dispatch(deleteDrafts(payload)),
  addSnack: (snack) => dispatch(addSnack(snack)),
  setIsFiltersValid: (payload) => dispatch(setIsFiltersValid(payload)),
  setStoreDcTableLoader: (payload) => dispatch(setStoreDcTableLoader(payload)),
  getDrafts: (payload) => dispatch(getDrafts(payload)),
  setDraftsResult: (payload) => dispatch(setDraftsResult(payload)),
  setInventorysmartCreateAllocationFilterDependency: (payload) =>
    dispatch(setInventorysmartCreateAllocationFilterDependency(payload)),
  setArticleAgGridParams: (payload) =>
    dispatch(setArticleAgGridParams(payload)),
  setCreateAllocationArticles: (payload) =>
    dispatch(setCreateAllocationArticles(payload)),
  setSelectedFilters: (payload) => dispatch(setSelectedFilters(payload)),
  setIsValidDraft: (payload) => dispatch(setIsValidDraft(payload)),
  setBackButtonClicked: (payload) => dispatch(setBackButtonClicked(payload)),
  setShowInvalidDraftModal: (payload) =>
    dispatch(setShowInvalidDraftModal(payload)),
  setPOCode: (payload) => dispatch(setPOCode(payload)),
  setFilteredSelection: (payload) => dispatch(setFilteredSelection(payload)),
  setPopUpLinkFromDashbaord: (payload) =>
    dispatch(setPopUpLinkFromDashbaord(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(StoreDetails);
