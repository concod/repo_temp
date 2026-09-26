import React, { useState, useEffect } from "react";
import classNames from "classnames";
import { useDispatch } from "react-redux";
import { BottomSheet } from "impact-ui-v3";
import { Typography } from "@mui/material";
import { Button, Select } from "impact-ui-v3";
import { FormControl } from "@mui/material";
import AgGridComponent from "core/Utils/agGrid";
import LoadingOverlay from "core/Utils/Loader/loader";
import globalStyles from "core/Styles/globalStyles";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import { addSnack } from "core/actions/snackbarActions";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import { createTableHeader } from "modules/oms/utils-oms/utils";
import {
  fetchFiscalWeeksData,
  packConfigColumnData,
  packConfigRowData,
} from "modules/oms/services-oms/common/common-services";

export default function PackConfigBottomSheet(props) {
  const [columnData, setColumnData] = useState([]);
  const [rowData, setRowData] = useState([]);
  const [loader, setLoader] = useState(false);
  const [isOpenViewBy, setIsOpenViewBy] = useState(false);
  const globalClasses = globalStyles();
  const classes = useStyles();
  const [fiscalWeekDropdownOptions, setFiscalWeekDropdownOptions] = useState(
    []
  );
  const [selectedFiscalWeekOptions, setSelectedFiscalWeekOptions] = useState(
    []
  );
  const [secondTableRowData, setSecondTableRowData] = useState([]);
  const [secondColumnData, setSecondColumnData] = useState([]);
  const [firstLoad, setFirstLoad] = useState(false);

  const dispatch = useDispatch();

  // calculate sum of all "total" column data - user adjusted ROQ (eaches) Total
  const calculateTotalSum = (rowData, columnData) => {
    if (!rowData || !columnData) return 0;

    const totalColumn = columnData.find((col) => col.column_name === "total");
    if (!totalColumn) return 0;

    let sum = 0;
    rowData.forEach((row) => {
      const value = row[totalColumn.column_name];
      if (value !== undefined && value !== null && !isNaN(value)) {
        sum += Number(value);
      }
    });

    return sum;
  };

  const getFirstTopLeftOptions = () => {
    return (
      <>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {createTableHeader(
            props.l1DisplayName,
            props.activeChildHierarchyKey
          )}
          {props.productDescriptionName &&
            createTableHeader(
              props.productDescriptionName,
              props.activeChildHierarchyDescription
            )}
          {props?.screenName === "matrix_summary" && (
            <div style={{ display: "flex", alignItems: "center" }}>
              <Typography
                style={{
                  fontSize: "12px",
                  fontWeight: "500",
                  lineHeight: "14px",
                }}
              >
                {"Order Week"}: &nbsp;{" "}
              </Typography>
              <Typography
                style={{
                  fontSize: "14px",
                  fontWeight: "700",
                  lineHeight: "14px",
                }}
              >
                {selectedFiscalWeekOptions[0]?.label}
              </Typography>
            </div>
          )}
          {/* Display User Adjusted ROQ Total adjacent to Order Week */}
          {(props?.screenName === "matrix_summary" ||
            props?.screenName === "style_order_summary") &&
            rowData.length > 0 && (
              <div style={{ display: "flex", alignItems: "center" }}>
                <Typography
                  style={{
                    fontSize: "12px",
                    fontWeight: "500",
                    lineHeight: "14px",
                  }}
                >
                  {"User Adjusted ROQ (eaches) Total"}:&nbsp;
                </Typography>
                <Typography
                  style={{
                    fontSize: "14px",
                    fontWeight: "700",
                    lineHeight: "14px",
                  }}
                >
                  {calculateTotalSum(rowData, columnData).toLocaleString()}
                </Typography>
              </div>
            )}
        </div>
      </>
    );
  };

  const getSecondTopLeftOptions = () => {
    return (
      <>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {createTableHeader(
            props.l1DisplayName,
            props.activeChildHierarchyKey
          )}
          {props.productDescriptionName &&
            createTableHeader(
              props.productDescriptionName,
              props.activeChildHierarchyDescription
            )}
          {props?.screenName === "matrix_summary" && (
            <div style={{ display: "flex", alignItems: "center" }}>
              <Typography
                style={{
                  fontSize: "12px",
                  fontWeight: "500",
                  lineHeight: "14px",
                }}
              >
                {"Order Week"}: &nbsp;{" "}
              </Typography>
              <Typography
                style={{
                  fontSize: "14px",
                  fontWeight: "700",
                  lineHeight: "14px",
                }}
              >
                {selectedFiscalWeekOptions[1]?.label}
              </Typography>
            </div>
          )}
          {/* Display User Adjusted ROQ Total adjacent to Order Week for second table */}
          {props?.screenName === "matrix_summary" &&
            secondTableRowData.length > 0 && (
              <div style={{ display: "flex", alignItems: "center" }}>
                <Typography
                  style={{
                    fontSize: "12px",
                    fontWeight: "500",
                    lineHeight: "14px",
                  }}
                >
                  {"User Adjusted ROQ (eaches) Total"}:&nbsp;
                </Typography>
                <Typography
                  style={{
                    fontSize: "14px",
                    fontWeight: "700",
                    lineHeight: "14px",
                  }}
                >
                  {calculateTotalSum(
                    secondTableRowData,
                    secondColumnData
                  ).toLocaleString()}
                </Typography>
              </div>
            )}
        </div>
      </>
    );
  };

  const updateResponse = async () => {
    setColumnData([]);
    setRowData([]);
    setSecondColumnData([]);
    setSecondTableRowData([]);

    if (props?.screenName === "matrix_summary" && isFiscalWeekOptionsValid()) {
      setLoader(true);
      setColumnData([]);
      setRowData([]);
      setSecondColumnData([]);
      setSecondTableRowData([]);

      // First fiscal week data
      const firstPayload = {
        style: props.activeChildHierarchyKey,
        fiscal_week: selectedFiscalWeekOptions[0].value,
        screen: props?.screenName,
      };

      // Second fiscal week data
      const secondPayload = {
        style: props.activeChildHierarchyKey,
        fiscal_week: selectedFiscalWeekOptions?.[1]?.value,
        screen: props?.screenName,
      };

      try {
        const columnResponse = await packConfigColumnData(firstPayload);
        if (columnResponse.data.status) {
          console.log("columnResponse", columnResponse);
          const formattedColumnData = agGridColumnFormatter(
            columnResponse.data.data,
            null,
            null,
            null,
            null,
            null,
            null,
            true
          );
          setColumnData(formattedColumnData);
        }
        const firstRowResponse = await packConfigRowData(firstPayload);
        if (firstRowResponse.data.status) {
          const formattedRowData = agGridRowFormatter(
            firstRowResponse.data.data
          );
          setRowData(formattedRowData);
        }
        if (
          selectedFiscalWeekOptions?.[1]?.value ||
          selectedFiscalWeekOptions?.length > 1
        ) {
          const secondColumnResponse = await packConfigColumnData(
            secondPayload
          );
          if (secondColumnResponse.data.status) {
            console.log("columnResponse", secondColumnResponse);
            const formattedColumnData = agGridColumnFormatter(
              secondColumnResponse.data.data,
              null,
              null,
              null,
              null,
              null,
              null,
              true
            );
            setSecondColumnData(formattedColumnData);
          }
          const secondRowResponse = await packConfigRowData(secondPayload);
          if (secondRowResponse.data.status) {
            const formattedRowData = agGridRowFormatter(
              secondRowResponse.data.data
            );
            setSecondTableRowData(formattedRowData);
          }
        }
      } catch (error) {
        console.log("error", error);
      } finally {
        setLoader(false);
      }
    } else if (props.screenName !== "matrix_summary") {
      const payload = {
        style: props.activeChildHierarchyKey,
        screen: props?.screenName,
      };
      if (props.packConfigDetailsPayloadData?.fiscal_week) {
        payload.fiscal_week = props.packConfigDetailsPayloadData.fiscal_week;
      } else if (props.packConfigDetailsPayloadData?.column?.accessor) {
        payload.fiscal_week = props.packConfigDetailsPayloadData.column.accessor.replace(
          ".order_quantity_eaches",
          ""
        );
      }

      // for style order summary
      if (props.packConfigDetailsPayloadData?.order_group_id) {
        payload.order_group_id =
          props.packConfigDetailsPayloadData.order_group_id;
      }

      const fetchColumnData = async () => {
        setLoader(true);
        const columnResponse = await packConfigColumnData(payload);
        if (columnResponse.data.status) {
          console.log("columnResponse", columnResponse);
          const formattedColumnData = agGridColumnFormatter(
            columnResponse.data.data,
            null,
            null,
            null,
            null,
            null,
            null,
            true
          );
          setColumnData(formattedColumnData);
        }
      };
      fetchColumnData();
      const fetchRowData = async () => {
        setLoader(true);
        const response = await packConfigRowData(payload);
        if (response.data.status) {
          const formattedRowData = agGridRowFormatter(response.data.data);
          setRowData(formattedRowData);
          setLoader(false);
        }
        // console.log('ss1234',response)
      };
      fetchRowData();
    }
  };

  const fetchFiscalWeeks = async () => {
    try {
      const payload = {
        style: props.activeChildHierarchyKey,
        screen: props?.screenName,
      };
      const response = await fetchFiscalWeeksData(payload);
      if (response.data.status) {
        console.log("fiscal weeks", response.data.data);
        const formattedOptions = response.data.data.map((week) => ({
          label: week.label, // Assuming the response has a label field
          value: week.fiscal_week, // Assuming the response has a fiscal_week_key field
        }));
        // Automatically select the first 2 fiscal weeks if available
        if (formattedOptions.length > 0) {
          const selectedOptions = formattedOptions.slice(0, 2); // Take only first 2 items
          setSelectedFiscalWeekOptions(selectedOptions);
          setFirstLoad(true);
        }
        setFiscalWeekDropdownOptions(formattedOptions);
      }
    } catch (error) {
      console.log("error", error);
    }
  };

  useEffect(() => {
    if (props.screenName === "matrix_summary") {
      fetchFiscalWeeks();
    } else {
      // For other screens, call updateResponse directly
      updateResponse();
    }
  }, []);

  const handleFiscalWeekChange = (selectedOptions) => {
    console.log("selectedOptions", selectedOptions);
    // Store previous selection for reset functionality
    const prevSelection = selectedFiscalWeekOptions;

    // Get unique fiscal weeks from both previous and new selections
    const combinedSelections = [
      ...new Set([
        ...prevSelection.map((item) => item.value),
        ...selectedOptions.map((item) => item.value),
      ]),
    ];
    console.log(
      "combinedSelections",
      combinedSelections,
      prevSelection,
      combinedSelections.length
    );

    // Check if combined unique selections would exceed 2
    if (combinedSelections.length > 2) {
      setSelectedFiscalWeekOptions(prevSelection);
      displaySnackMessages("You can only select up to 2 order weeks", "error");
      return;
    }

    // Update state with new selection
    setSelectedFiscalWeekOptions(selectedOptions);
    // Only call updateResponse when exactly 2 fiscal weeks are selected
    // if (selectedOptions.length === 2) {
    //   updateResponse();
    // }
  };

  const isFiscalWeekOptionsValid = () => {
    return (
      selectedFiscalWeekOptions.length === 2 ||
      selectedFiscalWeekOptions.length === 1
    );
  };

  useEffect(() => {
    if (isFiscalWeekOptionsValid()) {
      updateResponse();
    }
  }, [firstLoad]);

  const onDropdownClose = () => {
    if (isFiscalWeekOptionsValid()) {
      updateResponse();
    }
  };

  const displaySnackMessages = (message, variant) => {
    try {
      dispatch(
        addSnack({
          message: message,
          options: {
            variant: variant,
          },
        })
      );
    } catch (error) {
      console.error("displaySnackMessages error", error);
    }
  };

  return (
    <>
      <BottomSheet
        label="Default"
        open={props.openPackConfigDetailSheet}
        onClose={() => props.setOpenPackConfigDetailSheet(false)}
        title="Pack Config Details"
        onPrimaryButtonClick={() => props.setOpenPackConfigDetailSheet(false)}
        onSecondaryButtonClick={() => props.setOpenPackConfigDetailSheet(false)}
        footerOptions={
          <Button
            variant="primary"
            onClick={() => props.setOpenPackConfigDetailSheet(false)}
          >
            Close
          </Button>
        }
      >
        {props?.screenName === "matrix_summary" && (
          <FormControl
            size="small"
            sx={{ minWidth: 240 }}
            className={classNames(
              classes.flexRow,
              globalClasses.verticalAlignCenter
            )}
            style={{ marginLeft: "40%", marginBottom: "22px" }}
          >
            <label style={{ marginRight: "6px" }}>Order Week Selection</label>
            <Select
              id=""
              withPortal={true}
              placeholder="Select Order Week"
              currentOptions={fiscalWeekDropdownOptions}
              initialOptions={fiscalWeekDropdownOptions}
              selectedOptions={selectedFiscalWeekOptions}
              handleChange={handleFiscalWeekChange}
              onDropdownClose={onDropdownClose}
              setSelectedOptions={setSelectedFiscalWeekOptions}
              isOpen={isOpenViewBy}
              setIsOpen={setIsOpenViewBy}
              setCurrentOptions={() => {}}
              setIsSelectAll={() => {}}
              isMulti={true}
            />
          </FormControl>
        )}

        <>
          {rowData.length > 0 && (
            <div>
              <LoadingOverlay
                loader={loader}
                wrapperPosition="static"
                isCustomLoader={true}
              >
                <AgGridComponent
                  rowdata={rowData}
                  columns={columnData}
                  selectAllHeaderComponent={false}
                  onGridChanged
                  onRowSelected
                  cacheBlockSize={10}
                  tableHeader={getFirstTopLeftOptions()}
                />
              </LoadingOverlay>
            </div>
          )}

          {/* Second Table will only render in matrix summary when 2 fiscal weeks are selected */}
          {props?.screenName === "matrix_summary" &&
            secondTableRowData.length > 0 && (
              <div>
                <LoadingOverlay
                  loader={loader}
                  wrapperPosition="static"
                  isCustomLoader={true}
                >
                  <AgGridComponent
                    rowdata={secondTableRowData}
                    columns={secondColumnData}
                    selectAllHeaderComponent={false}
                    onGridChanged
                    onRowSelected
                    cacheBlockSize={10}
                    tableHeader={getSecondTopLeftOptions()}
                  />
                </LoadingOverlay>
              </div>
            )}
        </>
      </BottomSheet>
    </>
  );
}
