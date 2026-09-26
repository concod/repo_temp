import React, { useRef, useState, useEffect } from "react";
import { connect } from "react-redux";
import { isEmpty, cloneDeep, transform } from "lodash";
import AgGridComponent from "core/Utils/agGrid";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import { FormControl } from "@mui/material";
import { useStyles as orderingCustomStyles } from "modules/oms/styles-oms/orderingCustomStyles";
import { useTheme } from "@mui/material/styles";
import { addSnack, closeSnack } from "core/actions/snackbarActions";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { useDispatch } from "react-redux";
import { Button, Badge, Loader, Select, Tooltip } from "impact-ui-v3";
import makeStyles from "@mui/styles/makeStyles";
import moment from "moment";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import CellRenderers from "core/Utils/agGrid/cellRenderer";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import { handleErrorMessage } from "modules/oms/utils-oms/oms-utility";
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
import { UPPER_HIERARCHY_TOTAL_METRICS } from "./constants";
import { SIZE_CHOICE_TABLE_PAYLOAD } from "./constants";
import Monitoring from "assets/Monitoring.svg";
import classNames from "classnames";
import globalStyles from "core/Styles/globalStyles";
import NoDataDisplay from "assets/noDataDisplay.png";
import InfoIcon from "assets/info_icon.svg";
// import { Select } from "core/commonComponents/filters";

const customStyles = makeStyles((theme) => ({
  badgeContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
    width: "100%",
    height: "100%",
    gap: "8px",
    padding: "4px 0",
  },
  badge: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    flex: "1 1 auto",
    minWidth: "0",
    overflow: "hidden",
  },
  visibilityIcon: {
    fontSize: "16px",
    cursor: "pointer",
    color: theme.palette.text.grey,
    flexShrink: 0,
    minWidth: "20px",
    height: "20px",
  },
  loaderContainer: {
    minHeight: "80vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  flex: {
    display: "flex",
    alignItems: "center",
  },

  referenceWeeksContainer: {
    backgroundColor: "#F4F1F9",
    padding: "6px 8px",
    width: "fit-content",
    borderRadius: "4px",
    display: "flex",
    gap: "8px",
    "& .labelDatesContainer": {
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      paddingRight: "10px",
    },
    "& .label": {
      color: "#60697D",
      fontSize: "12px",
      fontStyle: "normal",
      fontWeight: "500",
      lineHeight: "16px",

      "&.selectedDates": {
        color: "#1F2B4D",
      },
    },
  },

  alignVerticalCenter: {
    transform: "translateY(25%)",
  },
  selectChoice: {
    transform: "translateY(40%)",
  },
  lineSeparator: {
    height: "12px",
    border: "1px solid #D4D4D4",
    marginLeft: "12px",
  },
}));

const PORebalanceTable = (props) => {
  const classes = useStyles();
  const theme = useTheme();
  const globalClasses = globalStyles();
  const customClasses = customStyles();
  const orderingClasses = orderingCustomStyles();
  const agGridInstance = useRef(null);
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

  const dispatch = useDispatch();

  const cleanFilters = (filters) => {
    if (!Array.isArray(filters)) return [];
    return filters.filter(
      (filter) =>
        filter.values &&
        Array.isArray(filter.values) &&
        filter.values.length > 0
    );
  };

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
                  return { backgroundColor: "#ffebee" }; // Light red background
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
        const transformedData = response.data.map((item) => {
          const {
            aggr_column,
            l6_name,
            status_obj,
            savetype,
            fiscal_year_week_draft,
          } = item;

          const summedData = {};
          const transformedStatusObj = status_obj.map((statusItem) => {
            // Log the incoming data structure
            console.log("Fiscal Week Data:", statusItem.fiscal_week);
            const { channel, ...weekData } = statusItem;
            const flattenedData = { channel };

            // Process all non-channel properties as week data
            Object.entries(weekData).forEach(([weekId, metrics]) => {
              if (metrics && typeof metrics === "object") {
                Object.entries(metrics).forEach(([metricName, value]) => {
                  const columnKey = `${metricName}_${weekId}`;
                  flattenedData[columnKey] = value ?? null;

                  if (typeof value === "number") {
                    if (
                      UPPER_HIERARCHY_TOTAL_METRICS.some((prefix) =>
                        metricName.startsWith(prefix)
                      )
                    ) {
                      // Track count of values for averaging
                      summedData[`${columnKey}_count`] =
                        (summedData[`${columnKey}_count`] || 0) + 1;
                      summedData[columnKey] =
                        (summedData[columnKey] || 0) + value;
                      // Calculate average
                      summedData[columnKey] =
                        summedData[columnKey] /
                        summedData[`${columnKey}_count`];
                    } else {
                      summedData[columnKey] =
                        (summedData[columnKey] || 0) + value;
                    }
                  } else if (value === null) {
                    summedData[columnKey] = 0;
                  } else {
                    // For non-numeric values, just store the last value
                    summedData[columnKey] = value;
                  }
                });
              }
            });

            return flattenedData;
          });
          // const channel = status_obj[0].channel;
          // Transform each status object to include fiscal_week

          return {
            aggr_column: aggr_column,
            l6_name,
            savetype,
            fiscal_year_week_draft,
            ...summedData,
            ...item,
            status_obj: transformedStatusObj,
          };
        });

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
    setOpenPopUp(true);
  };

  const getTopLeftOptions = () => {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <span>Filtered Choices</span>
        <div className={orderingClasses.dividerLine} />
        <div>{props.dateFilterOptions}</div>
      </div>
    );
  };

  const getTopRightOptions = () => {
    let options = [];
    // options.push(...props?.getTopRightOptionsData);
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
        {selectedRecords.length > 0 && (
          <div>
            <Button
              variant="outlined"
              color="primary"
              className={classes.button}
              disabled={selectedRecords.length === 0}
              onClick={openReviewRecommendationsPopUp}
            >
              Review Recommendations
            </Button>
          </div>
        )}
      </>
    );

    return options;
  };

  // Check if column_name is a 6-digit number
  const choiceTableColumnsDataForPopUp = choiceTableColumns
    .filter((col) => {
      return /^\d{6}$/.test(col.column_name);
    })
    .map((col) => col);

  const openReviewRecommendationTableView = (data, selectedRecord = null) => {
    setSelectedSubClass(null);
    setPopUpWeekData(data);

    // If selectedRecord is provided (from side panel), use it; otherwise use existing selectedRecords
    if (selectedRecord) {
      setSelectedRecords([selectedRecord]);
    }

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
    // setSelectedChoice(selectedRecords[0]?.aggr_column);
  }, [selectedRecords]);

  useEffect(() => {
    console.log("selectedChoiceOptions", selectedChoiceOptions);
    if (openPopUp) {
      //    label: selectedRecords[0]?.aggr_column,
      // value: selectedRecords[0]?.aggr_column,
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
    // Clear cache and reset states when choice changes
    // setSizeDropdownCache({});
    // setIsAllSizesLoaded(false);
    // setAllSizes(new Set());
    setSelectedChoice(newValue);
  };
  const onApply = async () => {
    if (flagEdit) {
      if (
        // !formData.hasOwnProperty("set_all_on") ||
        !formData.hasOwnProperty("week_month_list")
      ) {
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
        // setStartWeekSelection(item?.headerName);
      }
      if (item.column_name === endFiscalWeek) {
        endFiscalWeekSelected = item?.headerName;
        // setEndWeekSelection(item?.headerName);
      }
    });
    return (
      <>
        {/* Reference Weeks */}
        {formData.hasOwnProperty("week_month_list") && (
          <div
            className={classNames(
              customClasses.flex,
              customClasses.alignVerticalCenter
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

            <div className={`${customClasses.referenceWeeksContainer} `}>
              <div style={{ width: "20px", height: "20px" }}>
                <Monitoring />
              </div>
              <div className="labelDatesContainer">
                <label className="label">Reference weeks for data :</label>
                <div className="label selectedDates">
                  {startFiscalWeekSelected} - {endFiscalWeekSelected}
                </div>
              </div>
            </div>
            <div
              className={customClasses.lineSeparator}
              style={{ transform: "translateY(-3px)" }}
            ></div>
          </div>
        )}

        <div
          className={`${customClasses.alignVerticalCenter} ${customClasses.selectChoice}`}
        >
          <div className={classNames(customClasses.flex)}>
            <FormControl
              size="small"
              sx={{ minWidth: 240 }}
              className={classNames(
                classes.flexRow,
                globalClasses.verticalAlignCenter
              )}
            >
              <label className={globalClasses.extraButtonStyle}>
                Select Choice
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
            <div className={classNames(customClasses.flex)}>
              <div
                className={customClasses.lineSeparator}
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
          </div>
        </div>
      </>
    );
  };

  const shouldShowReviewTable =
    (openReviewRecommendationTable ||
      openRecommendationTableForDraftAndApprove) &&
    !openSidePanel;

  const renderReviewRecommendationTable = () => {
    if (!shouldShowReviewTable || !formData.hasOwnProperty("week_month_list"))
      return <img src={NoDataDisplay} />;

    return (
      <PoRebalanceReviewRecommendationTable
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
    );
  };

  const onApprove = () => {
    PoRebalanceReviewRecommendationTableRef.current.onApprovePO();
  };

  const onSaveDraft = () => {
    PoRebalanceReviewRecommendationTableRef.current.onSaveDraft();
  };

  const isApproveDisabled = () => {
    if (
      !shouldShowReviewTable ||
      props.poRebalanceTableFieldsLoader ||
      props.poRebalanceSubClassTableDataLoader
    )
      return true;
    if (!isEmpty(props.userAccess)) {
      return !isUserHasApprovePoRebalanceAccess || hideSaveApprove;
    }
    return hideSaveApprove;
  };

  const isSaveDraftDisabled = () => {
    if (
      !shouldShowReviewTable ||
      props.poRebalanceTableFieldsLoader ||
      props.poRebalanceSubClassTableDataLoader
    )
      return true;
    if (!isEmpty(props.userAccess)) {
      return !isUserHasSaveDraftAccess || hideSaveDraft;
    }
    return hideSaveDraft;
  };

  return (
    <div className={classes.autoOverflowWrapper}>
      {pageLoader ? (
        <div className={customClasses.loaderContainer}>
          <Loader progress="" size="large" text="" />
        </div>
      ) : (
        <AgGridComponent
          topRightOptions={getTopRightOptions()}
          uniqueRowId={"aggr_column"}
          rowModelType="serverSide" // infinite
          paginationPageSize={100}
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
          pagination={true} // false
          rowSelection="multiple"
          rowMultiSelectWithClick={true}
          suppressRowClickSelection={false}
          hideSelectAllRecords={true}
          hideChildSelection={true}
          selectAllHeaderComponent={true}
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
                <div className={customClasses.badgeContainer}>
                  <div className={customClasses.badge}>
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
                    className={customClasses.visibilityIcon}
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
      )}

      {openPopUp && (
        <ReviewRecommendationPopUp
          setShowSetAllModal={setOpenPopUp}
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
        />
      )}

      {selectedSubClass && (
        <PoRebalanceSizeChoiceTable
          payloadData={props}
          selectedSubClass={selectedSubClass}
          filters={poRebalanceFiltersRef.current}
          setSelectedSubClass={setSelectedSubClass}
          startWeekId={props.startWeekId}
          endWeekId={props.endWeekId}
        />
      )}

      {/* {(openReviewRecommendationTable ||
        openRecommendationTableForDraftAndApprove) &&
        !openSidePanel && (
          <PoRebalanceReviewRecommendationTable
            popUpWeekData={popUpWeekData}
            selectedRecords={selectedRecords}
            startWeekId={props.startWeekId}
            endWeekId={props.endWeekId}
            setOpenReviewRecommendationTable={setOpenReviewRecommendationTable}
            setOpenRecommendationTableForDraftAndApprove={
              setOpenRecommendationTableForDraftAndApprove
            }
            setIsApprove={setIsApprove}
            choiceTableColumns={choiceTableColumnsDataForPopUp}
          />
        )} */}

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
