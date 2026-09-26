import { Button } from "@mui/material";
import Typography from "@mui/material/Typography";
import globalStyles from "core/Styles/globalStyles";
import Loader from "core/Utils/Loader/loader";
import AgGridComponent from "core/Utils/agGrid";
import ConfirmBox from "core/Utils/confirmPrompt/confirmPopup";
import { setFilterConfiguration } from "core/actions/filterAction";
import { addSnack } from "core/actions/snackbarActions";
import { setVendorData } from "core/actions/vendorActions";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import {
  fetchFilterFieldValues,
  fetchTableColumnData,
  fetchTableData,
  formattedFilterConfiguration,
} from "core/commonComponents/coreComponentScreen/utils";
import { Prompt } from "impact-ui";
import { isEmpty, isNull, isUndefined, pickBy } from "lodash";
import { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";

const VendorOrdering = (props) => {
  const globalClasses = globalStyles();
  const [showloader, setLoader] = useState(true);
  const [tableColumn, setTableColumn] = useState([]);
  const [selectedVendorIds, setSelectedVendorIds] = useState([]);
  const [setAllData, updateSetAllData] = useState([]);
  const [tableInstance, setTableInstance] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [confirmBox, showConfirmBox] = useState(false);
  const onFilterDependency = useRef(null);

  const setNewTableInstance = (params) => {
    setTableInstance(params);
  };

  const formatData = (data, vendorIds) => {
    const attributesObj = Object.keys(data).map((item) => {
      return {
        attribute_name: item,
        attribute_value: data[item],
      };
    });
    return {
      attributes: attributesObj,
      codes: vendorIds,
    };
  };

  // updating ag-grid data
  const onSetAllApply = (data, agGrid) => {
    data = pickBy(data, function (value) {
      return !isUndefined(value) && value !== "";
    });
    if (!isEmpty(data)) {
      const dataSet = formatData(data, selectedVendorIds);
      updateSetAllData([...setAllData, dataSet]);
      let rowNodes = agGrid.api.getSelectedNodes();
      rowNodes.forEach((item) => {
        const rowNode = agGrid.api.getRowNode(item.id);
        Object.keys(data).forEach((attribute) => {
          rowNode.setDataValue(attribute, data[attribute]);
        });
      });
      agGrid.api.flashCells({ rowNodes });
    }
  };

  useEffect(() => {
    const getInitialData = async () => {
      try {
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
              screen_name: props.screenName
            }
          ];
          const filterConfig = formattedFilterConfiguration(
            "vendorOrderingFilterConfiguration",
            filterConfigData,
            "Vendor Ordering"
          );
          props.setFilterConfiguration(filterConfig);
        }

        let colData = await fetchTableColumnData("vendor_ordering");
        colData = colData.map((item) => {
          if (item.column_name === "vendor_code") {
            item.type = "int";
          }
          // item.disabled = true;
          return item;
        });
        setTableColumn(colData);
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
      tableInstance.api?.refreshServerSideStore({ purge: true });
      tableInstance.api.deselectAll(true);
    } catch (error) {
      setLoader(false);
    }
  };

  const onConfirm = async (setAllBody) => {
    try {
      setLoader(true);
      setShowModal(false);
      await setVendorData(
        { data: setAllBody },
        "core/vendor/order-constraints"
      )();
      tableInstance.api.deselectAll(true);
      setSelectedVendorIds([]);
      updateSetAllData([]);
      displaySnackMessages("Vendor order updated successfully", "success");
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

  const vendorOrderingManualCallBack = async (
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
    };
    try {
      let response = await fetchTableData(
        body,
        "core/vendor/order-constraints"
      );
      setLoader(false);
      return {
        data: response.data.data,
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
      pageLabel={"Vendor Ordering"}
      showPageRoute={false}
      // Filter dashboard props
      showFilterDashboard={true}
      filterConfigKey={"vendorOrderingFilterConfiguration"}
      onApplyFilter={onFilterDashboardClick}
    >
      <Prompt
        isOpen={showModal}
        title="Confirm Changes"
        subHeading="Are you sure to save all your changes ?"
        infoList={[]}
        primaryButtonProps={{
          children: "Update", onClick: () => {
            onConfirm(setAllData);
            setShowModal(false)
          }
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
              <Typography style={{ flex: 1 }} variant="h4" gutterBottom>
                Filtered Vendor Ordering
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
            {tableColumn.length > 0 && (
              <AgGridComponent
                columns={tableColumn}
                selectAllHeaderComponent={true}
                uniqueRowId={"vendor_id"}
                sizeColumnsToFitFlag
                onSelectionChanged={onSelectionChanged}
                onGridChanged
                loadTableInstance={setNewTableInstance}
                onSetAllApply={onSetAllApply}
                manualCallBack={(body, pageIndex, params) =>
                  vendorOrderingManualCallBack(body, pageIndex, params)
                }
                rowModelType="serverSide"
                serverSideStoreType="partial"
                cacheBlockSize={10}
              />
            )}
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
      "vendorOrderingFilterConfiguration"
      ],
    savedFilterSelection: state.filterReducer.savedFilterSelection,
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(VendorOrdering);
