import React, { useState, forwardRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import AgGridComponent from "core/Utils/agGrid";
import globalStyles from "core/Styles/globalStyles";
import classNames from "classnames";
import { useRef } from "react";
import { Grid } from "@mui/material";
import { Button, useTranslation } from "impact-ui-v3";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import EditIcon from "@mui/icons-material/Edit";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { useEffect } from "react";
import {
  infoHandler,
  successHandler,
  errorHandler,
} from "core/Utils/functions/helpers/errorhandler-helpers";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import {
  updateMFPData,
  checkLengthDownloadAdaVisualTable,
  downloadAdaForecastReport,
} from "modules/ada/services-ada/ada-dashboard/ada-dashboard-services";
import EditChoicePopUp from "./EditChoicePopUp";
import { isArray } from "lodash";
import LoadingOverlay from "core/Utils/Loader/loader";
import {
  getPaginationPageSize,
  handleHistoricTimePeriod,
  numberFormattingWithCommas,
} from "modules/ada/utils-ada/utilityFunctions";
import DownloadRowLimitPrompt from "modules/ada/utils-ada/DownloadRowLimitPrompt";

const DemandSelectionTableData = forwardRef((props, ref) => {
  const [loader, setLoader] = useState(false);
  const globalClasses = globalStyles();
  const classes = useStyles();
  const [selectedGraphFilters, setSelectedGraphFilters] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [filterApplied, setFilterApplied] = useState(false);
  const TableGridInstance = useRef(null);
  const [openEditPopUp, setOpenEditPopUp] = useState(false);
  const [popUpCloseCounter, setPopUpCloseCounter] = useState(0);
  const [allMFPSelected, setAllMFPSelected] = useState();
  const [allAUFSelected, setAllAUFSelected] = useState();
  const [downloadFileRows, setDownloadFileRows] = useState("-");
  const [showLengthFileExceedPrompt, setShowLengthFileExceedPrompt] = useState(
    false
  );
  const adaReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );

  const Mfp_Key =
    adaReducer?.clientConfig?.attribute_value?.attribute_value?.mfp?.mfp_level;

  var editDisableInEditHeirarchy =
    adaReducer?.clientConfig?.attribute_value?.attribute_value?.mfp
      ?.editDisableInEditHeirarchy;

  const isDemandSelectionViewOnly =
    adaReducer?.clientConfig?.attribute_value?.show_features
      ?.is_demand_selection_view_only;

  const adaModuleConfiguratorReducer = useSelector(
    (store) =>
      store?.adaReducer?.adaModuleConfiguratorReducer?.moduleConfiguratorData
  );
  const isFirstTimeLoad = useRef(true);
  let mfpLabel =
    adaReducer?.tenantFilters?.view_edit_hierarchy_filters?.mfp?.label;
  const customMFPLabel = adaModuleConfiguratorReducer?.client_forecast_name;

  const aliasColumnName =
    adaReducer?.tenantFilters?.view_edit_hierarchy_filters?.mfp?.alias_column;

  const edit_hierarchy_pagination_page_size =
    adaReducer?.clientConfig?.attribute_value
      ?.edit_hierarchy_pagination_page_size;

  const dispatch = useDispatch();
  const { t } = useTranslation();

  const getRowData = (params, columnName) => {
    return params?.data?.[columnName];
  };

  const loadTableInstance = (params) => {
    TableGridInstance.current = params;
  };
  const onSelectionChanged = (event) => {
    // fetch all selected rows
    let selectedRows = [];
    const rows = event.api.getSelectedRows();
    setSelectedRows(rows);
    // TableGridInstance.current.api.forEachNode((node) => {
    //   node.selected && selectedRows.push({ ...node.data });
    // });
    // setSelectedRows(selectedRows);
  };

  const onEditClick = () => {
    if (!selectedRows[0].is_selected && !editDisableInEditHeirarchy) {
      return infoHandler(
        dispatch,
        t("ada.demandSelection.approveBeforeEditing", {
          forecastType: selectedRows[0]?.final_forecast,
        })
      );
    } else {
      setOpenEditPopUp(true);
    }
  };

  const onApproveClick = async () => {
    try {
      if (selectedRows.length === 0) {
        return infoHandler(dispatch, t("ada.demandSelection.noSelectedRows"));
      }
      var payloadValid = true;
      let planData = [];
      let userForecastData = [];
      var finalForecastType = null;
      var filters = [];
      selectedRows.map((data) => {
        // if (data.flag == "ep feed") {
        //   planData.push(data);
        // }
        // if (data.flag == "Adjusted User Forecast") {
        //   userForecastData.push(data);
        // }
        filters.push({
          //instead of channel, using alias column name from tenant config
          [aliasColumnName]: data[aliasColumnName],
          product_choice: data?.[Mfp_Key],
          selected_final_forecast: data?.flag,
        });
      });

      // if (planData.length !== 0 && userForecastData.length !== 0) {
      //   payloadValid = false;
      // }
      // if (
      //   (planData.length !== 0 && userForecastData.length == 0) ||
      //   (userForecastData.length !== 0 && planData.length == 0)
      // ) {
      //   payloadValid = true;

      //   if (planData.length !== 0) {
      //     planData.map((data) => {
      //       filters.push({
      //         channel: data.channel,
      //         product_choice: data.choice,
      //       });
      //     });
      //     finalForecastType = planData[0]?.flag;
      //   }
      //   if (userForecastData.length !== 0) {
      //     userForecastData.map((data) => {
      //       filters.push({
      //         channel: data.channel,
      //         product_choice: data.choice,
      //       });
      //     });
      //     finalForecastType = userForecastData[0]?.flag;
      //   }
      // }

      // if (payloadValid) {
      let filtersData = [];
      setLoader(true);
      adaReducer.product?.reduce((acc, curr) => {
        if (curr?.filter_id === "product_channel_name") {
          isArray(curr.values)
            ? curr.values.map(({ value }) => filtersData.push(value))
            : curr.value;
        }
      }, {});
      let payload = {
        fiscal_year_week: handleHistoricTimePeriod(adaReducer),
        //choose: finalForecastType,
        filters,
        product_channel_name: filtersData,
      };

      let response = await updateMFPData(payload);
      if (response.data.status) {
        setLoader(false);
        props.setRefreshTable(true);
        return successHandler(
          dispatch,
          t("ada.demandSelection.approvedSuccessfully")
        );
      } else {
        setLoader(false);
        return errorHandler(
          dispatch,
          t("ada.demandSelection.somethingWentWrong")
        );
      }
      // } else {
      //   infoHandler(
      //     dispatch,
      //     "For multiple approve, please select a single final forecast type."
      //   );
      // }
    } catch (err) {
      setLoader(false);
      return errorHandler(
        dispatch,
        t("ada.demandSelection.somethingWentWrong")
      );
    }
  };

  const onSetAll = () => {
    setAllAUFSelected(false);
    setAllMFPSelected(true);
    let selectedRows = [];
    TableGridInstance.current.api.deselectAll();
    TableGridInstance.current.api.forEachNode((node) => {
      if (node.data && node.data.final_forecast === mfpLabel) {
        node.setSelected(true, false, true);
        selectedRows.push({ ...node.data });
        setSelectedRows(selectedRows);
      }
    });
  };

  const onSetAllAdjusted = () => {
    setAllMFPSelected(false);
    setAllAUFSelected(true);
    let selectedRows = [];
    TableGridInstance.current.api.deselectAll();
    TableGridInstance.current.api.forEachNode((node) => {
      if (node.data && node.data.final_forecast === "Adjusted User Forecast") {
        node.setSelected(true, false, true);
        selectedRows.push({ ...node.data });
        setSelectedRows(selectedRows);
      }
    });
  };

  const repeatingChoice = () => {
    var i, j;
    for (i = 0; i < selectedRows.length - 1; i++) {
      for (j = i + 1; j < selectedRows.length; j++) {
        if (
          selectedRows[i]?.[Mfp_Key] == selectedRows[j]?.[Mfp_Key] &&
          selectedRows[i].channel == selectedRows[j].channel
        ) {
          return true;
        }
      }
    }
  };

  useEffect(() => {
    if (
      isDemandSelectionViewOnly ||
      props.parentLoader ||
      !adaModuleConfiguratorReducer ||
      !TableGridInstance.current ||
      !adaModuleConfiguratorReducer?.default_final_forecast
    )
      return;

    if (isFirstTimeLoad.current) {
      setTimeout(() => {
        isFirstTimeLoad.current = false;
        if (
          adaModuleConfiguratorReducer.default_final_forecast ===
          "client_forecast"
        ) {
          onSetAll();
        } else {
          onSetAllAdjusted();
        }
      }, 100);
    }
  }, [props.parentLoader]);

  useEffect(() => {
    if (selectedRows.length === 0) {
      return;
    } else {
      let tableColumnLabel = props?.columnData[0]?.label;
      if (allMFPSelected) {
        let isRepeatingChoice = repeatingChoice();
        if (isRepeatingChoice) {
          if (selectedRows.length < 10 && props?.rowData?.length > 10) {
            TableGridInstance.current.api.deselectAll();
            return infoHandler(
              dispatch,
              `please select a single final forecast type for particular ${tableColumnLabel}`
            );
          }
          TableGridInstance.current.api.deselectAll();
          TableGridInstance.current.api.forEachNode((node) => {
            if (node.data && node.data.final_forecast === mfpLabel) {
              node.setSelected(true, false, true);
            }
          });
          return infoHandler(
            dispatch,
            `please select a single final forecast type for particular ${tableColumnLabel}`
          );
        }
      } else {
        let isRepeatingChoice = repeatingChoice();
        if (isRepeatingChoice) {
          if (selectedRows.length < 10 && props?.rowData?.length > 10) {
            TableGridInstance.current.api.deselectAll();
            return infoHandler(
              dispatch,
              `please select a single final forecast type for particular ${tableColumnLabel}`
            );
          }
          TableGridInstance.current.api.deselectAll();
          TableGridInstance.current.api.forEachNode((node) => {
            if (
              node.data &&
              node.data.final_forecast === "Adjusted User Forecast"
            ) {
              node.setSelected(true, false, true);
            }
          });
          return infoHandler(
            dispatch,
            `please select a single final forecast type for particular ${tableColumnLabel}`
          );
        }
      }
    }
  }, [selectedRows.length]);

  const onResetSelection = () => {
    TableGridInstance.current.api.deselectAll();
  };

  const getRoundOffValue = (val) => {
    if (val === "roundOff") {
      return 0;
    } else if (val === "roundOfftoOneDecimals") {
      return 1;
    } else if (val === "roundOfftoTwoDecimals") {
      return 2;
    } else if (val === "roundOfftoThreeDecimals") {
      return 3;
    }
    return 0;
  };
  function getValueFormatter(cellProps) {
    const formatter = cellProps.colDef.formatter;
    if (cellProps.colDef.formatter == "") {
      return adaReducer?.clientConfig?.attribute_value?.attribute_value
        ?.dashboard?.decimalConfig?.ForecastMultiplier;
    } else {
      return getRoundOffValue(formatter);
    }
  }
  const getTopRightOptions = () => {
    let options = [];
    options.push(
      <>
        {selectedRows.length >= 1 && (
          <>
            <div>
              <Button
                variant="secondary"
                id="createProductBtn"
                className={classes.button}
                onClick={onResetSelection}
              >
                {t("ada.demandSelection.resetSelection")}
              </Button>
            </div>
            <div className="divider-line"></div>
          </>
        )}
        <div>
          <Button
            variant="tertiary"
            id="createProductBtn"
            className={classes.button}
            //disabled={selectedRows.length > 10}
            onClick={onSetAll}
          >
            {mfpLabel
              ? t("ada.demandSelection.setAllLabelTemplate", {
                  label: customMFPLabel || mfpLabel,
                })
              : t("ada.demandSelection.setAllEpFeed")}
          </Button>
        </div>
        <div className="divider-line"></div>
        <div>
          <Button
            variant="tertiary"
            id="createProductBtn"
            className={classes.button}
            //disabled={selectedRows.length > 10}
            onClick={onSetAllAdjusted}
          >
            {t("ada.demandSelection.setAllAdjustedUserForecast")}
          </Button>
        </div>
        {selectedRows.length !== 0 && <div className="divider-line"></div>}
        {selectedRows.length !== 0 && (
          <>
            <div>
              <Button
                variant="primary"
                id="createProductBtn"
                className={classes.button}
                disabled={selectedRows.length === 0}
                onClick={onApproveClick}
              >
                {t("ada.demandSelection.approveFinalForecast")}
              </Button>
            </div>
            <div className="divider-line"></div>
          </>
        )}

        {editDisableInEditHeirarchy ? (
          selectedRows.length === 1 &&
          selectedRows[0]?.flag !== "Adjusted User Forecast" && (
            <div>
              <Button
                variant="tertiary"
                id="createProductBtn"
                className={classes.button}
                disabled={selectedRows.length > 1 || selectedRows.length == 0}
                onClick={onEditClick}
                icon={<VisibilityIcon fontSize="small"></VisibilityIcon>}
                iconPlacement="left"
              ></Button>
            </div>
          )
        ) : (
          <div>
            <Button
              variant="primary"
              id="createProductBtn"
              className={classes.button}
              disabled={selectedRows.length > 1 || selectedRows.length == 0}
              onClick={onEditClick}
              icon={<EditIcon fontSize="small"></EditIcon>}
              iconPlacement="left"
            ></Button>
          </div>
        )}
      </>
    );

    return options;
  };

  const getColumnData = (columnData) => {
    columnData?.forEach((column) => {
      if (column.accessor === "final_forecast") {
        column.cellRenderer = (params) => {
          return (
            <>
              <div
                style={{
                  alignItems: "center",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                {params.value === "MFP"
                  ? customMFPLabel || "MFP"
                  : params.value}
                {params.data.is_selected && (
                  <CheckCircleOutlineIcon
                    color="success"
                    style={{ fontSize: "1rem" }}
                  ></CheckCircleOutlineIcon>
                )}
              </div>
            </>
          );
        };
      }
    });
    return columnData;
  };

  const handleDownload = async () => {
    try {
      setLoader(true);

      let response = await checkLengthDownloadAdaVisualTable(
        props.tableDataPayload
      );
      const rowCount = response?.data?.data?.row_count ?? 0;
      if (rowCount > 100000) {
        setDownloadFileRows(rowCount);
        setShowLengthFileExceedPrompt(true);
      } else {
        await downloadAdaForecastReport(props.tableDataPayload);
        successHandler(
          dispatch,
          t("ada.demandSelection.downloadRequestRunning")
        );
      }
    } catch (err) {
      errorHandler(dispatch, t("ada.demandSelection.errorWhileDownloading"));
    } finally {
      setLoader(false);
    }
  };

  return (
    <>
      <LoadingOverlay loader={loader} isCustomLoader={false}>
        {/* <Grid
          container
          className={globalClasses.marginVertical1rem}
          justifyContent={"space-between"}
        ></Grid> */}
        <div className={classNames(globalClasses.marginVertical1rem)}>
          <AgGridComponent
            hideTableFormat={true}
            tableHeader={t("ada.demandSelection.tableHeader")}
            topRightOptions={
              isDemandSelectionViewOnly ? [] : getTopRightOptions()
            }
            showSearchModalBtn={true}
            hideFormatSideBar={true}
            paginationPageSize={getPaginationPageSize(
              edit_hierarchy_pagination_page_size
            )}
            columns={getColumnData(props.columnData)}
            rowdata={props.rowData}
            selectAllHeaderComponent={!isDemandSelectionViewOnly}
            //rowSelection="single"
            hideHeaderCheckboxComponent={isDemandSelectionViewOnly}
            skipAutoSizeColumn
            onSelectionChanged={
              isDemandSelectionViewOnly ? undefined : onSelectionChanged
            }
            loadTableInstance={loadTableInstance}
            enableRowSpan={true}
            rowSpanColumn={[Mfp_Key]}
            pagination={true}
            uniqueRowId={"id"}
            getRowData={getRowData}
            defaultTextFieldViewOnly
            showDownloadButton={
              adaReducer?.clientConfig?.attribute_value?.client === "Levis" ||
              adaReducer?.clientConfig?.attribute_value?.client ===
                "Victorias Secret"
            }
            onDownloadButtonClick={handleDownload}
            customCellRenderer={(cellProps) => {
              if (
                cellProps?.colDef?.type === "int" ||
                cellProps?.colDef?.type === "float"
              ) {
                // Check if value is the placeholder "-"
                if (
                  cellProps.value === "-" ||
                  cellProps.value === null ||
                  cellProps.value === undefined ||
                  cellProps.value === ""
                ) {
                  return <div>-</div>;
                }
                const roundOffValue = getValueFormatter(cellProps);
                return (
                  <div>
                    {numberFormattingWithCommas(cellProps.value, roundOffValue)}
                  </div>
                );
              }
            }}
          />
        </div>
      </LoadingOverlay>
      <DownloadRowLimitPrompt
        isOpen={showLengthFileExceedPrompt}
        rowCount={downloadFileRows}
        onPrimaryButtonClick={() => {
          setShowLengthFileExceedPrompt(false);
          setDownloadFileRows("-");
        }}
      />
      {openEditPopUp && (
        <EditChoicePopUp
          setShowSetAllModal={setOpenEditPopUp}
          popUpCloseCounter={popUpCloseCounter}
          setPopUpCloseCounter={setPopUpCloseCounter}
          selectedRows={selectedRows}
          ref={ref}
          {...props}
        />
      )}
    </>
  );
});

DemandSelectionTableData.displayName = "DemandSelectionTableData";

export default DemandSelectionTableData;
