import React, { useState, forwardRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import AgGridComponent from "core/Utils/agGrid";
import globalStyles from "core/Styles/globalStyles";
import classNames from "classnames";
import { useRef } from "react";
import { Grid } from "@mui/material";
import { Button } from "impact-ui-v3";
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
import { updateMFPData } from "modules/ada/services-ada/ada-dashboard/ada-dashboard-services";
import EditChoicePopUp from "./EditChoicePopUp";
import { isArray } from "lodash";
import LoadingOverlay from "core/Utils/Loader/loader";
import { numberFormattingWithCommas } from "modules/ada/utils-ada/utilityFunctions";

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
  const adaReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );

  var editDisableInEditHeirarchy =
    adaReducer?.clientConfig?.attribute_value?.attribute_value?.mfp
      ?.editDisableInEditHeirarchy;

  let mfpLabel =
    adaReducer?.tenantFilters?.view_edit_hierarchy_filters?.mfp?.label;

  let l0displayName =
    adaReducer?.tenantFilters?.view_edit_hierarchy_filters?.l0?.display_name;

  const dispatch = useDispatch();

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
        `Please approve the ${selectedRows[0]?.final_forecast} before editing.`
      );
    } else {
      setOpenEditPopUp(true);
    }
  };

  const onApproveClick = async () => {
    try {
      if (selectedRows.length === 0) {
        return infoHandler(dispatch, "No Selected Rows");
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
          channel: data?.channel,
          product_choice: data?.choice,
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
        fiscal_year_week: adaReducer?.xAxisStaticHistoricDates?.fiscal_ids,
        //choose: finalForecastType,
        filters,
        product_channel_name: filtersData,
      };

      let response = await updateMFPData(payload);
      if (response.data.status) {
        setLoader(false);
        props.setRefreshTable(true);
        return successHandler(dispatch, "Approved Successfully");
      } else {
        setLoader(false);
        return errorHandler(dispatch, "Something went wrong");
      }
      // } else {
      //   infoHandler(
      //     dispatch,
      //     "For multiple approve, please select a single final forecast type."
      //   );
      // }
    } catch (err) {
      setLoader(false);
      return errorHandler(dispatch, "Something went wrong");
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
          selectedRows[i].choice == selectedRows[j].choice &&
          selectedRows[i].channel == selectedRows[j].channel
        ) {
          return true;
        }
      }
    }
  };

  useEffect(() => {
    if (selectedRows.length === 0) {
      return;
    } else {
      if (allMFPSelected) {
        let isRepeatingChoice = repeatingChoice();
        if (isRepeatingChoice) {
          if (selectedRows.length < 10 && props?.rowData?.length > 10) {
            TableGridInstance.current.api.deselectAll();
            return infoHandler(
              dispatch,
              `please select a single final forecast type for particular ${l0displayName}`
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
            `please select a single final forecast type for particular ${l0displayName}`
          );
        }
      } else {
        let isRepeatingChoice = repeatingChoice();
        if (isRepeatingChoice) {
          if (selectedRows.length < 10 && props?.rowData?.length > 10) {
            TableGridInstance.current.api.deselectAll();
            return infoHandler(
              dispatch,
              `please select a single final forecast type for particular ${l0displayName}`
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
            `please select a single final forecast type for particular ${l0displayName}`
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
                Reset Selection
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
            {editDisableInEditHeirarchy
              ? `Set All ${mfpLabel}`
              : "Set All EP Feed"}
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
            Set All Adjusted User Forecast
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
                Approve Final Forecast
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
            tableHeader={`Demand Selection - Details Table`}
            showSaveTableConfig={false}
            topRightOptions={getTopRightOptions()}
            showSearchModalBtn={true}
            hideFormatSideBar={true}
            columns={props.columnData}
            rowdata={props.rowData}
            selectAllHeaderComponent
            //rowSelection="single"
            hideHeaderCheckboxComponent
            skipAutoSizeColumn
            onSelectionChanged={onSelectionChanged}
            loadTableInstance={loadTableInstance}
            enableRowSpan={true}
            rowSpanColumn={["choice"]}
            pagination={true}
            uniqueRowId={"id"}
            getRowData={getRowData}
            defaultTextFieldViewOnly
            noEditableCustomCellRender={(cellProps) => {
              if (
                cellProps.colDef?.accessor === "final_forecast" &&
                cellProps.data.is_selected
              ) {
                return (
                  <>
                    <div
                      style={{
                        alignItems: "center",
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      {cellProps.value}{" "}
                      <CheckCircleOutlineIcon
                        color="success"
                        style={{ fontSize: "1rem" }}
                      ></CheckCircleOutlineIcon>
                    </div>
                  </>
                );
              }
            }}
            customCellRenderer={(cellProps) => {
              if (
                cellProps.colDef.id !== "choice" &&
                cellProps.colDef.id !== "choice_desc" &&
                cellProps.colDef.id !== "final_forecast" &&
                cellProps.colDef.id !== "channel"
              ) {
                return (
                  <div>
                    {numberFormattingWithCommas(
                      cellProps.value,
                      getRoundOffValue(cellProps.colDef.formatter)
                    )}
                  </div>
                );
              }
            }}
          />
        </div>
      </LoadingOverlay>
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

export default DemandSelectionTableData;
