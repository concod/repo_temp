import { Typography } from "@mui/material";
import { Button, OldTable, Tooltip } from "impact-ui-v3";
import SetAll from "core/Utils/agGrid/setall-form";
import { createPortal } from "react-dom";
import { displaySnackMessages } from 'core/Utils/utils'
import {
  setLastSearchType,
  setTableSearchConfig,
  setTableRecentChanges,
  setKeyboardTableAction,
} from "core/actions/tableColumnActions";
import { decimalsFormatter } from "core/Utils/formatter/index";
import { LicenseManager } from "ag-grid-enterprise";
import classNames from "classnames";
import {
  cloneDeep,
  isEmpty,
  isNil,
  sortBy,
  find,
  debounce,
  throttle,
  isFunction,
  isUndefined
} from "lodash";
import PropTypes from "prop-types";
import { useCallback, useEffect, useMemo, useRef, useState, Suspense, lazy} from "react";
import { connect, useDispatch, useSelector } from "react-redux";
import "./ag-theme-mtp.scss";
import SelectAllComponent from "./column-component/selectAllComponent";
import TableActions from "./column-component/tableActions";
import {
  ascendingOrderLabel,
  descendingOrderLabel,
  groupContractedIcon,
  groupExpandedIcon,
  PINNED_VIEWPORT_THRESHOLD,
  COLUMN_TYPES,
  chatExtraData
} from "./constants";
import { checkAllHandler, checkRowHandler } from "./select-rows-functions";
import {
  autoSizeGridColumns,
  customCompare,
  defaultToolPanelFormat,
  formatNumber,
  getAllColumnsWidth,
  getGridWidth,
  getTypeCastInfoForSearchAndSort,
  nonFormattingCoulumnHeaders,
  numberFormattingDataTypes,
  onColMenuAutoAdjustClick,
  onColMenuFreezeClick,
  onColumnWidthDrag,
  parseRangeBody,
  sortFunc,
  handleCustomKeyboardShortcuts,
  freezeColumn,
  handleCellKeydown,
  suppressAgGridKeyboardEvents,
  handleEnableSearch,
  populateSortConfig,
  paginationPageSizeFormatter,
  checkEnableCellWrap,
  columnGroupOpenHandler,
  getMaxDepth,
  addSpanClasses,
  onSortChangedHandler,
  getFilteredRows,
  exportToExcel,
  hideHiddenCols,
} from "./table-functions";
// import { dummyrule1, dummyColoumnRule1 } from "./table-functions";
import { filterAccessibleTableData } from "core/Utils/filter-accessible-data";
import {
  replaceSpecialCharsInSearchPattern,
} from "core/Utils/functions/utils";
import { fetchDynamicConfigFromTenantReducer } from "core/Utils/DynamicLabels";
import globalStyles from "core/Styles/globalStyles";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import {
  getTableViewConfigData,
  getDefaultTableViewConfigData,
  setTableViewConfigData
} from "./table-view/table-view-panel-service";
import DefaultTableViewQuickSave from "./table-view/defaultTableViewQuickSave";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import CustomNoRowOverlay from "./AgGridComponents/custom-no-row-overlay";
import CustomLoadingCellRenderer from "./AgGridComponents/CustomLoadingCellRenderer";
import { onApplyPivotView as onApplyPivotViewUtil } from "./pivotUtils/pivotUtils";
import { overrideSystemShortcut } from "../keyboard-shorcuts/utils";
import CustomPagination from "./CustomPagination";
import MessageIcon from "@mui/icons-material/Message";
import { getConversationCount } from "core/commonComponents/ChatSystem/services-chatsystem/custom-services-chat-system";
import {
  setIsAddCommentPopupOpen,
  setIsPanelOpen,
  setTableCommentsData,
} from "./cellComment/cell-comment-services";
import { fetchTableComments, handleCellClick as handleCellCommentClick } from "./cellComment/utils";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import AgGridSearch from "./agGridSearch.jsx";
import IA_DOWNLOAD from "coreAssets/IA_DOWNLOAD.svg";
import ChatButton from "core/commonComponents/ChatSystem/ChatButton";
import { percentFormatter } from "../formatter/index";

const CellCommentPanel = lazy(() => import("./cellComment/cellCommentPanel/CellCommentPanel"));
const CellComment = lazy(() => import("./cellComment/index"))
const ChatSystem = lazy(() => import("core/commonComponents/ChatSystem"));
const FilterPanel = lazy(() => import("./ag-grid-filter-panel/agGridFilterPanel"));
const RowLabelTable = lazy(() => import("./rowLabelTable/RowLabelTable"))
const TableViewPanel = lazy(() => import("./table-view/tableViewPanel"))

const NoCheckBox = () => {
  return null;
};

LicenseManager.setLicenseKey(
  "CompanyName=Impact Analytics,LicensedGroup=31Jan22 Purchase,LicenseType=MultipleApplications,LicensedConcurrentDeveloperCount=1,LicensedProductionInstancesCount=0,AssetReference=AG-025014,ExpiryDate=31_January_2023_[v2]_MTY3NTEyMzIwMDAwMA==e4f58ef1fe10261cf66aa1e5a5cb2da6"
);


/*  Important keys and their function 
_hideSelection  :: pass this key in your rowData at row level it will disable the selection for that row.
hideChildSelection :: to hide selection for all the child rows 
childKey   ::  if you are using server side Model and have client side grouping or tree data. then pass use this key which has child rows data.
*/

const AgGridComponent = (props) => {
  const contentDensityRef = useRef(null);
  const [gridColumns, setGridColumns] = useState([]);
  const { isAddCommentPopupOpen = false } = useSelector(
    (state) => state?.cellCommentReducer ?? {}
  );
  const newEventsCreated = useSelector(
    (state) => state.commonChatReducer?.eventsData?.eventsCreated
  );
  const [agGrid, setAgGrid] = useState({});
  const [prevAction, setPrevAction] = useState("");
  const [checkConfiguration, setCheckConfiguration] = useState([]);
  const selectedRowIds = useRef(new Map());
  const [showSetAll, setShowSetAll] = useState(false);
  const [isSelectAllRecords, setIsSelectAllRecords] = useState(false);
  const selectAllRecordsState = useRef(null);
  const [clientSideTableData, setClientSideTableData] = useState([]);
  const [isTableViewPanelOpen, setIsTableViewPanelOpen] = useState(false);
  const [isRowLabelEnabled, setIsRowLabelEnabled] = useState(false);
  const [appliedRowLabel, setAppliedRowLabel] = useState(false);
  const [rowData, setRowData] = useState([]);
  const [tableFontSize, setTableFontSize] = useState(
);
  const [numericFormat, setNumericFormat] = useState(
  );
  const [isMore, setIsMore] = useState(false);
  const [lastPage, setLastPage] = useState(false);
  const [isOutOfData, setIsOutOfData] = useState(false);
  const [dynamicRowBuffer, setDynamicRowBuffer] = useState(
    props.paginationPageSize || 10
  );
  const dynamicRowBufferRef = useRef(dynamicRowBuffer);
  // Table View
  const [tableViewSettingLoader, setTableViewSettingLoader] = useState(false);
  const [tableViewConfigData, setTableViewConfigData] = useState([]);
  const [tableViewDefaultData, setTableViewDefaultData] = useState([]);
  const [isColumnConfigEdited, setIsColumnConfigEdited] = useState(true);
  const [tableActionProps, setTableActionProps] = useState({ props: {} });
  const isTableConfigSaved = useRef(false);
  const [tableViewName, setTableViewName] = useState(null);
  const sortConfigRef = useRef([]);
  const savedSortConfig = useRef([]);
  const isServerSideCallbackLoading = useRef(false);
  const [isSinglePage, setIsSinglePage] = useState(null);

  //props.excludedValues should contain array of cell values which needs to be excluded after a filter action
  let [filtersExcludedValues, setFiltersExcludedValues] = useState(
    props.excludedValues || []
  );
  const [showComment, setShowComment] = useState({
    showCellCommentButton: false,
    ref: null,
  });
  const [visibleRowIds, setVisibleRowIds] = useState([]);
  const activeEditableCell =
    useSelector((state) => state.tableReducer.activeEditableCell) || false;
  const rowLabelRef = useRef({
    rowFields: [],

    instance: {},

    applied: false,
  });
  const tableInstance = useRef({});
  const globalClasses = globalStyles();
  const dispatch = useDispatch();
  const tableReducer = useRef({});
  const fistTimeColumnResize = useRef(false);

  let {
    hideHeaderCheckboxComponent = false,
    selectAllHeaderComponent,
    updateData,
    rowSelection,
    rowMultiSelectWithClick,
    onSelectionChanged, // event fired when click on checkboxes for row selection, returns columnapi and api
    onRowSelected, // event fired on row selection returns node(row) data
    onEditClick,
    isEditDisabled,
    callDeleteApi,
    isDeleteDisabled,
    onChartClick,
    onReviewClick,
    onImageClick,
    onBlur,
    customFunction,
    handleInlineSearchClearFunc = () => {},
    suppressAggFuncInHeader,
    customizeRowGroupingIcon, // to render diff icons for row expanding and collapsing instead of '>'
    manualCallBack,
    rowModelType,
    cacheOverflowSize,
    maxBlocksInCache, // max number of blocks/pages AG Grid keeps in its internal server-side cache (LRU eviction)
    cacheBlockSize, // number of rows returned per req(for BE pagination start index:0, end index:10, default:100 )
    serverSideStoreType, //values - partial or full
    uniqueRowId,
    loadTableInstance,
    hideSelectCurrentPageRecords = false,
    hideSelectAllRecords = false,
    disableSelectionOnSelectAll = false,
    groupSelectsChildren,
    groupIncludeTotalFooter,
    groupIncludeFooter,
    onApplyCalendarDates, //On Calendar add icon
    autoGroupColumnDef,
    getGroupRowAgg,
    groupHideOpenParents,
    pagination = true,
    domLayout = "autoHeight",
    rowClassRules,
    selectedRows,
    callBackToSetCheckConfig,
    alignedGrids,
    headerHeight,
    masterDetail,
    isRowMaster,
    keepDetailRows,
    tableRef,
    detailCellRenderer,
    detailRowHeight,
    purgeClosedRowNodes,
    customSetAllFields,
    getSubRowsRequest,
    suppressClickEdit,
    getRowStyle,
    uncheckRows,
    lockCellApi,
    lockCellCustomConditionFn,
    lockCellIfNoValue = false,
    defaultTextFieldViewOnly = false,
    customSideBar = [],
    isExternalFilterPresent,
    doesExternalFilterPass,
    showColumnPanel = false,
    customCellRenderer,
    budgetTableChangeFunc,
    handleValidation,
    onToggleChange,
    onCheckBoxChange,
    downloadAsExcel,
    showDownloadTooltip = false,
    customSystemButtonWithDownload = false,
    suppressFieldDotNotation = false,
    tableId,
    onDownloadClick,
    isRowSelectable,
    detailRowAutoHeight = false, //to have the detail grid dynamically change it's height to fit it's rows (Master Detail),
    rowGroupPanelShow,
    minWidth = 150,
    hideRangeFilter = false,
    noEditableCustomCellRender,
    customClass = "",
    optionsForContextMenu,
    groupDefaultExpanded,
    groupRowRendererParams,
    showSaveTableConfig = true,
    showSearchModalBtn = fetchDynamicConfigFromTenantReducer(
      "core",
      "showSearchModalBtn"
    ),
    isGroupOpenByDefault,
    customAggFunction,
    cellValueChanged,
    callBackOnChangeCustomFunction,
    onCellFocused,
    onColumnVisible,
    enableRangeSelection = true,
    processDataFromClipboard,
    processCellForClipboard,
    processHeaderForClipboard,
    processCellCallbackForExcel,
    skipAutoSizeColumn = false,
    isServerSideGroupOpenByDefault,
    // to enable sorting of table columns on click of column header
    sortable = false,
    menuTabs = ["generalMenuTab"],
    skipHeaderOnAutoSize = false,
    enableCustomRowHeight,
    toPrependContent, // used in excel download to prepend or append extra content along with table data
    prependedContentDetails,
    toAppendContent,
    appendContentDetails,
    onPaginationChanged,
    groupHeaderHeight,
    adjustTableHeightServerSide, //used to remove double scroll
    columnToolPanelParams,
    disableTableUam = false,
    skipAutoSizeColumnOnSideBarAction = false,
    applyBudgetTableFormatting,
    applyFormatOnfocus,
    metrics_with_formatter, // plansmart metric formatter config
    valueCache = false,
    customTabFunction,
    onRangeSliderChange,
    budgetTableInputValidation,
    rowDragManaged = false,
    enableTableView = false,
    tableName,
    styleConfig = {},
    sizeColumnsToFitFlag = false,
    showCustomNoRowOverlay = true,
    noRowOverlayMessage = "",
    customRowLabelFunction,
    setIsFilterChanged, // NOTE: To check If the filter is changed as it is required to recalculate Total row inside table
    enablePivot = false,
    setExcludedValues,
    clipboardSettings = {},
    closeSidebarOnLoad = false,
    showSearchHeader = false,
    hideFormatSideBar = false,
    setIsLoading,
    customAggFunctions = {},
    rowDragMultiRow = false, // To Enable and Disable Multi Row Dragging
    agGridPagination = true, // Set this prop to true if custom pagination is not required
    enableCellComment = false,
    isChatEnabled = false,
    showSaveSearchButton = true,
    onInfoClick,
    suppressColumnMoveAnimation = true,
    wrapCellText = false, // To enable celltext wrapping
    autoCellHeight = false,
    wrapHeaderText = false,
    autoHeaderHeight = false,
    customHeaderComponent,
    onColumnGroupOpened,
    tableHeader = null,
    gridRowHeight = "default",
    paginationPageSizeSelector = props?.paginationPageSize
      ? [props?.paginationPageSize]
      : [10, 20],
    uniqueGridId = `grid-id-${Math.random().toString(36).substring(2, 10)}`, // gridId to include a random unique identifier
    hidePaginationPageSizeSelector = true,
    hideTableFormat = false,
    hideTableActions = false,
    suppressContextMenu = false,
    customOnColumnMoved,
    nestedTable,
    nestedTableComponent,
    debounceTime = 3000,
    hideTableSetting = false,
    autoSizeDebounce = false,
    customDateFormatRequired = false,
    hideTableActionsComponents = false,
    hideRowHeightOptionMenu = true,
    explicitlyCloseTableSetting,
    closeTableSettingOnOutsideClick=false,
    enableRowAnimation=true,
    saveTableFormat = false,
    enableHeaderTextWrap=true,
    showSkeletonLoader = false,
    disablePaginationForSinglePage = false,
    disableSkeletonLoader = true
  } = props;
  // allowCustomStyling -> only custom styling from component

  //temporary hotfix , to be removed later
  //saveSearch is not working in assort so hiding the button (quick fix)
  if (window.location.pathname.includes("assort-smart")) {
    showSaveSearchButton = false;
  }
  const {
    enablePaste = false,
    onPasteComplete = () => {},
    pasteType = "single", // 'single', 'multi', 'row', 'column'
  } = clipboardSettings;

  const autoSizeManualClick = useRef(false);

  const isGridExternalFilterPresent = useCallback(() => {
    return props.isExternalFilterPresent
      ? props.isExternalFilterPresent
      : enablePivot
      ? true
      : false;
  }, [filtersExcludedValues]);

  const appDetails = useSelector(
    (state) => state.commonChatReducer?.appDetails
  );

  //Note: doesGridExternalFilterPass only works for client side table
  const doesGridExternalFilterPass = useCallback(
    (node) => {
      try {
        if (props.isExternalFilterPresent && props.doesExternalFilterPass) {
          /**
           * if doesExternalFilterPass is passed through prop
           * the current function will return that function itself, below code after this
           * return statement will not be executed
           */
          return props.doesExternalFilterPass(node);
        } else if (node.data && props.enablePivot) {
          //this code will only be executed if pivot is enabled
          let nodeDataObject = node.data;
          for (const property in nodeDataObject) {
            if (filtersExcludedValues.indexOf(nodeDataObject[property]) >= 0) {
              return false;
            }
          }
        } else if (node.data && !props.enablePivot) {
          /**
           * if pivot is not enabled then below
           * code will be executed where a node will be
           * excluded according to the prop 'excludedValues'
           */
          let nodeDataObject = node.data;
          let excludedValuesKeys = Object.keys(filtersExcludedValues);
          for (const property in nodeDataObject) {
            let indexOfExcludedValue = excludedValuesKeys.indexOf(property);
            let isCurrentValueToBeExcludedAnArray = Array.isArray(
              filtersExcludedValues?.[property]
            );
            if (
              isCurrentValueToBeExcludedAnArray &&
              filtersExcludedValues?.[property].indexOf(
                nodeDataObject[property]
              ) > -1
            ) {
              //this block executes when multiple values for a column needs to be excluded
              return false;
            } else if (
              indexOfExcludedValue > -1 &&
              filtersExcludedValues?.[property] ===
                nodeDataObject[excludedValuesKeys[indexOfExcludedValue]]
            ) {
              //this block executes when a single value for a column needs to be excluded
              return false;
            }
          }
        }
        return true;
      } catch (error) {
        console.error("doesGridExternalFilterPass error", error);
      }
    },
    [filtersExcludedValues]
  );

  const noRowsOverlayComponent = useMemo(() => {
    return CustomNoRowOverlay;
  }, []);
  const noRowsOverlayComponentParams = useMemo(() => {
    return {
      noRowsMessageFunc: () => {
        if (!isEmpty(noRowOverlayMessage)) {
          return noRowOverlayMessage;
        } else if (
          props.filterReducer?.isFilterApplied &&
          isEmpty(noRowOverlayMessage)
        ) {
          return "No data applicable for selected filters";
        } else {
          return "Please select filter(s) to view data";
        }
      },
    };
  }, [props.filterReducer?.isFilterApplied]);

  const handleInlineSearchClear = (params) => {
    try {
      setTimeout(() => {
        let rowCount = params.api.getDisplayedRowCount();
        if (rowCount >= 0) {
          params.api.hideOverlay();
        } else {
          params.api.showLoadingOverlay();
        }
      }, 100);
      const column = params.column.colId;
      const key = params?.api?.gridOptionsWrapper?.domDataKey;
      tableInstance.current.api.colToDelete = column;
      tableInstance.current.api.tableKey = key;
      if (handleInlineSearchClearFunc) {
        handleInlineSearchClearFunc(params);
      }
    } catch (error) {
      console.error("handleInlineSearchClear error", error);
    }
  };

  useEffect(() => {
    return () => {
      props.setLastSearchType(null);
    };
  }, []);

  useEffect(() => {
    return () => {
      props.setLastSearchType(null);
    };
  }, []);

  useEffect(() => {
    return () => {
      props.setLastSearchType(null);
    };
  }, []);

  useEffect(() => {
    return () => {
      props.setLastSearchType(null);
    };
  }, []);

  useEffect(() => {
    return () => {
      props.setLastSearchType(null);
    };
  }, []);

  useEffect(() => {
    agGrid?.api?.onFilterChanged();
    let allRowData = [];
    agGrid?.api?.forEachNodeAfterFilter((node) => {
      allRowData = [...allRowData, node.data];
    });
    setRowData(allRowData);
    agGrid?.api?.redrawRows();
  }, [filtersExcludedValues]);

  useEffect(() => {
    const getTableViewDefaultData = async (tableName) => {
      try {
        const defaultTableViewConfiguration = await getDefaultTableViewConfigData(
          tableName
        );
        setTableViewDefaultData(defaultTableViewConfiguration);
      } catch (error) {
        console.log("Error in Default table view data", error);
      }
    };
    if (enableTableView && tableName) {
      getTableViewDefaultData(tableName);
    }
  }, []);

  useEffect(() => {
    if (!isEmpty(agGrid)) {
      fistTimeColumnResize.current = false;
      resizeGridColumns(agGrid);
    }
  }, [gridColumns]);

  const resizeGridColumns = (params) => {
    if (!skipAutoSizeColumn) {
      setGridColumnWidth(params, false, sizeColumnsToFitFlag);
    }
  };

  const updateSinglePageFlag = (totalRows) => {
    if (isNil(totalRows)) return;
    if (!disablePaginationForSinglePage) {
      setIsSinglePage(false);
      return;
    }
    setIsSinglePage(totalRows <= (props.paginationPageSize || 10));
  };
  const getSubRowsData = async (params) => {
    let childRowsKey = props.childKey ? props.childKey : "subRows";
    if (getSubRowsRequest) {
      return await getSubRowsRequest(params);
    } else {
      let subRows =
        params.parentNode.data[childRowsKey]?.slice(
          params.request.startRow,
          params.request.endRow
        ) || null;

      if (subRows && (isChatEnabled)) {
        subRows = subRows.map((row) => ({
          ...row,
          extraData: chatExtraData,
        }));
      }

      return {
        data: subRows,
        totalCount: params.parentNode.data[childRowsKey]?.length || 0,
      };
    }
  };

  useEffect(() => {
    if (!isNil(props.rowdata)) {
      setRowData(props.rowdata);
      if (!disableTableUam && props.tenantTableUamConfig) {
        setClientSideTableData(
          filterAccessibleTableData(props.rowdata, props.userAccessList)
        );
      } else {
        setClientSideTableData(props.rowdata);
      }
      if (
        props?.rowdata?.length > 0 &&
        (enableCellComment || isChatEnabled) &&
        uniqueRowId
      ) {
        const rowIds = props.rowdata.map((data) => ({
          component_id: String(data?.[uniqueRowId]),
        }));

        setVisibleRowIds(props.rowdata.map((data) => data?.[uniqueRowId]));

        (async () => {
          try {
            let processedData;

            if (isChatEnabled) {
              const chatData = await getConversationCount({
                components: rowIds,
                component_type: tableName,
                application_code: appDetails?.applicationCode,
                screen_code: appDetails?.screenCode,
              });

              if (chatData?.status && !isEmpty(chatData.data)) {
                const componentDataCount = chatData.data.components;

                processedData = props.rowdata.map((data) => ({
                  ...data,
                  extraData: {
                    chatCount:
                      componentDataCount[data[uniqueRowId]]?.comments_count ??
                      0,
                    totalEventsCount:
                      componentDataCount[data[uniqueRowId]]
                        ?.total_events_count ?? 0,
                    resolvedEventsCount:
                      componentDataCount[data[uniqueRowId]]
                        ?.resolved_events_count ?? 0,
                    eventsFound:
                      componentDataCount[data[uniqueRowId]]?.events_found ??
                      false,
                    tableName,
                    uniqueRowId,
                  },
                }));
              }
            }
            if (!processedData && enableCellComment) {
              processedData = props.rowdata.map((data) => ({
                ...data,
                extraData: { tableName, uniqueRowId },
              }));
            }
            setClientSideTableData(processedData);
            tableInstance?.current?.api?.redrawRows()
          } catch (error) {
            console.error("Error fetching chat data", error);
          }
        })();
      }
      updateSinglePageFlag(props.rowdata?.length || 0);
    }
  }, [props.rowdata]);

  const deSelectAllRows = (value, instance, hideSelectAllIcon) => {
    if (hideSelectAllIcon) {
      instance.api.deselectAll(value);
      selectAllRecordsState.current(true, instance);
    } else {
      instance.api.deselectAll(value);
    }
  };

  /**
   * @func
   * @desc Updating Object with required searchable parameters
   * @param {Object} columns
   * @param {String} parentLabel
   */
  const defineSearchableParams = (columns, parentLabel) => {
    columns.forEach((column) => {
      if (column.is_searchable) {
        column.floatingFilter = false;
      }
      if (column.sub_headers?.length) {
        defineSearchableParams(column.sub_headers, column.label);
      } else {
        column.searchableLabel = parentLabel + "-" + column.label;
      }
    });
  };

  useEffect(() => {
    if (!isEmpty(agGrid)) {
      // to fetch filters applied on table
      let filtersModal = agGrid.api.getFilterModel();
      // Setting a prop - checkAll to indicate if select all records check is active or not
      agGrid.api.prevAction = prevAction;
      agGrid.api.checkConfiguration = checkConfiguration;
      agGrid.api.filteredCheckAll = Object.keys(filtersModal).length
        ? true
        : false;
      let agGridCopy = agGrid;
      setAgGrid(agGridCopy);
      setTableActionProps({
        props: {
          ...agGridCopy,
          ...props,
          showSaveTableConfig,
          isTableConfigSaved,
        },
      });
      agGrid.api.isSelectAllRecords = isSelectAllRecords;
      agGrid.api.reConciledSelectedRowIds = selectedRowIds?.current;
      if (disableSelectionOnSelectAll) {
        agGrid.api.refreshCells({
          force: true,
          column: ["Selection"],
        });
      }
    }
  }, [agGrid, prevAction, checkConfiguration, isSelectAllRecords]);

  useEffect(() => {
    setTableActionProps({
      props: {
        ...tableActionProps.props,
        numericFormat
      },
    });
  }, [numericFormat]);

  useEffect(() => {
    // resetting the table format to default on component unmount
    return resetActions();
  }, []);
  const resetActions = () => {
    setTableFontSize(defaultToolPanelFormat.DEFAULT_FONT_SIZE);
    setNumericFormat(defaultToolPanelFormat.DEFAULT_NUMBER_FORMAT);
  };

  const prepareMetaPayload = (params, api) => {
    const { filterModel, sortModel } = params;
    let toSearchKeys = [],
      toSortKey = [],
      toRangeKey = [];
    if (!isEmpty(filterModel)) {
      // Append tp-active to handle hight of active sideBar action.
      api?.sideBarComp?.sideBarButtonsComp?.buttonComps?.forEach((button) => {
        if (button.toolPanelDef.id === "table-actions") {
          button.eGui?.classList.add("tp-active");
        }
      });
      let keyList = Object.keys(filterModel);
      keyList.forEach((filterKey) => {
        //If the filterColumnType is number, we parse the filterBody into range field
        if (
          filterModel[filterKey].filterType === "number" ||
          filterModel[filterKey].filterType === "date"
        ) {
          toRangeKey.push(
            parseRangeBody(filterKey, filterModel, showSearchModalBtn)
          );
        } else {
          //Else we parse the filterBody into search field
          // trimming for trailing comma (",") and blank space
          let patternText = filterModel[filterKey].filter?.replace(
            /[,\s]*$/,
            ""
          );
          let filterConfig = api.columnModel.columnDefs.filter(
            (col) => col.accessor == filterKey
          )?.[0];
          const listType = "list" == filterConfig?.type;
          const ignoreSpecialCharacterConversion = Boolean(
            filterConfig?.extra?.ignoreSearchSpecialCharacters
          );
          if (filterModel[filterKey].filterType === "set") {
            patternText = filterModel[filterKey].values;
          }
          if (filterModel[filterKey].filterType === "text") {
            patternText =
              patternText.indexOf(",") < 0
                ? ignoreSpecialCharacterConversion
                  ? patternText
                  : replaceSpecialCharsInSearchPattern(patternText)
                : patternText
                    .split(",")
                    .map((pattern) => {
                      return ignoreSpecialCharacterConversion
                        ? pattern
                        : replaceSpecialCharsInSearchPattern(pattern);
                    })
                    .join(",");
          }
          // extra json_parent check
          let extraJsonParentString = "";
          api.columnModel.columnDefs.forEach((column) => {
            if (column.accessor === filterKey) {
              extraJsonParentString = column.extra?.json_parent;
            } else if (column.sub_headers?.length) {
              // check for sub headers if they have json_parent
              column.sub_headers.forEach((subColumn) => {
                if (subColumn.accessor === filterKey) {
                  extraJsonParentString = subColumn.extra?.json_parent;
                }
              });
            }
          });
          toSearchKeys.push({
            column: !isEmpty(extraJsonParentString)
              ? `${extraJsonParentString}${"->>'"}${filterKey + "'"}`
              : filterKey,
            pattern: patternText,
            ...(showSearchModalBtn && {
              search_type: filterConfig?.extra?.search_type || filterModel[filterKey].type,
            }),
            ...(listType && {
              type: "list",
            }),
          });
        }
      });
    } else {
      api?.sideBarComp?.sideBarButtonsComp?.buttonComps?.forEach((button) => {
        if (button.toolPanelDef.id === "table-actions") {
          button.eGui?.classList.remove("tp-active");
        }
      });
    }
    if (sortModel.length) {
      toSortKey = [
        {
          column: sortModel[0]?.colId,
          order: sortModel[0]?.sort || [],
        },
      ];
    }

    toSearchKeys = toSearchKeys.map((searchKey) => {
      return {
        ...searchKey,
        column: getTypeCastInfoForSearchAndSort(
          api?.columnModel?.columnDefs || [],
          searchKey["column"]
        ),
      };
    });

    toRangeKey = toRangeKey.map((rangeKey) => {
      return {
        ...rangeKey,
        column: getTypeCastInfoForSearchAndSort(
          api?.columnModel?.columnDefs || [],
          rangeKey["column"]
        ),
      };
    });

    toSortKey = toSortKey.map((sortKey) => {
      return {
        ...sortKey,
        column: getTypeCastInfoForSearchAndSort(
          api?.columnModel?.columnDefs || [],
          sortKey["column"]
        ),
      };
    });
    return {
      search: toSearchKeys,
      range: toRangeKey,
      sort: toSortKey,
    };
  };

  const updateRowsWithChatData = async (rows, gridApi) => {
    if (
      !rows?.length ||
      !tableName ||
      !uniqueRowId ||
      (!isChatEnabled && !enableCellComment)
    ) {
      return;
    }
    const rowIds = [];
    const nodesToUpdate = [];
    let chatData = null;

    if (isChatEnabled && appDetails) {
      try {
        const response = await getConversationCount({
          components: rows.map((row) => ({
            component_id: String(row[uniqueRowId]),
          })),
          component_type: tableName,
          application_code: appDetails.applicationCode,
          screen_code: appDetails.screenCode,
        });
        chatData =
          response.status && response.data ? response.data.components : null;
      } catch (error) {
        console.error("Error fetching chat data:", error);
      }
    }

    rows.forEach((row) => {
      const node = gridApi.getRowNode(String(row[uniqueRowId]));
      if (!node) return;
      rowIds.push(String(row[uniqueRowId]));
      const extraData = {
        ...node.data.extraData,
        tableName,
        uniqueRowId,
        totalEventsCount:0,
      };

      if (chatData?.[row[uniqueRowId]]) {
        const counts = chatData[row[uniqueRowId]];
        extraData.chatCount = counts.comments_count || 0;
        extraData.eventCount = counts.events_count || 0;
        extraData.totalEventsCount = counts.total_events_count || 0;
        extraData.resolvedEventsCount = counts.resolved_events_count || 0;
        extraData.eventsFound = counts.events_found || false;
      }

      node.data = { ...node.data, extraData };
      nodesToUpdate.push(node);
    });
    if (nodesToUpdate.length > 0) {
      gridApi.refreshCells({
        rowNodes: nodesToUpdate,
        force: true,
        suppressFlash: false,
      });
    }
    setVisibleRowIds(rowIds);
  };

  const datasource = {
    getRows: async (params) => {
      isServerSideCallbackLoading.current = true;
      const { startRow, groupKeys } = params.request;

      let body = prepareMetaPayload(params.request, params.api);

      if (body["search"].length !== 0 && params.api.checkAll) {
        // setting to true - if filters are present and the number of filtered records are more than 10,
        // next page records should be selected
        params.api.checkAll = true;
        params.api.filteredCheckAll = true;
        setAgGrid(params);
      }

      if (params.api.filteredCheckAll && body["search"].length === 0) {
        params.api.checkAll = false;
        setAgGrid(params);
      }

      params.api.gridOptionsWrapper.gridOptions.rowBuffer =
        dynamicRowBufferRef.current;
      let dynamicCache = !agGridPagination
        ? params?.api?.gridOptionsWrapper?.gridOptions?.cacheBlockSize
        : props.cacheBlockSize;

      let page = startRow / dynamicCache || 0;
      // wait until data is fetched to display in the table
      // calls respective table data api

      let paginatedRows = {};
      if (groupKeys.length > 0) {
        paginatedRows = await getSubRowsData(params);
      } else {
        // Update tableInstance with latest filter data to be accessed via Instance Object on change of filters
        params.api.gridOptionsWrapper.gridOptions.filterBody = body;
        paginatedRows = await params.api.gridOptionsWrapper.gridOptions.context.manualCallBack(
          body,
          page,
          params
        );
      }
      // params - rowData [], rowCount - num (total num of rows), if not present displays "more" instead of count
      // If a user does not provide a total count and has exhausted the data after paginating to the last page,
      // pass total num of records to set total number of pages to disable the next button
      if (!("totalCount" in paginatedRows) || !paginatedRows?.totalCount) {
        setIsMore(true);
      }
      if (
        paginatedRows?.data?.length === 0 ||
        // out of data - set to true from backend when last data set has reached
        paginatedRows?.outOfData
      ) {
        setIsOutOfData(true);
        setIsMore(false); // set to false as now we have total number of rows.
        /*
          When the data is exhausted we navigate the user back to the previous page, disable the next button by 
          setting the count based on number of rows that have the "data" key within them and update the total count
        */
        let rowCount = 0;
        // Adding a condition here as "no records" msg is displayed on the table along with table records when we force the user to navigate to previous page with records.
        // The message will be shown only when the data is empty and on initial page, i.e page 0
        if (params.api.paginationGetCurrentPage() === 0) {
          isServerSideCallbackLoading.current = false;
          params.api.showNoRowsOverlay();
        }
        params.api.forEachNode((node) => {
          if (
            "data" in node &&
            !node?.parent?.rowIndex &&
            node?.parent?.rowIndex !== 0
          )
            rowCount++;
        });
        params.api.paginationGoToPreviousPage();
        params.successCallback(paginatedRows.data, rowCount);
        updateSinglePageFlag(rowCount);
      }
      // to prevent loading issue - renders only rows with data. Total count is added in the condition to navigate to last page with proper page count
      else if (
        paginatedRows?.data?.length < dynamicCache &&
        !paginatedRows?.totalCount
      ) {
        if (!disableTableUam && props.tenantTableUamConfig) {
          paginatedRows.data = filterAccessibleTableData(
            paginatedRows.data,
            props.userAccessList
          );
        }
        setLastPage(true);
        setIsMore(false); // set to false as now we have total number of rows.
        params.api.hideOverlay();
        let rowCount = 0;
        params.api.forEachNode((_node) => {
          if (!_node?.parent?.rowIndex && _node?.parent?.rowIndex !== 0)
            rowCount++;
        });
        params.successCallback(
          paginatedRows.data,
          paginatedRows.data?.length !== rowCount
            ? // On reaching the last page, the first record of last page's paginatedRows set is added into existing row count, hence the count increases by 1.
              // As there is an issue with total num of rows fetched and rowcount, we add the two of them and subtract by 1 to avoid mismatch in total count
              paginatedRows.data?.length + rowCount - 1
            : rowCount
        );
        updateSinglePageFlag(paginatedRows.data?.length !== rowCount
           ? paginatedRows.data?.length + rowCount - 1
           : rowCount
        );
      } else {
        if (!disableTableUam && props.tenantTableUamConfig) {
          paginatedRows.data = filterAccessibleTableData(
            paginatedRows.data,
            props.userAccessList
          );
        }
        setLastPage(false);
        setIsOutOfData(false);
        params.api.hideOverlay();
        await params.successCallback(
          paginatedRows?.data,
          paginatedRows?.totalCount
        );
        updateSinglePageFlag(paginatedRows?.totalCount);
      }
      let allRowData = [];
      // serverside paginated table should have unique column and it's id should be passed as prop to AgGridComponent.
      await params.api.forEachNode((node) => {
        allRowData = [...allRowData, node.data];
        let data = paginatedRows?.data?.map((val) => val?.[uniqueRowId]);
        if (data?.includes(node?.data?.[uniqueRowId])) {
          if (
            disableSelectionOnSelectAll &&
            (params.api.isSelectAllRecords || isSelectAllRecords)
          ) {
            node.setSelected(
              Boolean(params.api.isSelectAllRecords || isSelectAllRecords)
            );
          } else if (
            node?.data?.is_selected &&
            !node?.data?.checkbox_disabled
          ) {
            node.setSelected(true);
          } else {
            node.setSelected(false);
          }
        }
      });
      setRowData(allRowData);

      if ((isChatEnabled || enableCellComment) && paginatedRows?.data?.length > 0 && !groupKeys?.length) {
        updateRowsWithChatData(paginatedRows.data, params.api);
      }

      isServerSideCallbackLoading.current = false;
      if(autoSizeDebounce) setGridColumnWidth(params, false, sizeColumnsToFitFlag);
    },
  };
  // datasource for inifinte scrolling

  const createDatasource = (p_api) => {
    return {
      rowCount: undefined,
      getRows: async (params) => {
        const { startRow } = params;
        let body = prepareMetaPayload(params, p_api.api);
        let page = startRow / props.cacheBlockSize;
        let rowData = await p_api.api.gridOptionsWrapper.gridOptions.context.manualCallBack(
          body,
          page,
          p_api
        );
        if (!rowData.data.length) {
          if (startRow === 0) p_api.api?.showNoRowsOverlay();
        } else {
          p_api.api?.hideOverlay();
        }
        const lastRow =
          rowData.data.length < gridOptions.cacheBlockSize
            ? params.startRow + rowData.data.length
            : -1;
        params.successCallback(rowData.data, lastRow);
        // serverside paginated table should have unique column and it's id should be passed as prop to AgGridComponent.
        await p_api.api.forEachNode((node) => {
          let data = rowData?.data?.map((val) => val?.[uniqueRowId]);
          if (data?.includes(node?.data?.[uniqueRowId])) {
            if (
              disableSelectionOnSelectAll &&
              (p_api.api.isSelectAllRecords || isSelectAllRecords)
            ) {
              node.setSelected(
                Boolean(p_api.api.isSelectAllRecords || isSelectAllRecords)
              );
            } else if (node?.data?.is_selected) {
              node.setSelected(true);
            } else {
              node.setSelected(false);
            }
          }
        });
      },
    };
  };
  const isServerSideGroup = useCallback((dataItem) => {
    // indicate if node is a group
    if (props.checkParentGroupkey) {
      return dataItem[props.checkParentGroupkey];
    } else {
      return dataItem[props.childKey] || dataItem.subRows;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updatedTableConfig = useRef({});
  useEffect(() => {
    updatedTableConfig.current = props.tableConfig;
  }, [props.tableConfig]);

  const updatedTableShortcuts = useRef({});
  useEffect(() => {
    updatedTableShortcuts.current = props.keyboardShortcuts?.table;
  }, [props.keyboardShortcuts]);

  const dispatchKeyboardTableAction = (key, payload, tableKey) => {
    let formattedPayload = {};
    const selectType =
      updatedTableConfig.current?.keyboardShortcut?.perfromShortcutAction?.[
        payload.selectType
      ] || false;
    formattedPayload = {
      [payload.selectType]: !Boolean(selectType),
    };

    dispatch(setKeyboardTableAction(key, formattedPayload, tableKey));
  };

  //it updates tab code(0->general search, 1->advanced search) in table reducer based on keyboard shortcut pressed
  const updateSearchTabCode = (domDataKey, tabCode) => {
    let payload = {};

    const {
      tableSearchConfig = {},
      recentTableConfig = {},
    } = updatedTableConfig.current;

    // If recentTableConfig is empty, use tableSearchConfig to update search preferences
    if (Object.keys(recentTableConfig).length === 0) {
      // Update search preferences from tableSearchConfig
      const searchPref = cloneDeep(tableSearchConfig?.search_preference || {});
      payload = {
        search_preference: searchPref,
        tab_code: tabCode,
      };
      // Clear search text if different search popup is opened
      if (
        payload?.search_preference?.search?.length &&
        tableSearchConfig?.tab_code !== tabCode
      ) {
        payload.search_preference.search.forEach((item) => {
          item.pattern = "";
        });
      }
    } else {
      // Otherwise, update only the tab_code in recentTableConfig
      payload = {
        ...(recentTableConfig?.[domDataKey] || {}),
        tab_code: tabCode,
      };
      // Clear search text if different search popup is opened
      if (
        payload?.search_preference?.search?.length &&
        recentTableConfig?.[domDataKey]?.tab_code !== tabCode
      ) {
        payload.search_preference.search.forEach((item) => {
          item.pattern = "";
        });
      }
    }

    // Dispatch the updated payload
    dispatch(setTableRecentChanges(domDataKey, payload));
  };

  /**
   * @function
   * @description Method to reset table recentSearchChanges
   * @param {Object} params
   */
  const resetRecentSearchChanges = (params) => {
    if (params?.api?.gridOptionsWrapper?.domDataKey) {
      dispatch(
        setTableRecentChanges(params?.api?.gridOptionsWrapper?.domDataKey, {})
      );
    }
  };

  const defaultProcessDataFromClipboard = (params) => {
    params.api.stopEditing(); // if cell is in edit mode then stop editing do the changes and flash

    // Extracting the pasted data into rows and columns(2D Array)
    let dataRows = params.data;
    const allColumns = params.columnApi.getAllDisplayedColumns();
    const rowCount = params.api.getDisplayedRowCount();

    // Identify the focused cell and update it's value
    const focusedCell = params.api?.getFocusedCell();
    if (!focusedCell || (dataRows?.length && !dataRows[0][0]?.length)) {
      return;
    }
    const startRowIndex = focusedCell?.rowIndex;
    const startColIndex = allColumns?.findIndex(
      (col) => col.getColId() === focusedCell?.column?.getColId()
    );

    // Determine the correct row node based on whether the row is pinned or not
    const getRowNode = (rowIndex, rowPinned) => {
      if (rowPinned === "top") {
        return params.api.getPinnedTopRow(rowIndex);
      }
      if (rowPinned === "bottom") {
        return params.api.getPinnedBottomRow(rowIndex);
      }
      return params.api.getDisplayedRowAtIndex(rowIndex);
    };

    // Store updated cells for batch refresh
    const updatedRowNodes = new Set();
    const updatedColumns = new Set();

    const processCellUpdate = (cellValue, targetRowIndex, targetColIndex) => {
      if (targetRowIndex >= rowCount || targetColIndex >= allColumns?.length) {
        return; // Skip if the target cell is out of grid bounds
      }

      const rowNode = getRowNode(targetRowIndex, focusedCell.rowPinned);
      const column = allColumns[targetColIndex];

      if (rowNode && column?.colDef?.is_editable) {
        const columnId = column.getColId();
        const formattedCellValue = column.colDef.valueParser
          ? column.colDef.valueParser({ newValue: cellValue })
          : cellValue;

        rowNode.setDataValue(columnId, formattedCellValue);

        updatedRowNodes.add(rowNode);
        updatedColumns.add(columnId);
      }
    };

    try {
      // Handle the iteration based on pasteType
      switch (pasteType) {
        case "single":
          // Only process the first cell in the data
          processCellUpdate(dataRows[0][0], startRowIndex, startColIndex);
          break;

        case "multi":
          // Process the entire 2D array (multi-cell paste)
          dataRows.forEach((dataRow, rowIndex) => {
            dataRow.forEach((cellValue, colIndex) => {
              processCellUpdate(
                cellValue,
                startRowIndex + rowIndex,
                startColIndex + colIndex
              );
            });
          });
          break;

        case "column":
          // Process only the first column (vertical column paste)
          dataRows.forEach((dataRow, rowIndex) => {
            processCellUpdate(
              dataRow[0],
              startRowIndex + rowIndex,
              startColIndex
            );
          });
          break;

        case "row":
          // Process only the first row (horizontal row paste)
          dataRows[0].forEach((cellValue, colIndex) => {
            processCellUpdate(
              cellValue,
              startRowIndex,
              startColIndex + colIndex
            );
          });
          break;

        default:
          console.warn(`Unknown pasteType: ${pasteType}`);
          return;
      }
    } catch (error) {
      console.error("Error during paste operation:", error);
    }

    // Refresh and flash updated cells
    params.api.refreshCells({
      rowNodes: Array.from(updatedRowNodes),
      columns: Array.from(updatedColumns),
      force: true,
    });

    params.api.flashCells({
      rowNodes: Array.from(updatedRowNodes),
      columns: Array.from(updatedColumns),
    });

    // Execute the paste complete callback
    onPasteComplete(params, updatedRowNodes, updatedColumns);
  };

  /**
   * @function
   * @description Process data before copying to clipboard
   * @param {Object} params
   * @returns {Number}
   */
  const processCellData = (params) => {
    try {
      let val = params.value;
      if (params.column.colDef.type === "trend") {
        const value = params.value;
        const current = Number(value?.current);
        const previous = Number(value?.previous);
        // Add unicode arrows to represent trends
        if (current > previous) {
          return `${previous} ↑ ${current}`; // Unicode up arrow
        } else if (current < previous) {
          return `${previous} ↓ ${current}`; // Unicode down arrow
        } else {
          return `${previous} → ${current}`; // Unicode right arrow
        }
      }
      if (
        ["int", "percentage", "float", "dollar"].includes(
          params.column.colDef.type
        ) &&
        !params?.api?.gridOptionsWrapper?.gridOptions
          ?.noEditableCustomCellRender
      ) {
        let roundOffTo = 2;
        switch (params.column.colDef.formatter) {
          case "roundOff":
            roundOffTo = 0;
            break;
          case "roundOfftoOneDecimals":
            roundOffTo = 1;
            break;
          case "roundOfftoThreeDecimals":
            roundOffTo = 3;
            break;
          default:
            roundOffTo = 2;
            break;
        }
        let colDef = params?.column?.colDef;
        if (colDef?.type === "percentage") {
          val = percentFormatter(
            params,
            roundOffTo,
            colDef?.is_editable ||
              colDef?.multiplier ||
              colDef?.extra?.multiplier
              ? true
              : false, //for footer we don't want to multiply it by 100 so passing true
            colDef?.extra?.displayBlank
          );
        } else {
          val = decimalsFormatter(params, roundOffTo);
        }
      }

      return val;
    } catch (error) {
      console.log("processCellData error", error);
    }
  };

  const throttledDisplaySnackMessages = throttle((message, type) => {
    displaySnackMessages(message, type, dispatch);
  }, 5000);

  const getPinnedColumnsWidth = (columnApi) => {
    const pinnedLeftColumns = columnApi.getDisplayedLeftColumns();
    return pinnedLeftColumns?.reduce((totalWidth, column) => {
      return totalWidth + column.getActualWidth();
    }, 0);
  };

  const checkViewPortOnColumnResized = debounce((params) => {
    const { columnApi, api } = params;

    // Calculate the total width of pinned columns
    const pinnedWidth = getPinnedColumnsWidth(columnApi);

    // Get the visible viewport width using the DOM
    const gridElement = api.gridBodyCtrl.eBodyViewport;
    const viewportWidth = gridElement?.offsetWidth || 0;

    // Block resizing if pinned columns exceed 90% of the visible viewport width
    if (
      viewportWidth &&
      pinnedWidth > viewportWidth * PINNED_VIEWPORT_THRESHOLD
    ) {
      // Block resizing and show a warning message if resizing is triggered by user's manual click or drag and not due to grid re-rendering
      if (autoSizeManualClick.current || params.source !== "api") {
        throttledDisplaySnackMessages(
          "Freezed columns' width limit reached. Unfreeze or resize existing columns to proceed.",
          "error"
        );
      }
      //currently it blocks both kind of resize i.e. "autosize" and "manual resize via dragging column", following condition can be uncommented to unblock autosize
      columnApi.resetColumnState(); // Optionally reset the column to its previous size
      autoSizeManualClick.current = false;
      return true; // Return true to indicate the action was blocked and stop propagation
    }
    autoSizeManualClick.current = false;
    return false; // Return false if the action is allowed
  }, 100);

  const gridOptions = {
    localeText: {
      noRowsToShow:
        "No Data available. Please select the filter(s) to view the data.",
    },
    debounceVerticalScrollbar: true,
    defaultColDef: {
      singleClickEdit: true, // edit cell gets highlighted on single click
      resizable: true,
      // on click of column label, columns gets sorted in respective order i.e. ascending, descending, none
      sortable: sortable,
      onCellValueChanged: (e) => {
        if (cellValueChanged) {
          cellValueChanged(e);
        }
      },
      onCellFocused: (e) => {
        onCellFocused(e);
      },
      //This custom comparator will override the exisiting aggrid's sort function
      //Existing aggrid sort function is sorting by first all caps and then lower case letters
      //are being sorted. To avoid this, we are using localCompare function for strings
      //If it is not string, we use normal relational operator comparision
      comparator: (a, b) =>
        typeof a === "string" && isNaN(+a) && a != "-" && b != "-"
          ? a.localeCompare(b)
          : customCompare(a, b),
      menuTabs,
      suppressKeyboardEvent: (params) => {
        if (
          handleCustomKeyboardShortcuts(
            params,
            displaySnackMessages,
            updateSearchTabCode,
            dispatchKeyboardTableAction,
            updatedTableShortcuts,
            tableReducer?.current?.activeEditableCell,
            dispatch
          )
        ) {
          overrideSystemShortcut(params.event);
          return true;
        }
        //other key events can be handled here

        return suppressAgGridKeyboardEvents(
          params,
          tableReducer?.current?.activeEditableCell
        ); // Return false to allow AG Grid default keyboard shortcuts
      },
    },
    suppressMenuHide: true,
    rowSelection: rowSelection,
    rowBuffer: props.paginationPageSize ? props.paginationPageSize : 10,
    onGridReady: (params) => {
      // passing grid api's to parent on page load
      setAgGrid(params);
      let instance = params;
      let sideButtons = document.querySelector(".ag-side-buttons");
      // adding custom action on deselectAll event api to call refreshHeader
      const originalDeselectAll = instance.api.deselectAll;
      instance.api.deselectAll = () => {
        originalDeselectAll.apply(instance?.api);
        // setting isSelectAllRecords as false
        setIsSelectAllRecords(false);
        instance?.api?.refreshHeader();
      };
      instance.trigerSetAll = (flag) => setShowSetAll(flag);
      instance.api.setCheckConfiguration = (value) =>
        setCheckConfiguration(value);
      instance.api.setPrevAction = (value) => setPrevAction(value);
      instance.api.resizeGridColumns = (params) => resizeGridColumns(params);
      if (loadTableInstance) loadTableInstance(instance);
      tableInstance.current = instance;
      if (callBackToSetCheckConfig)
        callBackToSetCheckConfig(setCheckConfiguration);
      if (rowModelType === "serverSide")
        params.api.setServerSideDatasource(datasource);
      if (rowModelType === "infinite")
        params.api.setDatasource(createDatasource(params));

      params.api.forEachNode((node) => {
        if (
          disableSelectionOnSelectAll &&
          (params.api.isSelectAllRecords || isSelectAllRecords)
        ) {
          node.setSelected(
            Boolean(params.api.isSelectAllRecords || isSelectAllRecords)
          );
        } else if (node?.data?.is_selected) {
          node.setSelected(true);
        } else {
          node.setSelected(false);
        }
      });
      if (closeSidebarOnLoad) {
        agGrid.api.closeToolPanel();
      }
      instance.api.resetRecentSearchChanges = () =>
        resetRecentSearchChanges(params);
      instance.api.addEventListener(
        "columnMoved",
        customOnColumnMoved
          ? customOnColumnMoved
          : (event) => {
              const updatedGridColumnDef = params.api.getColumnDefs();
              params.api.setColumnDefs(updatedGridColumnDef);
            }
      );

      // Listen for the columnPinned event
      instance.api.addEventListener("columnPinned", function (event) {
        if (event.source !== "api") {
          const pinType = event.pinned === "left" ? "left" : null;
          freezeColumn(
            event.api,
            event.columnApi,
            event.column || event.columns[0],
            pinType,
            displaySnackMessages,
            dispatch
          );
        }
      });
      instance.api.showSearch = false;
      populateSortConfig(instance, sortConfigRef, savedSortConfig);
    },
    // To make AG-Grid have fluid layout
    // The following will run when the grid first loads/ or data adjusts and when the grids size changes.
    onGridSizeChanged: (params) => {
      if (!fistTimeColumnResize.current) {
        resizeGridColumns(params);
        fistTimeColumnResize.current = true;
      }
    },
    onFirstDataRendered: (params) => {
      if (isEmpty(sortConfigRef.current)) {
        setTimeout(() => {
          populateSortConfig(params, sortConfigRef, savedSortConfig);
        }, 1000);
      }
      if (sizeColumnsToFitFlag) {
        params.api.sizeColumnsToFit();
      }
      setGridColumnWidth(params, false, sizeColumnsToFitFlag);
      if (props.onFirstDataRender) {
        props.onFirstDataRender(params);
      }
    },
    onSortChanged: (params) => onSortChangedHandler(params, sortConfigRef),
    rowMultiSelectWithClick: true,
    // setting unique id on tables for performing selection on server/client side
    getRowId: (params) => {
      let data = params.data;
      return params.level === 0 && uniqueRowId ? data[uniqueRowId] : null;
    },
    suppressClickEdit: suppressClickEdit,
    getRowStyle: !styleConfig.rowStyles?.length
      ? getRowStyle
      : (params) => {
          let rowStyles = (getRowStyle && getRowStyle(params)) || {};
          styleConfig.rowStyles.forEach((styleObject) => {
            const val = styleObject.styleFunction(params);
            rowStyles = {
              ...rowStyles,
              ...(styleObject.applyStylesFromFunction && val
                ? val
                : val
                ? styleObject.style
                : {}),
            };
          });
          return {
            ...rowStyles,
          };
        },
    onRowDragMove: props?.onRowDragMove,
    groupHeaderHeight: groupHeaderHeight,
    onModelUpdated: props?.callOnModelUpdated,
    onColumnResized: checkViewPortOnColumnResized,
    onColumnGroupOpened: onColumnGroupOpened ? onColumnGroupOpened : columnGroupOpenHandler,
    columnTypes: COLUMN_TYPES,
    context: {
      customDateFormatRequired: customDateFormatRequired,
    },
  };

  let adjustableDiv = document.getElementsByClassName("ag-center-cols-clipper");
  //Set min-height of table dynamically if there are 1 or 2 rows present in table
  if (props.adjustTableHeight && props.rowdata?.length) {
    if (adjustableDiv?.length) {
      for (let index = 0; index < adjustableDiv.length; index++) {
        adjustableDiv[index].style.minHeight = "unset";
      }
    }
  }
  // use prop adjustTableHeightServerSide={true} to remove double scroll for clientSide/ServersideTables
  if (adjustTableHeightServerSide) {
    if (adjustableDiv?.length) {
      for (let index = 0; index < adjustableDiv.length; index++) {
        adjustableDiv[index].style.height = "fit-content";
      }
    }
  }
  if (applyBudgetTableFormatting) {
    gridOptions.applyBudgetTableFormatting = applyBudgetTableFormatting;
  }
  if (applyFormatOnfocus) {
    gridOptions.applyFormatOnfocus = applyFormatOnfocus;
  }

  if (metrics_with_formatter) {
    gridOptions.metrics_with_formatter = metrics_with_formatter;
  }
  if (rowSelection) {
    gridOptions.rowSelection = rowSelection;
  }
  if (rowMultiSelectWithClick !== undefined) {
    gridOptions.rowMultiSelectWithClick = rowMultiSelectWithClick;
  }
  // returns an array of all selections in the table
  if (onSelectionChanged) {
    gridOptions.onSelectionChanged = onSelectionChanged;
  }
  if (isEditDisabled) {
    gridOptions.isEditDisabled = isEditDisabled;
  }
  if (isDeleteDisabled) {
    gridOptions.isDeleteDisabled = isDeleteDisabled;
  }
  // returns one row data at a time
  if (onRowSelected) {
    gridOptions.onRowSelected = (p_instance) => {
      const { node } = p_instance;
      if (node.selected) {
        selectedRowIds.current.set(node.data[uniqueRowId], node.data);
      } else {
        selectedRowIds.current.delete(node.data[uniqueRowId], node.data);
      }
      checkRowHandler({
        p_instance,
        props,
        setPrevAction,
        setCheckConfiguration,
        setIsSelectAllRecords,
      });
    };
  }
  if (onEditClick) {
    gridOptions.onEditClick = onEditClick;
  }
  if (callDeleteApi) {
    gridOptions.callDeleteApi = callDeleteApi;
  }
  if (onChartClick) {
    gridOptions.onChartClick = onChartClick;
  }
  if (onReviewClick) {
    gridOptions.onReviewClick = onReviewClick;
  }
  if (onImageClick) {
    gridOptions.onImageClick = onImageClick;
  }
  if (customAggFunction) {
    gridOptions.customAggFunction = customAggFunction;
  }
  if (onColumnVisible) {
    gridOptions.onColumnVisible = onColumnVisible;
  }
  if (onRangeSliderChange) {
    gridOptions.onRangeSliderChange = onRangeSliderChange;
  }
  if (showColumnPanel) {
    gridOptions.sideBar = {
      toolPanels: [
        {
          id: "columns",
          labelDefault: "Columns",
          labelKey: "columns",
          iconKey: "columns",
          toolPanel: "agColumnsToolPanel",
          toolPanelParams: {
            suppressRowGroups: true,
            suppressValues: true,
            suppressPivots: true,
            suppressPivotMode: true,
            suppressColumnFilter: false,
            suppressColumnSelectAll: false,
            suppressColumnExpandAll: false,
            ...columnToolPanelParams,
          },
          width: 250,
          minWidth: 250,
        },
      ].concat(customSideBar),
      defaultToolPanel: "",
    };

    // Show Table Action Tabs on Sidebar if showSaveTableConfig or showSearchModalBtn any is true.
    if (showSaveTableConfig || showSearchModalBtn) {
      gridOptions.sideBar.toolPanels = [
        ...gridOptions.sideBar.toolPanels,
        {
          id: "table-actions",
          labelDefault: "Table Actions",
          labelKey: "tableActions",
          toolPanel: TableActions,
          toolPanelParams: {
            showSaveTableConfig: showSaveTableConfig,
            showSearchModalBtn: showSearchModalBtn,
            saveTableFormat: saveTableFormat,
          },
          minWidth: 225,
          maxWidth: 225,
          width: 225,
        },
      ];
      showSearchModalBtn &&
        gridColumns.forEach((column) => {
          if (column.is_searchable) {
            column.floatingFilter = false;
          }
          if (column.sub_headers?.length) {
            defineSearchableParams(column.sub_headers, column.label);
          }
        });
    }
  }
  if (onApplyCalendarDates) {
    gridOptions.onApplyCalendarDates = onApplyCalendarDates;
  }
  if (suppressAggFuncInHeader) {
    gridOptions.suppressAggFuncInHeader = suppressAggFuncInHeader; // to not modify column header based on AggFunc applied
  }

  if (lockCellApi) {
    gridOptions.lockCellApi = lockCellApi;
  }

  if (budgetTableChangeFunc) {
    gridOptions.budgetTableChangeFunc = budgetTableChangeFunc;
  }

  if (lockCellCustomConditionFn) {
    gridOptions.lockCellCustomConditionFn = lockCellCustomConditionFn;
  }

  if (lockCellIfNoValue) {
    gridOptions.lockCellIfNoValue = lockCellIfNoValue;
  }

  if (defaultTextFieldViewOnly) {
    gridOptions.defaultTextFieldViewOnly = defaultTextFieldViewOnly;
  }

  if (customCellRenderer) {
    gridOptions.customCellRenderer = customCellRenderer;
  }
  if (noEditableCustomCellRender) {
    gridOptions.noEditableCustomCellRender = noEditableCustomCellRender;
  }

  if (customizeRowGroupingIcon) {
    // pass strings - text or html elements (font awesome icons or provide src of an img)
    //  eg - '<i class="fa fa-plus" aria-hidden="true"></i>'
    //  or '<img src="https://cdn.rawgit.com/ag-grid/ag-grid-docs/56853d5aa6513433f77ac3f808a4681fdd21ea1d/src/javascript-grid-icons/minus.png" style="width: 12px;padding-right: 2px"/>'
    gridOptions.icons = {
      groupExpanded: groupExpandedIcon,
      groupContracted: groupContractedIcon,
    };
  }
  if (manualCallBack || hideRangeFilter) {
    if (manualCallBack) {
      gridOptions.context.manualCallBack = manualCallBack;
    }

    // Hide the filter and range icon
    if (hideRangeFilter) {
      gridColumns.forEach((column) => {
        if (!column.is_searchable) {
          column.filter = false;
          column.floatingFilter = false;
        }
        column.floatingFilterComponentParams = { suppressFilterButton: true };
      });
    }
  }
  if (rowModelType) {
    gridOptions.rowModelType = rowModelType;
    gridOptions.cacheOverflowSize = cacheOverflowSize;

    // Limit AG Grid's internal server-side cache to prevent unbounded memory growth
    // When maxBlocksInCache is set, AG Grid uses LRU eviction to discard oldest blocks
    if (maxBlocksInCache) {
      gridOptions.maxBlocksInCache = maxBlocksInCache;
    }

    if (serverSideStoreType) {
      gridOptions.serverSideStoreType = serverSideStoreType;
    }
    if (cacheBlockSize) {
      gridOptions.cacheBlockSize = cacheBlockSize;
    }
  }
  if (onBlur) {
    gridOptions.onBlur = onBlur;
  }
  if (customFunction) {
    gridOptions.customFunction = customFunction;
  }
  if (onPaginationChanged) {
    gridOptions.onPaginationChanged = onPaginationChanged;
  }
  if (onToggleChange) {
    gridOptions.onToggleChange = onToggleChange;
  }
  if (onCheckBoxChange) {
    gridOptions.onCheckBoxChange = onCheckBoxChange;
  }
  if (autoGroupColumnDef) {
    gridOptions.autoGroupColumnDef = autoGroupColumnDef;
  }
  if (isExternalFilterPresent) {
    gridOptions.isExternalFilterPresent = isExternalFilterPresent;
  }
  if (doesExternalFilterPass) {
    gridOptions.doesExternalFilterPass = doesExternalFilterPass;
  }
  if (onDownloadClick) {
    gridOptions.onDownloadClick = onDownloadClick;
  }
  //hide count of grouped child number at parent level.
  if (groupRowRendererParams)
    gridOptions.groupRowRendererParams = groupRowRendererParams;

  if (enableCustomRowHeight) {
    gridOptions.enableCustomRowHeight = enableCustomRowHeight;
  }

  if (onInfoClick) {
    gridOptions.onInfoClick = onInfoClick;
  }

  // To show pre selected rows on the Client side paginated table based on selected row id's
  if (selectedRows) {
    if (isEmpty(selectedRows)) {
      agGrid.api?.forEachNode((node) => {
        node.setSelected(false);
      });
    } else {
      agGrid.api?.forEachNode((node) => {
        if (
          !node.group &&
          node.data &&
          selectedRows.some((obj) => obj === node.data[uniqueRowId])
        ) {
          node.setSelected(true);
        } else if (node.group) {
          setTimeout(() => {
            let isPresent = selectedRows.indexOf(node.key);
            if (isPresent > -1) {
              node.setSelected(true);
            }
          }, 0);
        } else {
          node.setSelected(false);
        }
      });
    }
  }
  // to enable rows to opened by default
  if (isGroupOpenByDefault) {
    gridOptions.isGroupOpenByDefault = isGroupOpenByDefault;
  }
  if (callBackOnChangeCustomFunction) {
    gridOptions.callBackOnChangeCustomFunction = callBackOnChangeCustomFunction;
  }

  // uncheckRows is an object with 2 keys - uncheckableRows & callBackFunction
  // uncheckableRows - rows needs to be unchecked - mandatory - type -> array
  // callBackFunction - clean up function - optional - type -> function
  if (!isEmpty(uncheckRows) && Array.isArray(uncheckRows?.uncheckableRows)) {
    agGrid.api?.forEachNode((node) => {
      if (uncheckRows.uncheckableRows?.includes(node.data[uniqueRowId])) {
        node.setSelected(false);
      }
    });
    typeof uncheckRows?.callBackFunction === "function" &&
      uncheckRows?.callBackFunction({});
  }

  if (customTabFunction) {
    gridOptions.customTabFunction = customTabFunction;
  }
  if (budgetTableInputValidation) {
    gridOptions.budgetTableInputValidation = budgetTableInputValidation;
  }
  const setGridColumnWidth = (params, skipAutoSize, autoSizeOnlyCustom) => {
    // when side bar is opened we dont have to perform re-sizing
    if (
      params?.type === "gridReady" &&
      params?.api?.getModel()?.isTableSettingOpen
    ) {
      return;
    }

    let clientWidth = getGridWidth(params);
    let allColumnsWidth = getAllColumnsWidth(params);

    // auto size the columns to take max width according to content and header
    // if custom width is provided in extra key use this width
    if (allColumnsWidth > clientWidth - 30) {
      !skipAutoSize &&
        autoSizeGridColumns(params, skipHeaderOnAutoSize, autoSizeOnlyCustom);
      clientWidth = getGridWidth(params);
      allColumnsWidth = getAllColumnsWidth(params);
    }

    // if all columns dont fit the available grid width, size them to fit
    if (allColumnsWidth < clientWidth) {
      params?.api?.sizeColumnsToFit();
    }
  };

  const onSetAllApply = async (newData) => {
    const setAllResp = await props.onSetAllApply(newData, agGrid);
    return setAllResp;
  };

  useEffect(() => {
    if (!isEmpty(props.columns)) {
      // removing hidden columns from parent and sub headers
      // to confirm if this is needed

      // let cols = props.columns.filter((item) => {
      //   if (item?.sub_headers.length) {
      //     item?.sub_headers.filter((data) => !data.is_hidden);
      //   } else return !item.is_hidden;
      // });
      const copyColumns = cloneDeep(props.columns);
      //remove the advanced search config if present
      const savedSearchConfigIdx = copyColumns.findIndex(
        (col) => col.column_name === "advanced_search"
      );
      if (savedSearchConfigIdx > -1) {
        //find sidebar toolPanel index for tableActions search
        const gridSideBarIdx = gridOptions?.sideBar?.toolPanels?.findIndex(
          (sidebar) => sidebar.id === "table-actions"
        );
        if (
          gridSideBarIdx > -1 &&
          gridOptions?.sideBar?.toolPanels?.[gridSideBarIdx]?.toolPanelParams
        ) {
          gridOptions.sideBar.toolPanels[gridSideBarIdx].toolPanelParams = {
            ...gridOptions.sideBar.toolPanels[gridSideBarIdx].toolPanelParams,
            advancedSearchConfig: cloneDeep(copyColumns[savedSearchConfigIdx]),
          };
          dispatch(
            setTableSearchConfig(cloneDeep(copyColumns[savedSearchConfigIdx]))
          );
        }
        copyColumns.splice(savedSearchConfigIdx, 1);
      }
      // hiding hidden columns using ag grid columns attribute hide: boolean
      let cols = hideHiddenCols(copyColumns);

      //check if any of the child columns of column group have defaultColumnGroupExpand set to true
      //if yes, then set openByDefault to true for the column group
      cols = cols.map(col => {
        if(!isEmpty(col.children)){
          const defaultColumnGroupExpand = col.children?.some(childCol => childCol?.extra?.defaultColumnGroupExpand);
          col.openByDefault = defaultColumnGroupExpand;
        }
        return col;
      })

      // To render a column with checkboxes at left most side of the table and
      // configure using an icon
      if (selectAllHeaderComponent) {
        let checkboxColumn = [
          {
            field: "Selection",
            checkboxSelection: (params) => {
              return params.node?.data?._hideSelection ||
                (params.node.level > 0 && props.hideChildSelection)
                ? false
                : true;
            },
            headerComponent: hideHeaderCheckboxComponent
              ? NoCheckBox
              : SelectAllComponent,
            headerCheckboxSelectionFilteredOnly: false,
            pinned: "left",
            suppressSizeToFit: true, // to not include column for auto resize
            lockPosition: "left",
            suppressMenu: true,
            minWidth: 56,
            maxWidth: 56,
            cellStyle: (params) => {
              /**
               * disabling checkbox using cell style
               */
              if (props.customSelectCellStyle) {
                return props.customSelectCellStyle(params);
              }
              if (
                params.node?.data?.checkbox_disabled ||
                (disableSelectionOnSelectAll && params.api.isSelectAllRecords)
              ) {
                return {
                  display: "flex",
                  pointerEvents: "none",
                  opacity: 0.5,
                };
              }
              return { display: "flex" };
            },
            headerClass: "ag-selection-column-header",
            headerComponentParams: {
              checkAllCallback: (p_instance, p_checkAll) => {
                return checkAllHandler({
                  p_instance,
                  p_checkAll,
                  setPrevAction,
                  setCheckConfiguration,
                  setIsSelectAllRecords,
                });
              },
              refreshState: (params) => {
                selectAllRecordsState.current = params;
              },
              hideSelectCurrentPageRecords: hideSelectCurrentPageRecords, // to hide the drop down option select current page records
              hideSelectAllRecords: hideSelectAllRecords, // to hide the drop down option select all records
              isRowSelectable: isFunction(isRowSelectable)
                ? isRowSelectable
                : () => true,
            },
            order_of_display: 0,
          },
        ];
        cols = [...checkboxColumn, ...cols];
      }
      if (props.selectEachRow) {
        // displaying checkboxes on each row
        cols[0].checkboxSelection = true;
      }
      if (props.showDisabledCheckboxes) {
        cols[0].showDisabledCheckboxes = true;
      }

      if (props.enableRowSpan) {
        cols = cols.map((value) => {
          if (props.rowSpanColumn.includes(value.column_name)) {
            value.rowSpan = (params) =>
              prepareRowSpan(params, value.column_name);
            value.cellClassRules = {
              "show-cell": "colDef !== undefined",
              "show-cell": (params) => params.colDef.rowSpan(params) > 1,
            };
            value.cellStyle = {
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            };
          }

          return value;
        });
      }

      if (styleConfig.cellStyle) {
        cols = cols.map((col) => {
          if (
            styleConfig.cellStyle[col.column_name]?.length ||
            styleConfig.cellStyle["all_columns"]?.length
          ) {
            col.cellStyle = (params) => {
              let styles = {};
              [
                ...(styleConfig.cellStyle["all_columns"] || []),
                ...(styleConfig.cellStyle[col.column_name] || []),
              ].forEach((styleObject) => {
                const val = styleObject.styleFunction(params);
                styles = {
                  ...styles,
                  ...(styleObject.applyStylesFromFunction && val
                    ? val
                    : val
                    ? styleObject.style
                    : {}),
                };
              });
              return styles;
            };
          }
          return col;
        });
      }

      const max = getMaxDepth(cols);
      const updatedColumns = addSpanClasses(cols, 1, max);
      setGridColumns(updatedColumns);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.columns, selectAllHeaderComponent]);

  const onNumberFormatChange = (numericFormat) => {
      setNumericFormat(numericFormat);
      const colDefs = agGrid?.api?.getColumnDefs();
      const copyColumns = cloneDeep(colDefs);
      function applyCustomLogicRecursively(columns) {
        return columns?.map((column) => {
          if (column?.children && Array.isArray(column.children)) {
            // Recursive call for children
            column.children = applyCustomLogicRecursively(column.children);
          } else {
            // Apply number formatting
            if (
              numericFormat &&
              column?.field !== "Selection" &&
              !nonFormattingCoulumnHeaders.includes(column.column_name) &&
              numberFormattingDataTypes.includes(column.type) &&
              column.cellRenderer !== "agGroupCellRenderer" &&
              !column.is_editable
            ) {
              column.cellRenderer = (params, props) =>
                formatNumber(
                  params.data?.[column?.column_name] || "0",
                  numericFormat,
                  params,
                  column
                );
            }
          }
          return column;
        });
      }

      if (!isEmpty(copyColumns)) {
        let cols = hideHiddenCols(copyColumns);
        cols = applyCustomLogicRecursively(cols);
        agGrid?.api?.setColumnDefs(cols);
      }
  };

  useEffect(() => {
    if (!isEmpty(agGrid) && !isEmpty(gridColumns)) {
      // Skip checkbox/action columns and find the first actual data column
      const firstDataColumn = gridColumns.find(col => col.tc_code);
      let tableFormatting = null;
      if (firstDataColumn?.extra?.table_formatting) {
        tableFormatting = firstDataColumn?.extra?.table_formatting;
      }
      else if (firstDataColumn?.sub_headers && firstDataColumn.sub_headers.length > 0) {
        // Check the first sub_header for table_formatting
        tableFormatting = firstDataColumn.sub_headers[0]?.extra?.table_formatting;
      }
      
      if (!isEmpty(tableFormatting)) {
        onNumberFormatChange(tableFormatting.numeric_format);
        setTableFontSize(tableFormatting.font_size);
        
        // Apply content density with proper row height changes
        if (tableFormatting?.content_density) {
          contentDensityRef.current = tableFormatting.content_density;
          applyRowHeightForDensity(tableFormatting.content_density);
        }
      } else {
        setTableFontSize(defaultToolPanelFormat.DEFAULT_FONT_SIZE);
        setNumericFormat(defaultToolPanelFormat.DEFAULT_NUMBER_FORMAT);
      }
    }
  }, [agGrid, gridColumns]);

  // if (gridColumns && !allowCustomStyling) {
  //   gridColumns.forEach((column) => {
  //     if (dummyColoumnRule1(column)) {
  //       column.cellStyle = { backgroundColor: "grey", color: "black" };
  //     }
  //   });
  // }
  // calculate the row span count required for the column
  const prepareRowSpan = (params, columnName) => {
    if (isRowProcessed(params, columnName)) {
      return 1;
    }

    // row span is calculated if row has not been processed
    return rowSpanCount(params, columnName);
  };

  const isRowProcessed = (params, columnName) => {
    const currentRowValue = props.getRowData(params, columnName);
    const previousNode = params.api.getDisplayedRowAtIndex(
      params.node.rowIndex - 1
    );
    // if its the first row, its marked as not processed
    if (params.node.rowIndex === params.api.rowRenderer.firstRenderedRow) {
      return false;
    }
    const previousRowValue = props.getRowData(previousNode, columnName);
    // if the row value is same as previous value that means its already been processed
    return previousNode && previousRowValue === currentRowValue;
  };

  // count how many successive rows/nodes contain the same value
  const rowSpanCount = (params, columnName) => {
    let nextNode = params.api.getDisplayedRowAtIndex(params.node.rowIndex + 1);
    // if two adjacent nodes are not equal row span is 1
    if (
      !areNodesEq(params.node, nextNode, columnName) ||
      params.node.rowIndex === params.api.rowRenderer.lastRenderedRow
    ) {
      return 1;
    } else {
      // if two adjacent nodes are equal keep counting
      return (
        1 +
        rowSpanCount(
          {
            ...params,
            node: nextNode,
            data: nextNode.data,
          },
          columnName
        )
      );
    }
  };

  // check if the two nodes have same value for specific column
  const areNodesEq = (node1, node2, columnName) => {
    const node1Value = props.getRowData(node1, columnName);
    const node2Value = props.getRowData(node2, columnName);

    return node2 && node1Value === node2Value;
  };

  const getEditableNothiddenCols = (columns) => {
    let ediatbleCols = [];
    columns.forEach((data) => {
      if (data.sub_headers?.length > 0) {
        ediatbleCols.push(...getEditableNothiddenCols(data.sub_headers));
      } else if (!data.is_hidden && data.is_editable) {
        ediatbleCols.push(data);
      }
    });
    return ediatbleCols;
  };

  const getSetAllFields = () => [...getEditableNothiddenCols(props.columns)];
  const getContextMenuItems = (params) => {
    let defaultOptions = ["copy", "copyWithHeaders", "copyWithGroupHeaders"];
    return optionsForContextMenu
      ? [...defaultOptions, ...optionsForContextMenu]
      : defaultOptions;
  };
  const handleExportToExcel = (params) => {
    exportToExcel(params, {
      agGrid,
      processCellCallbackForExcel,
      processCellData,
      toPrependContent,
      prependedContentDetails,
      toAppendContent,
      appendContentDetails,
    });
  };

  useEffect(() => {
    if (props.showSetAllPopup) {
      setShowSetAll(props.showSetAllPopup);
    }
  }, [props.showSetAllPopup]);

  const setAllValidation = () => {
    if (props.setAllValidateRequired) {
      props.setAllValidate();
    } else {
      setShowSetAll(true);
    }
  };

  const handleSetAllModalClose = () => {
    if (props.setAllValidateRequired && props.setShowSetAllPopup) {
      props.setShowSetAllPopup(false);
    }
    setShowSetAll(false);
  };

  const getMainMenuItems = useCallback((params) => {
    const { colDef, actualWidth, pinned, sort } = params.column;
    const columnMenuItems = [];

    // grid column menu title
    columnMenuItems.push(
      {
        name: "Column Settings",
        cssClasses: ["settings-main-container"],
      },
      "separator"
    );

    // ability to sort column
    columnMenuItems.push({
      name: "Sort",
      subMenu: [
        {
          name:
            colDef.type === "link" && colDef?.extra?.data_type
              ? ascendingOrderLabel[colDef?.extra?.data_type]
              : ascendingOrderLabel[
                  colDef?.extra?.sortLabelType || colDef.type
                ],
          action: () => sortFunc(params.column, "asc", params.api),
          checked: sort === "asc",
        },
        {
          name:
            colDef.type === "link" && colDef?.extra?.data_type
              ? descendingOrderLabel[colDef?.extra?.data_type]
              : descendingOrderLabel[
                  colDef?.extra?.sortLabelType || colDef.type
                ],
          action: () => sortFunc(params.column, "desc", params.api),
          checked: sort === "desc",
        },
        {
          name: "Reset",
          action: () => sortFunc(params.column, null, params.api),
        },
      ],
      disabled: !colDef.is_sortable,
    });

    // ability to pin/unpin columns based on current state
    columnMenuItems.push({
      name: pinned ? "Unfreeze Column" : "Freeze Column",
      action: () => {
        onColMenuFreezeClick(params, displaySnackMessages, dispatch);
      },
    });

    // ability to pin/unpin columns based on current state
    columnMenuItems.push({
      name: "Autosize All Columns",
      action: () => {
        autoSizeManualClick.current = true;
        setGridColumnWidth(params, false, false);
      },
    });

    // ability to adjust column width to custom or auto
    columnMenuItems.push({
      name: "Column width",
      subMenu: [
        {
          name: "Auto Adjust",
          action: () => {
            onColMenuAutoAdjustClick(params);
          },
          // if extra.width property is not present- column is auto adjusted
          checked: !colDef?.extra?.width,
        },
        {
          name: "Custom width",
          action: () => {
            // add extra.width property for custom width
            params.column.colDef.extra.width = actualWidth;
            params.column.colDef.suppressSizeToFit = true;
          },
          // if extra.width property is present- column has custom width
          checked: colDef?.extra?.width,
        },
      ],
    });

    return columnMenuItems;
  }, []);

  const components = useMemo(() => {
    return {
      agColumnHeader: customHeaderComponent
        ? customHeaderComponent
        : null,
    };
  }, []);

  const getTableViewConfig = async () => {
    setTableViewSettingLoader(true);

    const tableViewConfiguration = await getTableViewConfigData("", tableName);
    setTableViewConfigData(tableViewConfiguration);
    props.setTableViewConfigData(tableViewConfiguration);
    setTableViewSettingLoader(false);
    setIsTableViewPanelOpen(true);
  };

  const onApplyTableView = (viewSelected, columnPreference) => {
    let updatedGridColumns = cloneDeep(gridColumns).map((item) => {
      const updatedColumn = columnPreference?.[item.column_name];
      if (updatedColumn) {
        item = { ...item, ...updatedColumn };
      }
      return item;
    });
    updatedGridColumns = sortBy(updatedGridColumns, ["order_of_display"]);
    setTableViewName(viewSelected);
    const formattedGridColumns = agGridColumnFormatter(
      updatedGridColumns.slice(1)
    );
    updatedGridColumns = [updatedGridColumns[0], ...formattedGridColumns];
    updatedGridColumns = hideHiddenCols(updatedGridColumns);
    agGrid?.api?.setColumnDefs(updatedGridColumns);
    setGridColumns(updatedGridColumns);
  };

  const pivotDeps = {
    agGrid,
    rowLabelRef,
    customAggFunctions,
    setFiltersExcludedValues,
    setIsRowLabelEnabled,
    setAppliedRowLabel,
    setIsLoading,
  };

  const onApplyPivotView = (pivotConfig) => {
    onApplyPivotViewUtil(pivotConfig, pivotDeps);
  };

  useEffect(() => {
    if (!isEmpty(agGrid) && closeSidebarOnLoad) {
      agGrid.api.closeToolPanel();
    }
  }, [agGrid]);

  const customStatusBar = useMemo(() => {
    return {
      statusPanels: [
        {
          statusPanel: CustomPagination,
          key: "customPagination",
          statusPanelParams: {
            setDynamicRowBuffer: setDynamicRowBuffer,
          },
        },
      ],
    };
  }, []);

  useEffect(() => {
    dynamicRowBufferRef.current = dynamicRowBuffer;
    if (!agGridPagination) {
      agGrid?.api?.setServerSideDatasource(datasource);
    }
  }, [dynamicRowBuffer]);

  useEffect(() => {
    tableReducer.current.activeEditableCell = activeEditableCell;
    tableReducer.current.dispatch = dispatch;
  }, [activeEditableCell]);
  useEffect(() => {
    if (!isEmpty(agGrid)) {
      const statusPanel = agGrid?.api?.getStatusPanel("customPagination");
      statusPanel?.setShowMore(isMore);
      statusPanel?.setLastPage(lastPage);
      statusPanel?.setOutOfData(isOutOfData);
    }
  }, [isMore, lastPage, isOutOfData, agGrid]);

  useEffect(() => {
    setShowComment({
      showCellCommentButton: false,
      ref: null,
    });
    if (enableCellComment && tableName && !isEmpty(visibleRowIds)) {
      try {
        (async () => {
          const request = await fetchTableComments(
            visibleRowIds,
            tableName,
            appDetails
          );
          if (request?.status) {
            const response = {
              [tableName]: request?.data?.components,
            };
            dispatch(setTableCommentsData(response));
          } else {
            displaySnackMessages("Error fetching cellComments", "error", dispatch);
          }
        })();
      } catch (error) {
        console.error(
          "fetchTableComments: Error fetching tableComments -> ",
          error
        );
      }
    }
  }, [visibleRowIds]);

  const openCommentPopup = (e) => {
    dispatch(setIsAddCommentPopupOpen(!isAddCommentPopupOpen));
  };
  const openCommentPanel = () => {
    dispatch(setIsPanelOpen(true));
    dispatch(setIsAddCommentPopupOpen(false));
  };
  const handleCellClick = (event) => {
    handleCellCommentClick(event, {
      enableCellComment,
      tableName,
      dispatch,
      showComment,
      setShowComment,
      requestUrl: props?.requestUrl,
      appliedFilters: props?.appliedFilters,
    });
  };

  useEffect(() => {
    // Refresh the cell when event is created
    if (isChatEnabled && !isEmpty(newEventsCreated)) {
      const allRowsData = Object.entries(newEventsCreated).map(
        ([key, value]) => {
          const rowNode = tableInstance.current?.api?.getRowNode(key);
          if (rowNode) {
            const updateEventCount = rowNode?.data?.extraData?.totalEventsCount + value;
            rowNode.data = {
              ...rowNode.data,
              extraData: {
                ...rowNode.data.extraData,
                totalEventsCount: updateEventCount,
                eventsFound: updateEventCount > 0,
              },
            };
          }
          return rowNode;
        }
      );
      tableInstance.current?.api?.refreshCells({
        force: true,
        suppressFlash: false,
        rowNodes: allRowsData,
      });
    }
  }, [newEventsCreated]);

  const [tableHeight, setTableHeight] = useState(props?.height) // Default height is 350px
  useEffect(()=>{
    // Adjusting height of the tables when inside the bottom sheet, so that it does not overflow
    if(props?.isInsideBottomSheet){
      if(props?.isBottomSheetExpanded){
      setTableHeight('400px')
      }
      else{
         setTableHeight('100px')
      }
      return;
    }
    if (props?.height !== undefined && props?.height !== null) {
      setTableHeight(props.height);
    }
  }, [
    props?.isInsideBottomSheet,
    props?.isBottomSheetExpanded,
    props?.height,
  ]);

    useEffect(() => {
      if (props?.hasOwnProperty("loader")) {
        setGridColumnWidth(tableInstance.current, false, sizeColumnsToFitFlag);
      }
    }, [props?.loader]);

  // Helper function to apply row height based on content density
  const applyRowHeightForDensity = (density) => {
    if (rowModelType && tableInstance?.current?.api) {
      const rowHeightMap = {
        "compact": 30,
        "default": 46,
        "comfort": 52
      };
      tableInstance.current.api.forEachNode((node) => {
        node.setRowHeight(rowHeightMap[density]);
      });
      setTimeout(() => {
        tableInstance.current?.api?.onRowHeightChanged();
      }, 0);
    }
  };

  const onContentDensityChange = (density) => {
    contentDensityRef.current = density;
    
    // Update tableActionProps to reflect the new content density
    setTableActionProps({
      props: {
        ...tableActionProps.props,
        contentDensity: density,
      },
    });
    
    applyRowHeightForDensity(density);
  };
  
  return (
    <div data-testid="resultContainer">
      {tableInstance.current?.api?.showSearch && (
        <AgGridSearch props={{ ...agGrid, ...props }} />
      )}
      {isChatEnabled && tableName && uniqueRowId && (
        <Suspense fallback={null}>
          <ChatSystem />
        </Suspense>
      )}
      <div style={props.tableStyle}>
        <div
          id={tableId ? tableId : "myGrid"}
          className={`${classNames("ag-theme-alpine", customClass)} ${isSinglePage ? "hide-pagination" : ""} ${
            isRowLabelEnabled && globalClasses.displayNone
            } ${(wrapHeaderText || checkEnableCellWrap()) && "wrappable-header-table"} ${isServerSideCallbackLoading.current && "ag-grid-skeleton-loader"}`}
        >
          <OldTable
            gridId={uniqueGridId}
            enableHeaderTextWrap={enableHeaderTextWrap}
            customSystemButton={
              <>
                {props?.customSystemButton && props?.customSystemButton}
                {((downloadAsExcel && !props?.customSystemButton) ||
                  customSystemButtonWithDownload) && (
                  showDownloadTooltip ? (
                    <Tooltip title="Download" orientation="top" variant="tertiary">
                      <Button
                        id="setAll"
                        variant="tertiary"
                        onClick={handleExportToExcel}
                        icon={<IA_DOWNLOAD />}
                        sx={{
                          background: "#f5f6fa !important",
                          border: "none !important",
                        }}
                      />
                    </Tooltip>
                  ) : (
                    <Button
                      id="setAll"
                      variant="tertiary"
                      onClick={handleExportToExcel}
                      icon={<IA_DOWNLOAD />}
                      sx={{
                        background: "#f5f6fa !important",
                        border: "none !important",
                      }}
                    />
                  )
                )}
              </>
            }
            topRightOptions={(props?.topRightOptions || enableTableView || props.showSetAll || enablePivot || (enableCellComment && showComment?.showCellCommentButton) || props?.topRightPrimaryOptions || (isChatEnabled && agGrid.api?.getSelectedNodes?.()?.length > 0)) ?
              <>
                {props?.topRightOptions && props?.topRightOptions}
                {enableTableView && (
                  <div
                    className={`${globalClasses.flexRow} ${globalClasses.layoutAlignBetweenCenter} ${globalClasses.marginBottom}`}
                  >
                    <Typography variant="h6" gutterBottom>
                      {tableViewName ||
                        tableViewDefaultData[0]?.view_name ||
                        ""}
                    </Typography>
                    <div
                      className={`${globalClasses.flexRow} ${globalClasses.gap} ${globalClasses.layoutAlignBetweenCenter}`}
                    >
                      {isColumnConfigEdited && (
                        <DefaultTableViewQuickSave
                          agGrid={agGrid}
                          tableName={tableName}
                          tableViewDefaultData={tableViewDefaultData}
                          // send custom props to add in payload
                        />
                      )}
                      <Button
                        variant="primary"
                        onClick={() => getTableViewConfig()}
                        isLoading={tableViewSettingLoader}
                        disabled={tableViewSettingLoader}
                      >
                        <SettingsOutlinedIcon />
                      </Button>
                    </div>
                  </div>
                )}
                {props.showSetAll && (
                  <Button
                    id="setAll"
                    variant="tertiary"
                    onClick={() => {
                      setAllValidation();
                    }}
                  >
                    Set All
                  </Button>
                )}
                {!isEmpty(agGrid) && enablePivot && (
                  <Suspense fallback={null}>
                  <FilterPanel
                    agGrid={agGrid}
                    applyFilter={onApplyPivotView}
                    rowData={rowData}
                    customAggFunctions={customAggFunctions}
                  />
                  </Suspense>
                )}
                {!isEmpty(agGrid) &&
                  enableCellComment &&
                  showComment?.showCellCommentButton && (
                    <>
                      <Button
                        id="cellComment"
                        variant="tertiary"
                        onClick={openCommentPopup}
                      >
                        <MessageIcon />
                      </Button>
                      <Button
                        id="cellComment"
                        variant="tertiary"
                        onClick={openCommentPanel}
                      >
                        <OpenInNewIcon />
                      </Button>
                    <Suspense fallback={null}>
                      <CellComment
                        props={{
                          showComment,
                          setShowComment,
                          uniqueRowId,
                        }}
                      />
                      <CellCommentPanel
                        props={{
                          visibleRowIds,
                          gridApi: tableInstance.current?.api,
                        }}
                      />
                      </Suspense>
                    </>
                  )}
                {showSetAll && (
                  <SetAll
                    rowdata={props.rowdata}
                    setAllInterdependentFields={
                      props.setAllInterdependentFields
                    }
                    primaryKey={props.primaryKey}
                    selectedRowIds={agGrid.api.getSelectedNodes()}
                    onApply={onSetAllApply}
                    fields={
                      customSetAllFields
                        ? customSetAllFields
                        : getSetAllFields()
                    }
                    handleModalClose={handleSetAllModalClose}
                    layout={props.setAlllayout}
                    maxFieldsInRow={props.setAllMaxFieldsInRow}
                    handleValidation={handleValidation}
                    setAllButtonLabel={props?.setAllButtonLabel}
                    setDefaultDateFieldValues={props?.setDefaultDateFieldValues}
                    size={props.setAllModalSize}
                  />
                )}
                {props?.topRightPrimaryOptions && props?.topRightPrimaryOptions}
                {isChatEnabled &&
                  tableName &&
                  uniqueRowId &&
                  agGrid.api?.getSelectedNodes?.()?.length > 0 && (
                    <ChatButton
                      selectedRowsIDs={agGrid.api?.getSelectedNodes()}
                      tableName={tableName}
                      uniqueRowId={uniqueRowId}
                    />
                  )}
              </> : false
            }
            ref={tableRef}
            suppressRowVirtualisation={props?.suppressRowVirtualisation}
            suppressColumnVirtualisation={props?.suppressColumnVirtualisation}
            updateData={updateData}
            treeData={props.treeData}
            isServerSideGroup={isServerSideGroup}
            columnDefs={gridColumns}
            rowData={props.rowModelType ? null : clientSideTableData}
            pinnedTopRowData={props.pinnedTopRowData}
            pinnedBottomRowData={props.pinnedBottomRowData}
            gridOptions={gridOptions}
            noRowsOverlayComponent={
              showCustomNoRowOverlay ? noRowsOverlayComponent : null
            }
            noRowsOverlayComponentParams={
              showCustomNoRowOverlay ? noRowsOverlayComponentParams : null
            }
            rowSelection={rowSelection || "multiple"}
            suppressRowClickSelection={true} // allows to click on cells w/o setting row selection to true
            suppressDragLeaveHidesColumns={true} //reorder columns
            animateRows={enableRowAnimation} // Optional - set to 'true' to have rows animate when sorted
            stopEditingWhenCellsLoseFocus={true} //loose focus on edit cell when clicked outside the table
            onCellValueChanged={props.onCellValueChanged}
            onCellFocused={props.onCellFocused}
            pagination={pagination}
            getServerSideStoreParams={props.getServerSideStoreParams}
            paginationPageSize={
              props.paginationPageSize ? props.paginationPageSize : 10
            } // num of rows per page
            suppressPaginationPanel={agGridPagination ? false : true}
            // icon action buttons
            onEditClick={() => props.onEditClick(props)} //to edit
            callDeleteApi={() => props.callDeleteApi(props)} // to delete
            onChartClick={() => props.onChartClick(props)} // on click chart icon
            onReviewClick={() => props.onReviewClick(props)} // on click review button
            groupDisplayType={props.groupDisplayType} // pass custom if you don't want autogroup column
            groupSelectsChildren={groupSelectsChildren} // if a group is selected, children of the group are also selected - true/false
            groupIncludeTotalFooter={groupIncludeTotalFooter} // grand total footer - true/false
            domLayout={domLayout} //auto sizing grids based on number of rows
            manualCallBack={() => manualCallBack()} // backend sort, search, pagination
            enableCellChangeFlash={props.enableCellChangeFlash} // cells that are refreshed will be flashed - true/false
            autoGroupColumnDef={
              autoGroupColumnDef
                ? autoGroupColumnDef
                : {
                    headerName: "Group",
                  }
            }
            getGroupRowAgg={getGroupRowAgg}
            groupHideOpenParents={groupHideOpenParents}
            rowClassRules={rowClassRules}
            getDataPath={props.getDataPath}
            alignedGrids={alignedGrids}
            headerHeight={headerHeight}
            masterDetail={masterDetail}
            isRowMaster={isRowMaster}
            getContextMenuItems={getContextMenuItems}
            keepDetailRows={keepDetailRows}
            detailCellRenderer={detailCellRenderer}
            detailRowHeight={detailRowHeight}
            purgeClosedRowNodes={purgeClosedRowNodes}
            suppressContextMenu={suppressContextMenu} // to disable right click action which displays a menu to copy and export
            isExternalFilterPresent={isGridExternalFilterPresent}
            doesExternalFilterPass={doesGridExternalFilterPass}
            sideBar={props.sideBar}
            suppressFieldDotNotation={suppressFieldDotNotation} //Allows you to use dots in your field name if you prefer
            isRowSelectable={isRowSelectable}
            detailRowAutoHeight={detailRowAutoHeight}
            rowGroupPanelShow={rowGroupPanelShow}
            groupDefaultExpanded={groupDefaultExpanded}
            onFilterChanged={getFilteredRows}
            enableRangeSelection={enableRangeSelection}
            processDataFromClipboard={
              processDataFromClipboard ||
              (enablePaste && defaultProcessDataFromClipboard)
            }
            processCellForClipboard={(params) => {
              return processCellForClipboard
                ? processCellForClipboard(params)
                : processCellData(params);
            }}
            rowDragMultiRow={rowDragMultiRow} // To Enable and Disable Multi Row Dragging
            processHeaderForClipboard={processHeaderForClipboard}
            suppressRowTransform={props.enableRowSpan}
            isServerSideGroupOpenByDefault={isServerSideGroupOpenByDefault}
            // getMainMenuItems={getMainMenuItems}
            onDragStopped={onColumnWidthDrag}
            tooltipShowDelay={500}
            rowHeight={contentDensityRef?.current ? contentDensityRef?.current: gridRowHeight}
            hideRowHeightOptionMenu={hideRowHeightOptionMenu || rowModelType === "infinite"}
            paginationPageSizeSelector={paginationPageSizeSelector}
            enableCustomRowHeight={enableCustomRowHeight}
            components={
              showSearchModalBtn || showSearchHeader || customHeaderComponent
                ? components
                : {}
            }
            valueCache={valueCache}
            customTabFunction={customTabFunction}
            rowDragManaged={rowDragManaged}
            groupIncludeFooter={groupIncludeFooter}
            onNumberFormatChange={onNumberFormatChange}
            defaultFontSize={tableFontSize}
            numericFormatDefault={numericFormat}
            onCellClicked={handleCellClick}
            statusBar={pagination && !agGridPagination && customStatusBar}
            topLeftOptions={props?.topLeftOptions}
            topCenterOptions={props?.topCenterOptions}
            bottomLeftOptions={props?.bottomLeftOptions}
            bottomRightOptions={props?.bottomRightOptions}
            bottomCenterOptions={props?.bottomCenterOptions}
            tableHeader={tableHeader}
            cardContainer={!isUndefined(props?.cardContainer)? props?.cardContainer : true}
            suppressColumnMoveAnimation={suppressColumnMoveAnimation}
            onCellKeyDown={(event) =>
              handleCellKeydown(event, activeEditableCell, dispatch)
            }
            onAdvanceSearchClick={(col) => {
              handleEnableSearch(col, tableInstance.current?.api, dispatch);
            }}
            customGetMainMenuItems={getMainMenuItems}
            tableActions={
              <>
                {!hideTableActionsComponents && (
                <TableActions {...tableActionProps?.props} />
                )}
                {props?.tableActions && props?.tableActions}
              </>
            }
            additionalButtons={props?.additionalButtons && <>{props?.additionalButtons}</>}
            hidePaginationPageSizeSelector={hidePaginationPageSizeSelector}
            showDownloadButton={props?.showDownloadButton}
            onDownloadButtonClick={() => props.onDownloadButtonClick()}
            closeButton={props?.closeButton}
            handleCloseButtonClick={() => props?.handleCloseButtonClick()}
            defaultColDef={{
              minWidth: minWidth,
              wrapText: checkEnableCellWrap() ??  wrapCellText ,
              autoHeight: checkEnableCellWrap() ?? autoCellHeight,
              // wrapHeaderText: checkEnableCellWrap() ?? wrapHeaderText, // Wrapping headerText
              // autoHeaderHeight: checkEnableCellWrap() ?? autoHeaderHeight,
            }}
            hideTableFormat={hideTableFormat}
            hideTableActions={hideTableActions}
            handleClearSearchInline={handleInlineSearchClear}
            customHeaderComponent={customHeaderComponent}
            nestedTable={nestedTable}
            nestedTableComponent={nestedTableComponent}
            debounceTime={debounceTime}
            height={tableHeight}
            hideTableSetting={hideTableSetting}
            paginationNumberFormatter={paginationPageSizeFormatter}
            explicitlyCloseTableSetting={explicitlyCloseTableSetting}
            closeTableSettingOnOutsideClick={closeTableSettingOnOutsideClick}
            onTableSettingClick={props?.onTableSettingClick}
            onContentDensityChange={onContentDensityChange}
            loadingCellRenderer={!disableSkeletonLoader ? CustomLoadingCellRenderer : undefined}
          />
          {showSkeletonLoader && clientSideTableData?.length === 0 && tableInstance.current?.api?.gridBodyCtrl?.eBodyViewport && createPortal(
            <CustomLoadingCellRenderer
              api={tableInstance.current?.api}
              columnApi={tableInstance.current?.columnApi}
              isClientSideTable
            />,
            tableInstance.current?.api?.gridBodyCtrl?.eBodyViewport
          )}
        </div>
        {isRowLabelEnabled && (
          <Suspense fallback={null}>
            <RowLabelTable
              tableId={tableId}
              customClass={customClass}
              parentGridInstance={rowLabelRef?.current?.instance}
              rowFields={rowLabelRef?.current?.rowFields}
              applied={appliedRowLabel}
              setApplied={setAppliedRowLabel}
              rowLabelRef={rowLabelRef?.current}
              filtersExcludedValues={filtersExcludedValues}
            />
          </Suspense>
        )}
      </div>
      {isTableViewPanelOpen && (
        <Suspense fallback={null}>
          <TableViewPanel
            agGrid={agGrid}
            tableName={tableName}
            tableViewConfiguration={tableViewConfigData}
            isPanelOpen={isTableViewPanelOpen}
            setIsTableViewPanelOpen={setIsTableViewPanelOpen}
            onApplyTableView={(viewSelected, columnPreference) =>
              onApplyTableView(viewSelected, columnPreference)
            }
          />
        </Suspense>
      )}
    </div>
  );
};
AgGridComponent.propTypes = {
  isLoading: PropTypes.bool,
  width: PropTypes.any,
  height: PropTypes.any,
};
AgGridComponent.defaultProps = {
  isLoading: false,
  width: "100%",
  height: "350px",
};

/*
  Various RowGroupingDisplayTypes are -
   'singleColumn'
    | 'multipleColumns' 
    | 'groupRows' 
    | 'custom'
*/

const mapDispatchToProps = (dispatch) => {
  return {
    setLastSearchType: (payload) => dispatch(setLastSearchType(payload)),
    setTableViewConfigData: (payload) =>
      dispatch(setTableViewConfigData(payload)),
    setTableRecentChanges: (domDataKey, payload) =>
      dispatch(setTableRecentChanges(domDataKey, payload)),
    setKeyboardTableAction: (key, payload, tableKey) =>
      dispatch(setKeyboardTableAction(key, payload, tableKey)),
  };
};
const mapStateToProps = (store) => {
  return {
    userAccessList:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.userAccessList,
    tenantTableUamConfig:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
        .table_uam,
    filterReducer: store.filterReducer,
    tableConfig: store.tableReducer,
    keyboardShortcuts: store.tenantConfigReducer?.keyboardShortcuts,
    cellCommentPanel: store?.tableReducer?.cellCommentPanel,
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(AgGridComponent);
