import { Button, Typography } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import globalStyles from "core/Styles/globalStyles";
import Loader from "core/Utils/Loader/loader";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import ConfirmBox from "core/Utils/confirmPrompt/confirmPopup";
import { dateValidationMessage } from "core/Utils/functions/helpers/validation-helpers";
import { setFilterConfiguration } from "core/actions/filterAction";
import { addSnack } from "core/actions/snackbarActions";
import { setVendorData } from "core/actions/vendorActions";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import { customSetAllField } from "core/commonComponents/coreComponentScreen/constants";
import {
  fetchFilterFieldValues,
  fetchTableData,
  formattedFilterConfiguration,
} from "core/commonComponents/coreComponentScreen/utils";
import DateRangePickerComponent from "core/commonComponents/dateRangePicker";
import { DEFAULT_DATE_FORMAT } from "config/constants";
import { Prompt } from "impact-ui";
import { isEmpty, isEqual, isNull, isUndefined, pickBy } from "lodash";
import moment from "moment";
import React, { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { useLocation } from "react-router-dom-v5-compat";

const useStyles = makeStyles((theme) => ({
  requiredField: {
    color: theme.palette.error.main,
    marginLeft: theme.typography.pxToRem(2),
  },
}));

// custom fields for set-all action
const customSetAllFields = [
  customSetAllField("start_date", "DateTimeField", "Start Date"),
  customSetAllField("end_date", "DateTimeField", "End Date"),
  customSetAllField("lead_time", "IntegerField", "Lead Time"),
];

const VendorDelivery = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  let location = useLocation();
  const [showloader, setLoader] = useState(true);
  const [tableColumn, setTableColumn] = useState([]);
  const [selectedVendorIds, setSelectedVendorIds] = useState([]);
  const [setAllData, updateSetAllData] = useState([]);
  const [tableInstance, setTableInstance] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [confirmBox, showConfirmBox] = useState(false);
  const [focusedInput, setfocusedInput] = useState(null);
  const [timePeriod, setTimePeriod] = useState([]);
  const [appliedTimePeriod, setAppliedTimePeriod] = useState([]);
  const onFilterDependency = useRef(null);
  const timePeriodRef = useRef([]);

  const onFocusChange = (input) => {
    setfocusedInput(input);
  };

  // date range picker setter
  const onTimePeriodChange = (start, end) => {
    const updatedTimePeriod = [start, end];
    setTimePeriod(updatedTimePeriod);
    timePeriodRef.current = updatedTimePeriod;
  };

  const setNewTableInstance = (params) => {
    setTableInstance(params);
  };

  const formatSetAllData = (data, vendorIds) => {
    if (!dateValidation(data.start_date, data.end_date)) {
      throw Error("Date is not correct");
    }
    const attributesObj = [
      {
        ...data,
      },
    ];
    return {
      attributes: attributesObj,
      codes: vendorIds,
    };
  };

  const dateValidation = (startDate, endDate) => {
    const errMessage = dateValidationMessage(startDate, endDate);
    if (errMessage) {
      displaySnackMessages(errMessage, "error");
      throw Error("Date is not correct");
    } else {
      const isStartDateInRange = moment(startDate).isBetween(
        appliedTimePeriod[0],
        appliedTimePeriod[1]
      );
      const isEndDateInRange = moment(endDate).isBetween(
        appliedTimePeriod[0],
        appliedTimePeriod[1]
      );

      if (!isStartDateInRange || !isEndDateInRange) {
        displaySnackMessages(
          "Input range should be in between filtered date range",
          "error"
        );
        throw Error("Date is not correct");
      }
    }
  };

  // updating ag-grid data
  const onSetAllApply = (data, agGrid) => {
    data = pickBy(data, function (value) {
      return !isUndefined(value) && value !== "";
    });
    if (!isEmpty(data)) {
      const dataSet = formatSetAllData(data, selectedVendorIds);
      updateSetAllData([...setAllData, dataSet]);
      let rowNodes = agGrid.api.getSelectedNodes();
      rowNodes.forEach((item) => {
        const startDate = moment(data.start_date, "YYYY-M-DD");
        const endDate = moment(data.end_date, "YYYY-M-DD");

        let updatedKeys = {};
        const flag = startDate;
        // generating required keys from start date to end date
        // 202201_lead_time, 202202_lead_time, 202203_lead_time etc
        while (flag.diff(endDate) <= 0) {
          updatedKeys = {
            ...updatedKeys,
            [`${flag.format("YYYYMM")}${"_"}${"lead_time"}`]: data.lead_time,
          };
          flag.add(1, "M");
        }

        const rowNode = agGrid.api.getRowNode(item.id);
        rowNode.setData({ ...rowNode.data, ...updatedKeys });
      });
      agGrid.api.flashCells({ rowNodes });
    }
  };

  useEffect(() => {
    const getInitialData = async () => {
      try {
        // setting default date range
        const defaultDateRangeDate = [moment(), moment().add(4, "M")];
        timePeriodRef.current = defaultDateRangeDate;
        setTimePeriod(defaultDateRangeDate);
        const data = await fetchFilterFieldValues(
          "VendorConfigurations",
          props.savedFilterSelection,
          props.screenName
        );
        if (isEmpty(props.filterDashboardConfiguration)) {
          const filterConfigData = [
            {
              filterSectionHeader: "Vendor/Merchant Category",
              filterDashboardData: data,
              isCrossDimensionFilter: false,
              customFilterComponent: {
                dimension: "product",
                component: dateRangePicker(),
              },
              screen_name: props.screenName,
            },
          ];
          const filterConfig = formattedFilterConfiguration(
            "vendorDeliveryFilterConfiguration",
            filterConfigData,
            "Vendor Delivery"
          );
          props.setFilterConfiguration(filterConfig);
        }

        setLoader(false);
      } catch (error) {
        setLoader(false);
      }
    };

    getInitialData();
  }, []);

  const onSelectionChanged = (event) => {
    // fetch all selected rows
    let selections = event.api.getSelectedRows().map((item) => {
      return {
        vendor_code: item.vendor_code,
        product_code: item.product_code,
        store_code: item.store_code,
      };
    });
    setSelectedVendorIds(selections);
  };

  const onSaveClick = () => {
    if (Object.keys(setAllData).length) {
      setShowModal(true);
    } else {
      displaySnackMessages("There is no change to save", "info");
    }
  };

  const onFilter = async (unsavedChangeCheck = false) => {
    if (setAllData.length !== 0 && unsavedChangeCheck) {
      showConfirmBox(true);
      throw Error("Unsaved changes");
    }
    try {
      if (
        timePeriodRef.current[0] === null ||
        timePeriodRef.current[1] === null
      ) {
        displaySnackMessages("Please select required fields", "error");
        return;
      }
      tableInstance.api?.refreshServerSideStore({ purge: true });
      tableInstance.api.deselectAll(true);
    } catch (error) {
      setLoader(false);
      displaySnackMessages("Something went wrong", "error");
    }
  };

  const onConfirm = async (setAllBody) => {
    try {
      setLoader(true);
      setShowModal(false);
      await setVendorData(
        { data: setAllBody },
        "core/vendor/delivery-constraints"
      )();
      tableInstance.api.deselectAll(true);
      setSelectedVendorIds([]);
      updateSetAllData([]);
      displaySnackMessages("Vendor delivery updated successfully", "success");
      setLoader(false);
    } catch (err) {
      const errMsg = !isEmpty(err.response.data.message)
        ? err.response.data.message
        : "Something went wrong";
      displaySnackMessages(errMsg, "error");
      setLoader(false);
    }
  };

  const handleConfirmBox = () => {
    updateSetAllData([]);
    onFilter(false);
    showConfirmBox(false);
  };

  const displaySnackMessages = (message, variance, onClose) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
        ...(onClose && { onClose: onClose }),
      },
    });
  };

  // individual cell update handler
  const onCellValueChanged = (params) => {
    const { colDef, newValue, data, rowIndex } = params;
    const columnAttributes = colDef.accessor.split("_");
    const columnType = columnAttributes.slice(1).join("_");
    const date = moment(columnAttributes[0]).format("YYYY-MM-DD");
    const cellCodes = {
      vendor_code: data.vendor_code,
      product_code: data.product_code,
      store_code: data.store_code,
    };
    let isEdited = false;

    // check if present in setAllData already
    let updatedSetAllData = setAllData.map((item) => {
      const { codes, attributes } = item;
      if (codes.length === 1 && isEqual(codes[0], cellCodes)) {
        if (
          isEqual(attributes[0].start_date, date) &&
          Object.keys(attributes[0]).includes(columnType)
        ) {
          isEdited = true;
          attributes[0][columnType] = newValue;
        }
      }

      return item;
    });

    if (isEdited) {
      // if yes then update in existing object
      updateSetAllData(updatedSetAllData);
    } else {
      //else add new object
      const dataSet = {
        attributes: [
          {
            start_date: date,
            end_date: date,
            [columnType]: parseInt(newValue),
          },
        ],
        codes: [cellCodes],
      };
      updateSetAllData([...setAllData, dataSet]);
    }

    const rowNode = tableInstance.api.getDisplayedRowAtIndex(rowIndex);
    tableInstance.api.flashCells({
      rowNodes: [rowNode],
      columns: [colDef.accessor],
    });
  };

  const dateRangePicker = () => {
    return (
      <div
        data-testid="filtertype"
        id={"vendor-delivery-daterangepicker"}
        className={globalClasses.filterGroupItemContainer}
      >
        <React.Fragment>
          <label className={globalClasses.label}>{"Date Range Picker"} </label>
          <span className={classes.requiredField}>*</span>
          <DateRangePickerComponent
            startDate={timePeriod[0]}
            endDate={timePeriod[1]}
            focusedInput={focusedInput}
            onDatesChange={onTimePeriodChange}
            onFocusChange={onFocusChange}
            weeklySelection={true}
            dateFormat={DEFAULT_DATE_FORMAT}
          />
        </React.Fragment>
      </div>
    );
  };

  const vendorDeliveryManualCallBack = async (
    manualbody,
    pageIndex,
    params
  ) => {
    if (isNull(onFilterDependency.current)) {
      return {
        data: [],
        totalCount: 0,
      }; // returning for server side pagination on ag grid
    }
    setLoader(true);
    let body = {
      filters: onFilterDependency.current,
      meta: {
        ...manualbody,
        search: manualbody.search,
        limit: { limit: 10, page: pageIndex + 1 },
      },
      headers: [],
      store_group_ids: [],
      calendar_range: [
        {
          start_date: timePeriodRef.current[0].format("YYYY-MM-DD"),
          end_date: timePeriodRef.current[1].format("YYYY-MM-DD"),
        },
      ],
    };

    try {
      let response = await fetchTableData(
        body,
        "core/vendor/get-delivery-constraints"
      );

      const vendorDeliveryData = response.data.data;
      let tableDataDelivery = vendorDeliveryData?.[0].table_data;
      let tableColumnsDelivery = agGridColumnFormatter(
        vendorDeliveryData[1].columns,
        {},
        false
      );

      tableDataDelivery = tableDataDelivery?.map((item) => {
        item.vendor_id = `${item.vendor_code}${item.product_code}${item.store_code}`;
        return item;
      });
      setAppliedTimePeriod(timePeriodRef.current);
      setTableColumn(tableColumnsDelivery);
      setLoader(false);
      return {
        data: tableDataDelivery,
        totalCount: response.data.total,
      }; // returning for server side pagination on ag grid
    } catch (err) {
      setLoader(false);
      displaySnackMessages("Something went wrong", "error");
    }
  };

  const onFilterDashboardClick = (dependencyData) => {
    onFilterDependency.current = dependencyData;
    onFilter(true);
  };

  return (
    <CoreComponentScreen
      pageLabel={"Vendor Delivery"}
      location={location}
      showPageRoute={false}
      // Filter dashboard props

      showFilterDashboard={true}
      filterConfigKey={"vendorDeliveryFilterConfiguration"}
      onApplyFilter={onFilterDashboardClick}
    >
      <Prompt
        isOpen={showModal}
        title="Confirm Changes"
        subHeading="Are you sure to save all your changes ?"
        infoList={[]}
        primaryButtonProps={{
          children: "Update",
          onClick: () => {
            onConfirm(setAllData);
            setShowModal(false);
          },
        }}
        tertiaryButtonProps={{
          children: "Close",
          onClick: () => setShowModal(false),
        }}
      />
      {confirmBox && (
        <ConfirmBox
          onClose={() => {
            showConfirmBox(false);
          }}
          onConfirm={() => handleConfirmBox()}
        />
      )}
      <Loader loader={showloader}>
        <div data-testid="resultContainer">
          <div className={globalClasses.marginTop}>
            <div
              className={`${globalClasses.flexRow} ${globalClasses.layoutAlignBetweenCenter} ${globalClasses.marginBottom}`}
            >
              <Typography variant="h4" gutterBottom>
                Filtered Vendor Delivery
              </Typography>
              <Button
                variant="contained"
                color="primary"
                onClick={async () => {
                  if (selectedVendorIds.length > 0) {
                    tableInstance.trigerSetAll(true);
                  } else {
                    displaySnackMessages(
                      "Please select atleast 1 row",
                      "error"
                    );
                    throw Error("row not selected");
                  }
                }}
              >
                Set All
              </Button>
            </div>
            {
              <AgGridComponent
                columns={tableColumn}
                selectAllHeaderComponent={true}
                uniqueRowId={"vendor_id"}
                sizeColumnsToFitFlag
                onSelectionChanged={onSelectionChanged}
                onGridChanged
                loadTableInstance={setNewTableInstance}
                onSetAllApply={onSetAllApply}
                customSetAllFields={customSetAllFields}
                onCellValueChanged={onCellValueChanged}
                manualCallBack={(body, pageIndex, params) =>
                  vendorDeliveryManualCallBack(body, pageIndex, params)
                }
                rowModelType="serverSide"
                serverSideStoreType="partial"
                cacheBlockSize={10}
              />
            }
          </div>
        </div>
        <div
          className={`${globalClasses.flexRow} ${globalClasses.gap} ${globalClasses.centerAlign} ${globalClasses.marginTop}`}
        >
          <Button
            variant="contained"
            color="primary"
            id="productSaveBtn"
            onClick={() => onSaveClick()}
          >
            Save
          </Button>
          <Button
            variant="outlined"
            color="primary"
            id="productCancelBtn"
            onClick={() => {
              if (setAllData.length !== 0) {
                showConfirmBox(true);
              } else {
                tableInstance?.api.deselectAll(true);
                displaySnackMessages("There is no new change", "info");
              }
            }}
          >
            Cancel
          </Button>
        </div>
      </Loader>
    </CoreComponentScreen>
  );
};

const mapDispatchToProps = {
  addSnack,
  setFilterConfiguration,
};

const mapStateToProps = (state) => {
  return {
    filterDashboardConfiguration:
      state.filterReducer.filterDashboardConfiguration[
        "vendorDeliveryFilterConfiguration"
      ],
    savedFilterSelection: state.filterReducer.savedFilterSelection,
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(VendorDelivery);
