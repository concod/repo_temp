import React, { useRef, useState, useEffect, useCallback } from "react";
import { connect } from "react-redux";
import { isEmpty, cloneDeep } from "lodash";
import AgGridComponent from "core/Utils/agGrid";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import { FormControl } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { addSnack, closeSnack } from "core/actions/snackbarActions";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { useDispatch } from "react-redux";
import { Button, Badge, Loader, Select, Tooltip, Alert } from "impact-ui-v3";
import moment from "moment";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import CellRenderers from "core/Utils/agGrid/cellRenderer";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import Monitoring from "assets/impactv3/Monitoring.svg";
import classNames from "classnames";
import globalStyles from "core/Styles/globalStyles";
import InfoIcon from "assets/impactv3/info_icon.svg";
import { useStyles as orderingCustomStyles } from "modules/oms/styles-oms/orderingCustomStyles";
import EmptyStateWrapper from "core/commonComponents/coreComponentScreen/EmptyStateWrapper";
import {
  adjustMiddleContentHeight,
  handleErrorMessage,
} from "modules/oms/utils-oms/oms-utility";
import {
  setTableData,
  setTableColumns,
  fetchPORebalanceTableFields,
  fetchPORebalanceTableData,
  setPoRebalanceDataLoader,
  setXaxisStaticDates,
} from "modules/oms/services-oms/PO-Rebalance/po-rebalance-service";
import PoRebalanceSizeChoiceTable from "./PoRebalanceSizeChoiceTable";
import PoRebalanceReviewRecommendationTable from "./PoRebalanceReviewRecommendationTable";
import PORebalanceSidePanelOnWeekLevel from "./PORebalanceSidePanelOnWeekLevel";
import ReviewRecommendationPopUp from "./ReviewRecommendationPopUp";
import { SIZE_CHOICE_TABLE_PAYLOAD } from "./constants";
import {
  cleanPoRebalanceFilters,
  getFiscalWeekColumnsForPopUp,
  transformPoRebalanceTableRows,
} from "./poRebalanceChoiceDataUtils";
import "./PORebalance.css";
import { NO_UPDATE } from "modules/oms/constants-oms/stringConstants";
import LoadingOverlay from "core/Utils/Loader/loader";

const TABLE_BOTTOM_SPACING = 16;
const TABLE_TOP_OFFSET = 216;

const PORebalanceTable = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const orderingClasses = orderingCustomStyles();
  const agGridInstance = useRef(null);
  const tableContainerRef = useRef(null);
  const tableMetaDataRef = useRef({});
  const poRebalanceFiltersRef = useRef({});
  const [selectedRecords, setSelectedRecords] = useState([]);
  const [choiceTableColumns, setChoiceTableColumns] = useState([]);
  const [choiceTableData, setChoiceTableData] = useState([]);
  const [openPopUp, setOpenPopUp] = useState(false);
  const [selectedSubClass, setSelectedSubClass] = useState(null);
  const [popUpWeekData, setPopUpWeekData] = useState(null);
  const [choiceOptions, setChoiceOptions] = useState({});
  const [selectedChoiceOptions, setSelectedChoiceOptions] = useState({});
  const [isOpenViewBy, setIsOpenViewBy] = useState(false);
  const [formData, setFormData] = useState({});
  const [flagEdit, setFlagEdit] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState("");
  const PoRebalanceReviewRecommendationTableRef = useRef(null);
  const [alertMessage, setAlertMessage] = useState(null);
  const [alertVariant, setAlertVariant] = useState(null);

  const [hideSaveDraft, setHideSaveDraft] = useState(false);
  const [hideSaveApprove, setHideSaveApprove] = useState(false);
  // Access control states for PO Rebalance
  const [isUserHasSaveDraftAccess, setIsUserHasSaveDraftAccess] = useState(
    true
  );
  const [
    isUserHasApprovePoRebalanceAccess,
    setIsUserHasApprovePoRebalanceAccess,
  ] = useState(true);

  const [
    openReviewRecommendationTable,
    setOpenReviewRecommendationTable,
  ] = useState(false);
  const [isApprove, setIsApprove] = useState(1);
  const [
    openRecommendationTableForDraftAndApprove,
    setOpenRecommendationTableForDraftAndApprove,
  ] = useState(false);

  const [openSidePanel, setOpenSidePanel] = useState(false);
  const [sidePanelData, setSidePanelData] = useState(null);

  const [pageLoader, setPageLoader] = useState(true);
  const [agGridHeight, setAgGridHeight] = useState(null);

  const updateTableHeight = useCallback(() => {
    if (!tableContainerRef.current) return;
    adjustMiddleContentHeight(tableContainerRef, null, TABLE_BOTTOM_SPACING);
    const containerMaxHeight = parseInt(
      tableContainerRef.current.style.maxHeight || "0",
      10
    );
    setAgGridHeight(
      Math.max(containerMaxHeight - TABLE_TOP_OFFSET, 0)
    );
  }, []);

  useEffect(() => {
    if (pageLoader) return;
    updateTableHeight();
    window.addEventListener("resize", updateTableHeight);
    return () => window.removeEventListener("resize", updateTableHeight);
  }, [updateTableHeight, pageLoader, alertMessage]);

  useEffect(() => {
    if (pageLoader) return;
    const filterToggleBtn = document.getElementById("filterToggleBtn");
    if (!filterToggleBtn) return;

    const handleFilterToggle = () => {
      requestAnimationFrame(() => {
        updateTableHeight();
      });
    };

    filterToggleBtn.addEventListener("click", handleFilterToggle);
    return () =>
      filterToggleBtn.removeEventListener("click", handleFilterToggle);
  }, [updateTableHeight, pageLoader]);

  const dispatch = useDispatch();

  const HIERARCHY_KEY = props?.omsScreenConfig?.hierarchy_key || "l6_id";
  const HIERARCHY_LABEL = props?.omsScreenConfig?.hierarchy_label || "Choice";
  const VIEW_STATUS_FISCAL_WEEK_GROUP =
    props?.omsScreenConfig?.view_status_fiscal_week_group || true;

  const displaySnackMessages = (
    message,
    variance,
    disableOnClose = false,
    autoHideDuration = 1000
  ) => {
    props.closeSnack();
    props.addSnack({
      message: message,
      options: {
        variant: variance,
        disableOnClose: disableOnClose,
        autoHideDuration: autoHideDuration,
      },
    });
  };

  const cleanFilters = cleanPoRebalanceFilters;

  // Fetch table columns on mount
  useEffect(() => {
    const fetchTableColumns = async () => {
      try {
        props.setPoRebalanceDataLoader(true);
        setPageLoader(true);
        const columnsPayload = {
          ...SIZE_CHOICE_TABLE_PAYLOAD,
          module: props?.omsScreenConfig?.hierarchy_label || "Choice",
          start_week_id: props.startWeekId,
          end_week_id: props.endWeekId,
          filters: cleanFilters(poRebalanceFiltersRef.current),
        };

        const columnsResponse = await props.fetchPORebalanceTableFields(
          columnsPayload
        );
        if (columnsResponse?.data?.status) {
          const apiColumns = columnsResponse.data.data || [];

          // Update column type for aggr_column
          const modifiedColumns = apiColumns.map((column) => {
            if (column.column_name === "aggr_column") {
              column.onClick = (tableInfo) => {
                setSelectedSubClass(tableInfo?.cellData?.data || {});
              };
              return {
                ...column,
                type: "link",
                extra: { is_grouping_key: true },
              };
            }

            return column;
          });

          let formattedColumns = agGridColumnFormatter(
            modifiedColumns,
            null,
            null,
            null,
            null,
            null,
            null,
            true,
            false,
            true
          );
          let updatedResponse = checkForEditability(formattedColumns);

          setChoiceTableColumns(updatedResponse);
          const fiscalWeeks = columnsResponse?.data?.data
            .map((item) => item.accessor) // Get the accessor values
            .filter((value) => !isNaN(value));

          const fiscalWeekId = {
            fiscal_ids: [...fiscalWeeks],
          };
          dispatch(setXaxisStaticDates(fiscalWeekId));
        }
      } catch (error) {
        handleErrorMessage(error, props);
      } finally {
        props.setPoRebalanceDataLoader(false);
        setPageLoader(false);
      }
    };

    if (props.startWeekId && props.endWeekId) {
      fetchTableColumns();
    }
  }, [props.startWeekId, props.endWeekId, props.calenderChangedDependency]);

  useEffect(() => {
    if (!isEmpty(props.selectedFilters)) {
      poRebalanceFiltersRef.current = props.selectedFilters;
      refreshGridData();
    }
    agGridInstance?.current?.api?.deselectAll();
  }, [props.selectedFilters]);

  const refreshGridData = () => {
    if (agGridInstance.current?.api) {
      agGridInstance.current.api.refreshServerSideStore({ purge: true });
    }
  };

  const loadTableInstance = (params) => {
    agGridInstance.current = params;
    if (props.startWeekId && props.endWeekId) {
      refreshGridData();
    }
  };

  const checkForEditability = (columnsDef) => {
    try {
      let updatedColumnsDef = cloneDeep(columnsDef);
      updatedColumnsDef = updatedColumnsDef.map((item) => {
        if (item.extra?.is_grouping_key) {
          item.cellRenderer = "agGroupCellRenderer";
          if (item.type === "link") {
            item.rowGroup = true;
            item.cellRendererParams = {
              suppressCount: true,
              innerRenderer: (params, extraProps) => (
                <CellRenderers
                  cellData={params}
                  column={item}
                  extraProps={extraProps}
                  actions={null}
                ></CellRenderers>
              ),
            };
          }
        }
        // Set fixed width for savetype column to ensure consistent layout and visibility icon remains visible
        if (item.accessor === "savetype" || item.column_name === "savetype") {
          item.width = 200;
          item.minWidth = 200;
          item.maxWidth = 200;
          item.resizable = false;
        }
        // Add sub-header configuration for columns with children
        if (item?.sub_headers?.length > 0) {
          item.sub_headers = item.sub_headers?.map((subHeader) => {
            if (/Excess_Deficit_\d+/.test(subHeader.field)) {
              subHeader.cellStyle = (params) => {
                if (params.value < 0) {
                  return { color: "#e15554" }; // red color
                }
                return null;
              };
            }
            return subHeader;
          });
        }
        return item;
      });
      return updatedColumnsDef;
    } catch (err) {
      console.log("error", err);
      return [];
    }
  };

  const onSelectionChanged = (params) => {
    const selectedNodes = params.api.getSelectedNodes();
    const selectedData = selectedNodes.map((node) => node.data);
    setSelectedRecords(selectedData);
    setOpenReviewRecommendationTable(false);
    setOpenRecommendationTableForDraftAndApprove(false);
  };

  const getSelectedRecordsCount = () => {
    return selectedRecords.length;
  };

  const fetchTableData = async (body) => {
    try {
      // Clean up filters before making the API call
      const cleanedBody = {
        ...body,
        filters: cleanFilters(body.filters),
      };

      const dataResponse = await props.fetchPORebalanceTableData(cleanedBody);
      if (dataResponse?.data?.status) {
        const formattedData = dataResponse.data.data || [];
        setChoiceTableData(formattedData);
        return {
          data: formattedData,
          totalCount: dataResponse.data.total || formattedData.length,
        };
      }
      return {
        data: [],
        totalCount: 0,
      };
    } catch (error) {
      handleErrorMessage(error, props);
      return {
        data: [],
        totalCount: 0,
      };
    }
  };

  const manualCallPoRebalance = async (manualBody, pageIndex, params) => {
    tableMetaDataRef.current = manualBody;
    const body = {
      meta: {
        ...manualBody,
        limit: {
          limit: props?.omsScreenConfig?.page_limit || 10,
          page: pageIndex + 1,
        },
      },
      filters: poRebalanceFiltersRef.current,
      aggregation_level: "W",
      start_agg_id: props.startWeekId,
      end_agg_id: props.endWeekId,
      aggregation_type: "style",
      aggregation_value: "",
      kpi: "min_order_quantity_style",
    };

    try {
      props.setPoRebalanceDataLoader(true);
      setOpenRecommendationTableForDraftAndApprove(false);
      setOpenReviewRecommendationTable(false);
      setSelectedSubClass(false);

      const response = await fetchTableData(body);
      if (response?.data) {
        // Transform data to add fiscal_week object inside status_obj
        const transformedData = transformPoRebalanceTableRows(response.data);

        let formatedData = agGridRowFormatter(
          transformedData,
          params?.api?.checkConfiguration,
          "aggr_column"
        );
        props.setPoRebalanceDataLoader(false);
        return { data: formatedData, totalCount: response?.totalCount };
      } else {
        return { data: [], totalCount: 0 };
      }
    } catch (error) {
      console.log("error", error);
    } finally {
      props.setPoRebalanceDataLoader(false);
    }
  };

  const openReviewRecommendationsPopUp = () => {
    // Clear popUpWeekData to ensure isFromSidePanel is false
    // This ensures week dropdown and Apply button are visible
    setPopUpWeekData(null);
    setOpenReviewRecommendationTable(false);
    setOpenRecommendationTableForDraftAndApprove(false);
    setFlagEdit(false);
    setOpenPopUp(true);
  };

  const getTopLeftOptions = () => {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <span>Filtered {HIERARCHY_LABEL}s </span>
        <div className={orderingClasses.dividerLine} />
        <div>{props.dateFilterOptions}</div>
      </div>
    );
  };

  const getTopRightOptions = () => {
    let options = [];
    if (selectedRecords.length > 0) {
      options.push(
        <>
          <div
            key="selection-info"
            style={{ marginRight: "10px", display: "inline-block" }}
          >
            {getSelectedRecordsCount() > 0 && (
              <span>{`${getSelectedRecordsCount()} record(s) selected`}</span>
            )}
          </div>
          <div>
            <Button
              variant="primary"
              color="primary"
              className={classes.button}
              disabled={selectedRecords.length === 0}
              onClick={openReviewRecommendationsPopUp}
            >
              Review Recommendations
            </Button>
          </div>
        </>
      );
    }

    return options;
  };

  const getBottomLeftOptions = () => {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "8px",
              height: "8px",
              backgroundColor: "#c4e8d5",
              borderRadius: "2px",
            }}
          ></div>
          <span>PO receipt is positive (&gt; 0)</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "8px",
              height: "8px",
              backgroundColor: "#f6cccc",
              borderRadius: "2px",
            }}
          ></div>
          <span>PO receipt is in negative (&lt; 0)</span>
        </div>
      </div>
    );
  };

  // Check if column_name is a 6-digit number
  const choiceTableColumnsDataForPopUp =
    getFiscalWeekColumnsForPopUp(choiceTableColumns);

  const openReviewRecommendationTableView = (data, selectedRecord = null) => {
    setSelectedSubClass(null);
    setPopUpWeekData(data);

    // If selectedRecord is provided (from side panel), use it; otherwise use existing selectedRecords
    if (selectedRecord) {
      setSelectedRecords([selectedRecord]);
    }

    // Set form data for the popup
    if (data) {
      setFormData(data);
    }

    // Close side panel if it's open
    setOpenSidePanel(false);

    // Open the popup/bottom sheet
    setOpenPopUp(true);
    setOpenReviewRecommendationTable(true);
    return true;
  };

  useEffect(() => {
    if (agGridInstance.current?.api) {
      setOpenReviewRecommendationTable(false);
      setOpenRecommendationTableForDraftAndApprove(false);
      agGridInstance.current.api.refreshServerSideStore({ purge: true });
    }
  }, [isApprove]);

  useEffect(() => {
    if (agGridInstance.current?.api) {
      agGridInstance.current.api.refreshServerSideStore({ purge: true });
    }
  }, [props.calenderChangedDependency]);

  useEffect(() => {
    let choiceOptionsData = [];
    selectedRecords?.forEach((item) => {
      choiceOptionsData.push({
        label: item.aggr_column,
        value: item.aggr_column,
      });
    });

    setChoiceOptions(choiceOptionsData);
  }, [selectedRecords]);

  useEffect(() => {
    console.log("selectedChoiceOptions", selectedChoiceOptions);
    if (openPopUp) {
      setSelectedChoiceOptions(choiceOptions[0]);
      setSelectedChoice(selectedRecords[0]?.aggr_column);
    }
  }, [openPopUp]);

  function isSavetypeInvalid(savetype) {
    if (!savetype) return true;

    if (Array.isArray(savetype)) {
      if (
        savetype.length === 0 ||
        savetype.includes(null) ||
        savetype.every((item) => item === null)
      ) {
        return true;
      }
    }
    return false;
  }

  const handleSkuIdChange = (opt) => {
    let newValue = opt.value;
    setSelectedChoice(newValue);
  };

  const onApply = async () => {
    if (flagEdit) {
      if (!formData.hasOwnProperty("week_month_list")) {
        return displaySnackMessages(
          "Please select the required fields!",
          "info"
        );
      }
      var selectedStyle = [];
      choiceTableColumnsDataForPopUp?.selectedRows?.map((data) => {
        selectedStyle.push(data?.row);
      });
      let payloadData = {
        week_month_list: formData?.week_month_list,
      };

      let response = openReviewRecommendationTableView(payloadData);
      if (response) {
        // setOpenPopUp(false);
      }
    } else {
      displaySnackMessages(NO_UPDATE, "info");
    }
  };

  const topContent = () => {
    // Always use the week selected from the popup since we always come through the popup
    let startFiscalWeekSelected = null;
    let endFiscalWeekSelected = null;
    let startFiscalWeek = null;
    let endFiscalWeek = null;
    if (formData?.week_month_list) {
      startFiscalWeek = formData.week_month_list;
      const year = parseInt(startFiscalWeek.slice(0, 4));
      const week = parseInt(startFiscalWeek.slice(4));

      let startDate = moment().year(year).isoWeek(week);
      let endDate = startDate.clone().add(3, "weeks");
      endFiscalWeek = `${endDate.isoWeekYear()}${String(
        endDate.isoWeek()
      ).padStart(2, "0")}`;
    }

    choiceTableColumnsDataForPopUp.forEach((item) => {
      if (item.column_name === startFiscalWeek) {
        startFiscalWeekSelected = item?.headerName;
      }
      if (item.column_name === endFiscalWeek) {
        endFiscalWeekSelected = item?.headerName;
      }
    });

    return (
      <>
        {/* Reference Weeks */}
        {formData.hasOwnProperty("week_month_list") && (
          <div
            className={classNames(
              "poRebalanceFlex",
              "poRebalanceAlignVerticalCenter"
            )}
          >
            <Tooltip
              orientation="right"
              variant="tertiary"
              title="Save type statuses are temporary and reset automatically during the daily system refresh"
            >
              <div style={{ marginRight: "12px" }}>
                <InfoIcon />
              </div>
            </Tooltip>

            <div className="poRebalanceReferenceWeeksContainer">
              <div style={{ width: "20px", height: "20px" }}>
                <Monitoring />
              </div>
              <div className="poRebalanceLabelDatesContainer">
                <label className="poRebalanceLabel">
                  Reference weeks for data :
                </label>
                <div className="poRebalanceLabel poRebalanceSelectedDates">
                  {startFiscalWeekSelected} - {endFiscalWeekSelected}
                </div>
              </div>
            </div>
            <div
              className="poRebalanceLineSeparator"
              style={{ transform: "translateY(-3px)" }}
            ></div>
          </div>
        )}

        <div className="poRebalanceAlignVerticalCenter poRebalanceSelectChoice">
          <div className="poRebalanceFlex">
            <FormControl
              size="small"
              sx={{ minWidth: 240 }}
              className={classNames(
                classes.flexRow,
                globalClasses.verticalAlignCenter
              )}
            >
              <label className={globalClasses.extraButtonStyle}>
                Select {HIERARCHY_LABEL}
              </label>
              <Select
                id="viewBySelection"
                currentOptions={choiceOptions}
                setCurrentOptions={setChoiceOptions}
                initialOptions={choiceOptions}
                selectedOptions={selectedChoiceOptions}
                handleChange={handleSkuIdChange}
                setSelectedOptions={setSelectedChoiceOptions}
                isOpen={isOpenViewBy}
                setIsOpen={setIsOpenViewBy}
                withPortal={true}
              />
            </FormControl>
            {!popUpWeekData?.isFromSidePanel && (
              <div className="poRebalanceFlex">
                <div
                  className="poRebalanceLineSeparator"
                  style={{ marginRight: "12px" }}
                ></div>
                <Button
                  onClick={onApply}
                  variant="secondary"
                  disabled={!formData?.week_month_list}
                >
                  Apply
                </Button>
              </div>
            )}
          </div>
        </div>
      </>
    );
  };

  const shouldShowReviewTable =
    (openReviewRecommendationTable ||
      openRecommendationTableForDraftAndApprove) &&
    !openSidePanel;

  const isReviewTableLoading =
    props.poRebalanceTableFieldsLoader ||
    props.poRebalanceSubClassTableDataLoader;

  const renderReviewRecommendationTable = () => {
    if (!shouldShowReviewTable || !formData?.week_month_list) {
      return (
        <EmptyStateWrapper
          emptyStateHeading="No data to display"
          emptyStateDescription="Please select the target week to get the data to display according to your preference"
          hidePrimaryButton={true}
          emptyStateProps={{
            primaryButtonLabel: null,
            secondaryButtonLabel: null,
          }}
        />
      );
    }
    return (
      <LoadingOverlay loader={isReviewTableLoading} minHeight="260px">
        <PoRebalanceReviewRecommendationTable
          setAlertMessage={setAlertMessage}
          setAlertVariant={setAlertVariant}
          setOpenPopUp={setOpenPopUp}
          ref={PoRebalanceReviewRecommendationTableRef}
          popUpWeekData={popUpWeekData}
          selectedRecords={selectedRecords}
          startWeekId={props.startWeekId}
          endWeekId={props.endWeekId}
          setOpenReviewRecommendationTable={setOpenReviewRecommendationTable}
          setOpenRecommendationTableForDraftAndApprove={
            setOpenRecommendationTableForDraftAndApprove
          }
          selectedChoice={selectedChoice}
          setIsApprove={setIsApprove}
          choiceTableColumns={choiceTableColumnsDataForPopUp}
          hideSaveDraft={hideSaveDraft}
          setHideSaveDraft={setHideSaveDraft}
          hideSaveApprove={hideSaveApprove}
          setHideSaveApprove={setHideSaveApprove}
          isUserHasSaveDraftAccess={isUserHasSaveDraftAccess}
          setIsUserHasSaveDraftAccess={setIsUserHasSaveDraftAccess}
          isUserHasApprovePoRebalanceAccess={isUserHasApprovePoRebalanceAccess}
          setIsUserHasApprovePoRebalanceAccess={
            setIsUserHasApprovePoRebalanceAccess
          }
          poRebalanceSubClassTableDataLoader={
            props.poRebalanceSubClassTableDataLoader
          }
          poRebalanceTableFieldsLoader={props.poRebalanceTableFieldsLoader}
        />
      </LoadingOverlay>
    );
  };

  const onApprove = () => {
    PoRebalanceReviewRecommendationTableRef.current.onApprovePO();
  };

  const onSaveDraft = () => {
    PoRebalanceReviewRecommendationTableRef.current.onSaveDraft();
  };

  const isApproveDisabled = () => {
    if (!shouldShowReviewTable || isReviewTableLoading) return true;
    if (!isEmpty(props.userAccess)) {
      return !isUserHasApprovePoRebalanceAccess || hideSaveApprove;
    }
    return hideSaveApprove;
  };

  const isSaveDraftDisabled = () => {
    if (!shouldShowReviewTable || isReviewTableLoading) return true;
    if (!isEmpty(props.userAccess)) {
      return !isUserHasSaveDraftAccess || hideSaveDraft;
    }
    return hideSaveDraft;
  };

  const getTopCenterOptions = () => {
    if (alertMessage && alertVariant) {
      return (
        <div
         style={{ position: "fixed", left: "40%" }}
        >
        <Alert
          severity={alertVariant}
          title={alertMessage}
          onClose={() => {
            setAlertMessage(null);
            setAlertVariant(null);
          }}
        ></Alert>
        </div>
      );
    }
    return null;
  };
  return (
    <div>
      {pageLoader ? (
        <div className="poRebalanceLoaderContainer">
          <Loader progress="" size="large" text="" />
        </div>
      ) : (
        <div ref={tableContainerRef}>
          <AgGridComponent
            topRightOptions={
              getTopRightOptions().length > 0 ? getTopRightOptions() : null
            }
            height={
              agGridHeight != null ? `${agGridHeight}px` : undefined
            }
            uniqueRowId={"aggr_column"}
            rowModelType="serverSide" // infinite
            paginationPageSize={100}
            // disablePaginationForSinglePage={true}
            hidePaginationPageSizeSelector={false}
            paginationPageSizeSelector={[10, 20, 50, 100]}
            serverSideStoreType="partial"
            columns={choiceTableColumns}
            cacheBlockSize={1000}
            onSelectionChanged={onSelectionChanged}
            loadTableInstance={loadTableInstance}
            manualCallBack={(body, pageIndex, params) =>
              manualCallPoRebalance(body, pageIndex, params)
            }
            suppressAggFuncInHeader={true}
            suppressClickEdit={true}
            groupDisplayType={"custom"}
            tableHeader={getTopLeftOptions()}
            childKey={"status_obj"}
            treeData={true}
            purgeClosedRowNodes={true}
            topCenterOptions={getTopCenterOptions()}
            pagination={true}
            rowSelection="multiple"
            rowMultiSelectWithClick={true}
            suppressRowClickSelection={false}
            hideSelectAllRecords={true}
            hideChildSelection={true}
            selectAllHeaderComponent={true}
            bottomLeftOptions={getBottomLeftOptions()}
            nestedTable={Boolean(selectedSubClass)}
            nestedTableComponent={
              selectedSubClass ? (
                <PoRebalanceSizeChoiceTable
                  payloadData={props}
                  selectedSubClass={selectedSubClass}
                  filters={poRebalanceFiltersRef.current}
                  setSelectedSubClass={setSelectedSubClass}
                  startWeekId={props.startWeekId}
                  endWeekId={props.endWeekId}
                  hierarchyKey={HIERARCHY_KEY}
                />
              ) : null
            }
            noEditableCustomCellRender={(cellProps) => {
              if (cellProps.colDef?.accessor === "savetype") {
                const savetype = cellProps?.data?.savetype_array;

                // Check if savetype is null, undefined, or contains null values
                if (isSavetypeInvalid(savetype)) {
                  return;
                }

                let filteredTypes = [];
                if (Array.isArray(savetype) && savetype.length > 0) {
                  filteredTypes = [...new Set(savetype.filter((type) => type))];
                } else if (savetype === "draft" || savetype === "approve") {
                  filteredTypes = [savetype];
                } else return;
                if (filteredTypes.length === 0) return;

                return (
                  <div className="poRebalanceBadgeContainer">
                    <div className="poRebalanceBadge">
                      {filteredTypes.map((type, index) => (
                        <Badge
                          key={index}
                          color={type === "approve" ? "success" : "default"}
                          label={type === "approve" ? "Approve" : "Draft"}
                          size="default"
                          variant="subtle"
                        />
                      ))}
                    </div>
                    <VisibilityIcon
                      className="poRebalanceVisibilityIcon"
                      onClick={() => {
                        setSelectedRecords([cellProps.data]);
                        setSidePanelData({
                          saveTypeData: filteredTypes,
                          rowData: cellProps.data,
                        });
                        setOpenSidePanel(true);
                      }}
                    />
                  </div>
                );
              }
            }}
          />
        </div>
      )}

      {openPopUp && (
        <ReviewRecommendationPopUp
          setShowSetAllModal={(isOpen) => {
            setOpenPopUp(isOpen);
            if (!isOpen) {
              setOpenReviewRecommendationTable(false);
              setOpenRecommendationTableForDraftAndApprove(false);
              setPopUpWeekData(null);
              setFlagEdit(false);
              setHideSaveDraft(false);
              setHideSaveApprove(false);
            }
          }}
          choiceTableColumns={choiceTableColumnsDataForPopUp}
          topContent={topContent()}
          SetAllData={openReviewRecommendationTableView}
          formData={formData}
          setFormData={setFormData}
          flagEdit={flagEdit}
          setFlagEdit={setFlagEdit}
          renderReviewRecommendationTable={renderReviewRecommendationTable}
          onApprove={onApprove}
          onSaveDraft={onSaveDraft}
          isApproveDisabled={isApproveDisabled}
          isSaveDraftDisabled={isSaveDraftDisabled}
          isFromSidePanel={popUpWeekData?.isFromSidePanel}
          selectedChoice={selectedChoice}
          selectedRowData={selectedRecords}
          VIEW_STATUS_FISCAL_WEEK_GROUP={VIEW_STATUS_FISCAL_WEEK_GROUP}
        />
      )}

      {openSidePanel && (
        <PORebalanceSidePanelOnWeekLevel
          open={openSidePanel}
          onClose={() => setOpenSidePanel(false)}
          saveTypeData={sidePanelData?.saveTypeData}
          rowData={sidePanelData?.rowData}
          aggrColumn={sidePanelData?.rowData?.aggr_column}
          choiceTableColumns={choiceTableColumnsDataForPopUp}
          openReviewRecommendationTableView={openReviewRecommendationTableView}
          selectedRecords={
            sidePanelData?.rowData ? [sidePanelData.rowData] : []
          }
          hierarchy_key={HIERARCHY_KEY}
        />
      )}
    </div>
  );
};

const mapStateToProps = (store) => {
  const { omsReducer } = store;
  return {
    userAccess: omsReducer.orderingCommonService.orderingUserAccess?.vendor_dc,
    omsScreenConfig:
      omsReducer?.orderingCommonService?.orderingScreensConfig?.po_rebalance,
    tableData: omsReducer?.poRebalanceService?.tableData || [],
    tableColumns: omsReducer?.poRebalanceService?.tableColumns || [],
    selectedFilters: omsReducer?.poRebalanceService?.selectedFilters || [],
    poRebalanceSubClassTableDataLoader:
      omsReducer?.poRebalanceService.poRebalanceSubClassTableDataLoader,
    poRebalanceTableFieldsLoader:
      omsReducer?.poRebalanceService.poRebalanceTableFieldsLoader,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setTableData: (body) => dispatch(setTableData(body)),
  setTableColumns: (body) => dispatch(setTableColumns(body)),
  fetchPORebalanceTableFields: (payload) =>
    dispatch(fetchPORebalanceTableFields(payload)),
  fetchPORebalanceTableData: (payload) =>
    dispatch(fetchPORebalanceTableData(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  closeSnack: (payload) => dispatch(closeSnack(payload)),
  setPoRebalanceDataLoader: (payload) =>
    dispatch(setPoRebalanceDataLoader(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(PORebalanceTable);
