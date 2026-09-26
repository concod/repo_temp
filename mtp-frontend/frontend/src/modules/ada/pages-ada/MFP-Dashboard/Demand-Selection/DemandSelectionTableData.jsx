import React, { useState, forwardRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import AgGridComponent from "core/Utils/agGrid";
import globalStyles from "core/Styles/globalStyles";
import classNames from "classnames";
import { useRef } from "react";
import { Button, Grid } from "@mui/material";
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
      if (node.data && node.data.final_forecast === "MFP") {
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
              "please select a single final forecast type for particular choice"
            );
          }
          TableGridInstance.current.api.deselectAll();
          TableGridInstance.current.api.forEachNode((node) => {
            if (node.data && node.data.final_forecast === "MFP") {
              node.setSelected(true, false, true);
            }
          });
          return infoHandler(
            dispatch,
            "please select a single final forecast type for particular choice"
          );
        }
      } else {
        let isRepeatingChoice = repeatingChoice();
        if (isRepeatingChoice) {
          if (selectedRows.length < 10 && props?.rowData?.length > 10) {
            TableGridInstance.current.api.deselectAll();
            return infoHandler(
              dispatch,
              "please select a single final forecast type for particular choice"
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
            "please select a single final forecast type for particular choice"
          );
        }
      }
    }
  }, [selectedRows.length]);

  const onResetSelection = () => {
    TableGridInstance.current.api.deselectAll();
  };

  return (
    <>
      <LoadingOverlay loader={loader} isCustomLoader={false}>
        <Grid
          container
          className={globalClasses.marginVertical1rem}
          justifyContent={"space-between"}
        >
          <Grid item xs={12} container justifyContent={"flex-end"}>
            {selectedRows.length > 10 && (
              <Button
                variant="outlined"
                color="primary"
                id="createProductBtn"
                className={classes.button}
                onClick={onResetSelection}
              >
                Reset Selection
              </Button>
            )}
            <Button
              variant="contained"
              color="primary"
              id="createProductBtn"
              className={classes.button}
              //disabled={selectedRows.length > 10}
              onClick={onSetAll}
            >
              {editDisableInEditHeirarchy ? "Set All MFP" : "Set All EP Feed"}
            </Button>
            <Button
              variant="contained"
              color="primary"
              id="createProductBtn"
              className={classes.button}
              //disabled={selectedRows.length > 10}
              onClick={onSetAllAdjusted}
            >
              Set All Adjusted User Forecast
            </Button>

            <Button
              variant="contained"
              color="primary"
              id="createProductBtn"
              className={classes.button}
              disabled={selectedRows.length === 0}
              onClick={onApproveClick}
            >
              Approve Final Forecast
            </Button>

            {editDisableInEditHeirarchy ? (
              selectedRows.length === 1 &&
              selectedRows[0]?.flag !== "Adjusted User Forecast" && (
                <Button
                  variant="outlined"
                  color="primary"
                  id="createProductBtn"
                  className={classes.button}
                  disabled={selectedRows.length > 1 || selectedRows.length == 0}
                  onClick={onEditClick}
                  //disabled={ishide}
                >
                  <VisibilityIcon fontSize="small"></VisibilityIcon>
                </Button>
              )
            ) : (
              <Button
                variant="outlined"
                color="primary"
                id="createProductBtn"
                className={classes.button}
                disabled={selectedRows.length > 1 || selectedRows.length == 0}
                onClick={onEditClick}
                //disabled={ishide}
              >
                <EditIcon fontSize="small"></EditIcon>
              </Button>
            )}
          </Grid>
        </Grid>
        <div className={classNames(globalClasses.marginVertical1rem)}>
          <AgGridComponent
            showSaveTableConfig={false}
            showSearchModalBtn={true}
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
