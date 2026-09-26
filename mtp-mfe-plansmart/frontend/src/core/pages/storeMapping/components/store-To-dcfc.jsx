import React, { useEffect, useState, useRef } from "react";
import { connect } from "react-redux";
import Loader from "../../../Utils/Loader/loader";
import "./filter.scss";
import Button from "@mui/material/Button";
import { Switch } from "impact-ui";
import globalStyles from "core/Styles/globalStyles";
import Typography from "@mui/material/Typography";
import ConfirmBox from "../../../Utils/confirmPrompt/confirmPopup";
import {
  getAllStoreDC,
  mapStoretoDC,
  mapStoretoFC,
  getAllFC,
  getAllDC,
} from "../services/storeMappingService";
import { setProductStatusData } from "../../../actions/productStoreStatusActions";
import { getColumnsAg } from "../../../actions/tableColumnActions";
import { Dialog, DialogActions, DialogContent } from "@mui/material";
import { addSnack } from "core/actions/snackbarActions";
import AgGridTable from "core/Utils/agGrid";
import { isNull, cloneDeep, isEmpty } from "lodash";
import { getDCFCSetAllPayload } from "core/pages/product-mapping/components/common-functions";

import {
  fetchFilterFieldValues,
  formattedFilterConfiguration,
} from "core/commonComponents/coreComponentScreen/utils";
import { setFilterConfiguration } from "core/actions/filterAction";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";

import { isActionAllowedOnSubModule } from "core/Utils/utils";
import { INVENTORY_SUBMODULES_NAMES } from "core/Utils/constants/inventorySmart-constants";
import { checkToDisplayToggleAttributeLevel } from "core/Utils/functions/utils";
import { Prompt as IaPrompt } from "impact-ui";

function StoretoDCFC(props) {
  const [showloader, setloader] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedRowsIDs, setSelectedRowsIDs] = useState([]);
  const [confirmBox, showConfirmBox] = useState(false);
  const [setAllDataDC, updatesetAllDataDC] = useState([]);
  const [setAllDataFC, updatesetAllDataFC] = useState([]);
  const [fcData, setfcData] = useState([]);
  const [dcData, setdcData] = useState([]);
  // const [fcDefaultData, setfcDefaultData] = useState([]);
  const [dcDefaultData, setdcDefaultData] = useState([]);
  const [fcCols, setfcCols] = useState([]);
  const [dcCols, setdcCols] = useState([]);
  // const [storeStatusValues, setStoreStatusValue] = useState([]);
  const [toggleFcValue, setToggleFcValue] = useState(false);
  const globalClasses = globalStyles();

  /**
   * state variables for filters
   */
  const filterDependencyRef = useRef(null);
  const dcfcTableRef = useRef(null);

  const [showFCLevelView, setShowFCLevelView] = useState(true); //State variable to show fc level

  useEffect(() => {
    const getInitialData = async () => {
      try {
        let agGridDcCols = await getColumnsAg("table_name=store_dc")();

        let agGridFcCols = await getColumnsAg("table_name=store_fc")();
        // let permissionCheck = canTakeActionOnModules(
        //   INVENTORY_SUBMODULES_NAMES.INVENTORY_STORE_MAPPING_STORE_DC_FC,
        //   "edit"
        // );

        agGridDcCols = agGridDcCols.map(async (col) => {
          if (col.column_name === "dc_map") {
            //col.is_editable = props.isSuperUser; //Commenting for now because of set all issue because if is_editable is false, user can't see fields in set all dialog
            col.isMulti = true;
            const { data: dcOptions } = await getAllDC()();
            col.options = dcOptions.data.map((opt) => {
              return {
                label: opt.name,
                id: `${opt.dc_code}`,
                value: `${opt.dc_code}`,
              };
            });
          }
          return col;
        });

        agGridDcCols = await Promise.all(agGridDcCols);
        agGridFcCols = agGridFcCols.map(async (col) => {
          if (col.column_name === "dc_map") {
            //col.is_editable = props.isSuperUser; //Commenting for now because of set all issue because if is_editable is false, user can't see fields in set all dialog
            col.isMulti = true;
            const { data: fcOptions } = await getAllFC()();
            col.options = fcOptions.data.map((opt) => {
              return {
                label: opt.name,
                id: `${opt.fc_code}`,
                value: `${opt.fc_code}`,
              };
            });
          }
          return col;
        });
        agGridFcCols = await Promise.all(agGridFcCols);
        let data = await fetchFilterFieldValues(
          "store mapping",
          props.savedFilterSelection,
          props.screenName
        );
        if (isEmpty(props.filterDashboardConfiguration)) {
          let filterConfigData = [
            {
              filterDashboardData: data,
              isCrossDimensionFilter: true,
              screen_name: props.screenName,
            },
          ];
          if (sessionStorage.getItem("currentApp") === "inventorysmart") {
            filterConfigData[0]["saved_filter_screen_name"] =
              "Inventorysmart Store Mapping";
          }
          const filterConfig = formattedFilterConfiguration(
            "storeMappingStoreToDCFCFilterConfiguration",
            filterConfigData,
            "Store Mapping Store To DC FC"
          );
          props.setFilterConfiguration(filterConfig);
        }

        setdcCols(agGridDcCols);
        setfcCols(agGridFcCols);
        let showFCLevelDataResp = await checkToDisplayToggleAttributeLevel(
          "core_show_fc_level_view",
          3
        );
        setShowFCLevelView(showFCLevelDataResp);
        setloader(false);
      } catch (error) {
        displaySnackMessages("Something went wrong", "error");
      }
    };

    getInitialData();
  }, []);

  const onCellValueChanged = (params) => {
    let rowIndex = params.rowIndex % 10; //If rowIndex is greater than 10
    let value = params.value.map((val) => val.value || val);
    let row = {
      values: params.data,
    };
    const columnId = params.column.colId;
    if (columnId === "dc_map") {
      let alreadyexist = setAllDataDC
        ? setAllDataDC.filter(
            (item) => row.values.store_code !== item.store_code
          )
        : [];
      let unmapped = dcDefaultData
        .filter((item) => item.store_code === row.values.store_code)
        .map((item) => item.dc_map)[0];
      let newElement = {
        store_code: row.values.store_code,
        dc: {
          map: unmapped
            ? value.filter((item) => unmapped.indexOf(item) === -1)
            : value,
          unmap: unmapped
            ? unmapped.filter((item) => value.indexOf(item) === -1)
            : [],
        },
      };
      updatesetAllDataDC([...alreadyexist, newElement]);
      let newData = dcData.map((item, index) => {
        if (index === rowIndex) {
          return {
            ...item,
            [columnId]: value,
          };
        }
        return item;
      });
      setdcData(newData);
    }
    if (columnId === "fc_map") {
      let alreadyexist = setAllDataFC
        ? setAllDataFC.filter(
            (item) => row.values.store_code !== item.store_code
          )
        : [];
      let unmapped = [];
      // let unmapped = fcDefaultData
      //   .filter((item) => item.store_code === row.values.store_code)
      //   .map((item) => item.fc_map)[0];
      let newElement = {
        store_code: row.values.store_code,
        fc: {
          map: unmapped
            ? value.filter((item) => unmapped.indexOf(item) === -1)
            : value,
          unmap: unmapped
            ? unmapped.filter((item) => value.indexOf(item) === -1)
            : [],
        },
      };
      updatesetAllDataFC([...alreadyexist, newElement]);
      let newData = fcData.map((fcRow, index) => {
        if (index === rowIndex) {
          return {
            ...fcRow,
            [columnId]: value,
          };
        }
        return fcRow;
      });
      setfcData(newData);
    }
    props.updateFlagEdit(true);
  };

  const manualCallBack = async (manualbody, pageIndex, params) => {
    if (isNull(filterDependencyRef.current)) {
      return {
        data: [],
        totalCount: 0,
      }; // returning for server side pagination on ag grid
    }
    setloader(true);
    let body = {
      filters: filterDependencyRef.current,
      meta: {
        ...manualbody,
        limit: { limit: 10, page: pageIndex + 1 },
      },
      selection: {
        data: params?.api?.checkConfiguration,
        unique_columns: ["store_code"],
      },
    };

    let { data: DC } = await getAllStoreDC(body, `?page=${pageIndex + 1}`)();
    // let { data: FC } = await getAllStoreFC(body, `?page=${pageIndex + 1}`)();
    // FC.data = FC.data.map((item) => {
    //   if (item.fc_map) {
    //     item.fc_map = item.fc_map.map((e) => `${e.fc_code}`);
    //   }
    //   return item;
    // });
    DC.data = DC.data.map((item) => {
      if (item.dc_map) {
        item.dc_map = item.dc_map.map((e) => `${e.dc_code}`);
      }
      return item;
    });
    // if (setAllDataFC.length > 0) {
    //   FC.data = modifyRowData(FC.data);
    // }
    if (setAllDataDC.length > 0) {
      DC.data = modifyRowData(DC.data);
    }
    // setDCTotal(DC.total);
    // setFCTotal(FC.total);

    setdcData(cloneDeep(DC.data));
    setdcDefaultData(cloneDeep(DC.data));
    // setfcData(FC.data);
    // setfcDefaultData(FC.data);
    setloader(false);
    return {
      data: DC.data,
      totalCount: DC.total,
    };
  };

  const onClickFilter = () => {
    if (dcfcTableRef.current) {
      dcfcTableRef.current.api.refreshServerSideStore({ purge: true });
    }
  };

  const setAllChanges = async (fields_values, params) => {
    let map_col = (toggleFcValue ? fcCols : dcCols).filter(
      (col) => col.column_name === "dc_map"
    );
    map_col = map_col.length === 1 ? map_col[0] : {};
    const setAllPayload = getDCFCSetAllPayload(
      "store",
      filterDependencyRef.current,
      params,
      fields_values,
      false,
      map_col
    );
    if (!toggleFcValue) {
      await mapStoretoDC(setAllPayload, true)();
    }
    params.api.deselectAll();
    onClickFilter();
  };

  const saveRequest = () => {
    if (setAllDataDC.length || setAllDataFC.length) {
      setShowModal(true);
    } else {
      displaySnackMessages("There are no changes to save", "warning");
    }
  };

  const onConfirm = async () => {
    try {
      if (setAllDataFC.length) {
        let body = { elements: setAllDataFC };
        await mapStoretoFC(body)();
      }
      if (setAllDataDC.length) {
        let body = { elements: setAllDataDC };
        await mapStoretoDC(body)();
      }

      displaySnackMessages("Stores mapped successfully", "success");
      setShowModal(false);
      //Empty the payload
      updatesetAllDataDC([]);
      updatesetAllDataFC([]);
      props.updateFlagEdit(false);
    } catch (err) {
      displaySnackMessages("Save request failed. Please try again", "error");
    }
  };

  useEffect(() => {
    if (props.isredirect) {
      setToggleFcValue(true);
    }
  }, []);

  const modifyRowData = (tableData) => {
    let setAllData = toggleFcValue ? setAllDataFC : setAllDataDC;
    let changedStoreIds = setAllData.map((item) => item.store_code);
    return tableData.map((item) => {
      let storeIndex = changedStoreIds.indexOf(item.store_code);
      if (storeIndex > -1) {
        if (toggleFcValue) {
          item.fc_map = setAllData[storeIndex].fc.map;
        } else {
          item.dc_map = setAllData[storeIndex].dc.map;
        }
      }
      return item;
    });
  };

  const displaySnackMessages = (msg, type) => {
    props.addSnack({
      message: msg,
      options: {
        variant: type,
      },
    });
  };

  const onSelectionChanged = (event) => {
    setSelectedRowsIDs(event.api.getSelectedRows());
  };

  const onFilterDashboardClick = (dependencyData, filterData) => {
    filterDependencyRef.current = dependencyData;
    onClickFilter();
  };

  const canTakeActionOnModules = (subModuleName, action) => {
    return isActionAllowedOnSubModule(
      props?.inventorysmartModulesPermission,
      props?.module,
      subModuleName,
      action
    );
  };

  const renderContent = () => {
    return (
      <CoreComponentScreen
        // Filter dashboard props
        showFilterDashboard={true}
        filterConfigKey={"storeMappingStoreToDCFCFilterConfiguration"}
        onApplyFilter={onFilterDashboardClick}
      >
        <Loader loader={showloader}>
          <div data-testid="filterContainer">
            {confirmBox && (
              <ConfirmBox
                onClose={() => showConfirmBox(false)}
                onConfirm={() => {
                  if (dcData.length) {
                    updatesetAllDataFC([]);
                    updatesetAllDataDC([]);
                    onClickFilter();
                  }
                  showConfirmBox(false);
                }}
              />
            )}
            <IaPrompt
              id={"routePrompt"}
              isOpen={showModal}
              title="Update Changes"
              subHeading="Are you sure to update all changes ?"
              infoList={[]}
              primaryButtonProps={{
                children: "Update",
                onClick: () => {
                  onConfirm();
                },
              }}
              tertiaryButtonProps={{
                children: "Close",
                onClick: () => setShowModal(false),
              }}
            />

            <div data-testid="resultContainer">
              <div
                className={`${globalClasses.flexRow} ${globalClasses.layoutAlignBetweenCenter} ${globalClasses.marginBottom}`}
              >
                <Typography variant="h6" gutterBottom>
                  Filtered Store
                </Typography>
                <div
                  className={`${globalClasses.flexRow} ${globalClasses.centerAlign}`}
                >
                  <Typography>DC Mapping</Typography>
                  {showFCLevelView && (
                    <>
                      <Switch
                        defaultChecked={toggleFcValue}
                        id="storetoDcfcToggleBtn"
                        onChange={(event) => {
                          if (event.target.checked) {
                            setToggleFcValue(true);
                          } else {
                            setToggleFcValue(false);
                          }
                        }}
                        disabled={true}
                      />
                      <Typography>FC Mapping</Typography>
                    </>
                  )}
                </div>
                <Button
                  variant="contained"
                  color="primary"
                  id="storetoDcfcSetAllBtn"
                  onClick={async () => {
                    if (selectedRowsIDs.length > 0) {
                      dcfcTableRef.current.trigerSetAll(true);
                    } else {
                      displaySnackMessages(
                        "Please select atleast one store",
                        "error"
                      );
                    }
                  }}
                  disabled={
                    !canTakeActionOnModules(
                      INVENTORY_SUBMODULES_NAMES.INVENTORY_STORE_MAPPING_STORE_DC_FC,
                      "edit"
                    )
                  }
                >
                  Set All
                </Button>
              </div>
              {(dcCols.length > 0 || fcCols.length > 0) && (
                <AgGridTable
                  columns={toggleFcValue ? fcCols : dcCols}
                  selectAllHeaderComponent={true}
                  sizeColumnsToFitFlag
                  onGridChanged
                  onRowSelected
                  manualCallBack={(body, pageIndex, params) =>
                    manualCallBack(body, pageIndex, params)
                  }
                  loadTableInstance={(gridInstance) => {
                    dcfcTableRef.current = gridInstance;
                  }}
                  rowModelType="serverSide"
                  serverSideStoreType="partial"
                  cacheBlockSize={10}
                  uniqueRowId={"store_code"}
                  onSelectionChanged={onSelectionChanged}
                  setAllInterdependentFields={true}
                  onSetAllApply={setAllChanges}
                  onCellValueChanged={onCellValueChanged}
                />
              )}
            </div>
            <div
              className={`${globalClasses.centerAlign} ${globalClasses.evenPaddingAround}`}
            >
              <Button
                variant="contained"
                color="primary"
                id="storetoDcfcSaveBtn"
                onClick={() => {
                  saveRequest();
                }}
                disabled={
                  !canTakeActionOnModules(
                    INVENTORY_SUBMODULES_NAMES.INVENTORY_STORE_MAPPING_STORE_DC_FC,
                    "edit"
                  )
                }
              >
                Save
              </Button>
              <Button
                variant="outlined"
                id="storetoDcfcCancelBtn"
                className={globalClasses.marginLeft1rem}
                onClick={() => {
                  if (
                    (fcData.length || dcData.length) &&
                    (setAllDataDC.length || setAllDataFC.length)
                  ) {
                    showConfirmBox(true);
                  } else {
                    displaySnackMessages("No changes are made", "warning");
                  }
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
          {/* } */}
        </Loader>
      </CoreComponentScreen>
    );
  };

  return <React.Fragment>{renderContent()}</React.Fragment>;
}

const mapStateToProps = (state) => {
  return {
    // selectedFilters: state.filterReducer.selectedFilters["storetoDCFC"],
    isSuperUser:
      state.tenantUserRoleMgmtReducer.userRoleManagementReducer.isSuperUser,
    filterDashboardConfiguration:
      state.filterReducer.filterDashboardConfiguration[
        "storeMappingStoreToDCFCFilterConfiguration"
      ],
    inventorysmartModulesPermission:
      state.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartModulesPermission,
    savedFilterSelection: state.filterReducer.savedFilterSelection,
    isAggregated: state.storeMappingReducerService.isAggregated,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    setProductStatusData: (data) => dispatch(setProductStatusData(data)),
    addSnack: (snackObj) => dispatch(addSnack(snackObj)),
    setFilterConfiguration: (filterConfiguration) =>
      dispatch(setFilterConfiguration(filterConfiguration)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(StoretoDCFC);
