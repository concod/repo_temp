import React, { useEffect, useState, useRef } from "react";
import { connect } from "react-redux";
import Loader from "../../../Utils/Loader/loader";
import "./filter.scss";
import { Button, Switch, Prompt as IaPrompt } from "impact-ui-v3";
import globalStyles from "core/Styles/globalStyles";
import Typography from "@mui/material/Typography";
import ConfirmBox from "../../../Utils/confirmPrompt/confirmPopup";
import CellRenderers from "core/Utils/agGrid/cellRenderer";
import {
  getAllStoreDC,
  mapStoretoDC,
  mapStoretoFC,
  getAllFC,
  getAllDC,
} from "../services/storeMappingService";
import { downloadWithSnack } from "core/Utils/download/downloadTableData";
import { setProductStatusData } from "../../../actions/productStoreStatusActions";
import { getColumnsAg } from "../../../actions/tableColumnActions";
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
import { getTenantConfigApplicationLevel } from "core/actions/tenantConfigActions";
import {
  IS_OVERRIDEN_CORE_BUTTON_WIDTH,
  IS_OVERRIDEN_CORE_BUTTON_PLACEMENT,
} from "core/constants";
import {
  getUamFilterDependency,
  applyAlterDcPayload,
} from "core/commonComponents/coreComponentScreen/utils";

const DC_TABLE_NAME = "store_dc";
const FC_TABLE_NAME = "store_fc";

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
  const [hasEditPermissions, setHasEditPermissions] = useState(false);
  // const [storeStatusValues, setStoreStatusValue] = useState([]);
  const [toggleFcValue, setToggleFcValue] = useState(false);
  const [dcFiltersConfig, setDcFiltersConfig] = useState({});
  const [applyUamForDc, setApplyUamForDc] = useState(false);
  const [updateDcOptions, setUpdateDcOptions] = useState(false);
  const [alterDcPayload, setAlterDcPayload] = useState(null);
  const [totalRowsCount, setTotalRowsCount] = useState(0);
  const globalClasses = globalStyles();

  const isThreadFeatureEnabled = Boolean(
    props?.inventorysmartScreenConfig?.inventory_smart_comment_and_thread
      ?.isThreadFeatureEnabled
  );

  /**
   * state variables for filters
   */
  const filterDependencyRef = useRef(null);
  const dcfcTableRef = useRef(null);

  const [showFCLevelView, setShowFCLevelView] = useState(true); //State variable to show fc level

  useEffect(() => {
    const getInitialData = async () => {
      try {
        let tenantData = await props.getTenantConfigApplicationLevel(3, {
          attribute_name: "get_dc_config",
        });
        setDcFiltersConfig(tenantData.data?.data[0]?.attribute_value);
        // Feature flag (TAM): apply UAM store-dimension filters to /master/dc
        const uamDcConfig = await props.getTenantConfigApplicationLevel(1, {
          attribute_name: "apply_uam_for_dc",
        });
        setApplyUamForDc(
          Boolean(uamDcConfig?.data?.data?.[0]?.attribute_value?.value)
        );
        const alterDcPayloadConfig = await props.getTenantConfigApplicationLevel(
          3,
          {
            attribute_name: "alter_dc_payload",
          }
        );
        setAlterDcPayload(
          alterDcPayloadConfig?.data?.data?.[0]?.attribute_value || null
        );

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
        let agGridDcCols = await getColumnsAg(
          `table_name=${DC_TABLE_NAME}`,
          {},
          {},
          false,
          false,
          true,
          isThreadFeatureEnabled
        )();

        let agGridFcCols = await getColumnsAg(
          `table_name=${FC_TABLE_NAME}`,
          {},
          {},
          false,
          false,
          true,
          isThreadFeatureEnabled
        )();
        let permissionCheck = !!canTakeActionOnModules(
          INVENTORY_SUBMODULES_NAMES.INVENTORY_STORE_MAPPING_STORE_DC_FC,
          "edit"
        );
        agGridDcCols.forEach((col) => {
          if (col.column_name === "dc_map") {
            col.disabledEdit = !permissionCheck;
          }
        });

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

            col.cellRenderer = (params, extraProps) => {
              if (permissionCheck) {
                return (
                  <CellRenderers
                    cellData={params}
                    column={col}
                    extraProps={extraProps}
                  ></CellRenderers>
                );
              } else {
                const value = params.data[col.column_name];
                return value ? value : "-";
              }
            };
          }
          return col;
        });
        agGridFcCols = await Promise.all(agGridFcCols);

        const transformColumns =
          typeof props.transformColumns === "function"
            ? props.transformColumns
            : (columns) => columns;

        setdcCols(transformColumns(agGridDcCols));
        setfcCols(transformColumns(agGridFcCols));
        let showFCLevelDataResp = await checkToDisplayToggleAttributeLevel(
          "core_show_fc_level_view",
          3
        );
        setShowFCLevelView(showFCLevelDataResp);
        setHasEditPermissions(permissionCheck);
        setloader(false);
      } catch (error) {
        props.handleErrorMessage(error);
      }
    };

    getInitialData();
  }, []);

  useEffect(() => {
    if (updateDcOptions && dcCols?.length > 0) {
      setUpdateDcOptions(false);
      generateDCOptions();
    }
  }, [dcCols, updateDcOptions]);

  // Function to get DC options with filters
  const getDCOptions = async () => {
    const currentFilters = Array.isArray(filterDependencyRef.current)
      ? filterDependencyRef.current
      : [];
    // Create filter payload
    let filterPayload = { filter: {} };
    if (applyUamForDc) {
      const dependencyList = await getUamFilterDependency(
        [],
        props.screenName,
        ["store"]
      );
      const storeDimensionFilters = dependencyList.filter(
        (filter) => filter.dimension === "store"
      );
      if (storeDimensionFilters.length > 0) {
        const filterObj = {};
        storeDimensionFilters.forEach((filter) => {
          const attributeName = filter.attribute_name || filter.filter_id;
          // Check if user has selected values for this filter in UI
          const userSelectedFilter = currentFilters.find(
            (f) => f.attribute_name === attributeName
          );
          // Use user selected values if available, otherwise use UAM values
          const values = userSelectedFilter
            ? userSelectedFilter.values
            : Array.isArray(filter.values)
            ? filter.values.map((val) => val?.value ?? val)
            : [];
          if (attributeName && values.length > 0) {
            filterObj[attributeName] = [
              {
                values,
                operator: filter.operator || "in",
                type: "list",
              },
            ];
          }
        });
        filterPayload.filter = filterObj;
      }
    } else if (dcFiltersConfig?.value && dcFiltersConfig?.value?.length > 0) {
      const filterObj = {};
      dcFiltersConfig.value.forEach((filterKey) => {
        const filterValues = currentFilters.filter(
          (f) => f.attribute_name === filterKey
        );
        if (filterValues && filterValues.length > 0) {
          filterObj[filterKey] = filterValues.map((f) => ({
            values: f.values,
            operator: f.operator || "in",
            type: "list",
          }));
        }
      });
      filterPayload.filter = filterObj;
    }

    //alter_dc_payload mapping from TAM
    applyAlterDcPayload(alterDcPayload, currentFilters, filterPayload);

    // Call the API with the filter payload
    return await getAllDC(filterPayload)();
  };

  const generateDCOptions = async () => {
    // Get DC options for the dropdown with filter
    const { data: dcOptions } = await getDCOptions();

    // Update the DC options in the columns
    const updatedColumns = dcCols.map((col) => {
      if (col.column_name === "dc_map") {
        //col.is_editable = props.isSuperUser; //Commenting for now because of set all issue because if is_editable is false, user can't see fields in set all dialog
        col.isMulti = true;
        col.options = dcOptions.data.map((opt) => {
          return {
            label: opt.name,
            id: `${opt.dc_code}`,
            value: `${opt.dc_code}`,
          };
        });

        col.cellRenderer = (params, extraProps) => {
          return (
            <CellRenderers
              cellData={params}
              column={col}
              extraProps={extraProps}
            ></CellRenderers>
          );
        };
      }
      return col;
    });

    setdcCols(updatedColumns);
  };

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
        limit: { limit: props.pageSize || 10, page: pageIndex + 1 },
      },
      selection: {
        data: params?.api?.checkConfiguration,
        unique_columns: ["store_code"],
      },
    };
    try {
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
      setdcData(cloneDeep(DC.data));
      setdcDefaultData(cloneDeep(DC.data));
      // setfcData(FC.data);
      // setfcDefaultData(FC.data);
      setloader(false);
      setTotalRowsCount(DC.total || DC.data?.length || 0);
      return {
        data: DC.data,
        totalCount: DC.total,
      };
    } catch (error) {
      props.handleErrorMessage(error);
    }
    // setDCTotal(DC.total);
    // setFCTotal(FC.total);
  };

  const downloadData = () =>
    downloadWithSnack(
      {
        tableRef: dcfcTableRef,
        columns: toggleFcValue ? fcCols : dcCols,
        filters: filterDependencyRef.current,
        totalRowsCount,
        tableApi: "store-mapping/store-dc",
        uniqueColumns: ["store_code"],
      },
      displaySnackMessages
    );

  const onClickFilter = () => {
    // Check if filters are being applied
    if (filterDependencyRef.current && filterDependencyRef.current.length > 0) {
      // generateDCOptions();
      setUpdateDcOptions(true);
    }

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
    params.api.setCheckConfiguration([]);
    params.api.setPrevAction(null);
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
      let resp;
      if (setAllDataFC.length) {
        let body = { elements: setAllDataFC };
        resp = await mapStoretoFC(body)();
      }
      if (setAllDataDC.length) {
        let body = { elements: setAllDataDC };
        resp = await mapStoretoDC(body)();
      }
      const successMsg = resp.data?.show_message
        ? resp?.data?.message
        : "Stores mapped successfully";
      displaySnackMessages(successMsg, "success");
      setShowModal(false);
      //Empty the payload
      updatesetAllDataDC([]);
      updatesetAllDataFC([]);
      props.updateFlagEdit(false);
      dcfcTableRef.current?.api?.refreshServerSideStore({ purge: true });
    } catch (err) {
      props.handleErrorMessage(err);
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
  const getTopRightOptions = () => {
    let options = [];
    if (showFCLevelView) {
      options.push(
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
      );
    }
    if (hasEditPermissions) {
      if (selectedRowsIDs?.length > 0) {
        options.push(
          <Button
            variant="tertiary"
            id="storetoDcfcSetAllBtn"
            onClick={async () => {
              dcfcTableRef.current.trigerSetAll(true);
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
        );
      }

      options.push(
        <Button
          variant="secondary"
          id="storetoDcfcCancelBtn"
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
      );
      options.push(
        <Button
          variant="primary"
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
      );
    }

    return options;
  };
  const renderContent = () => {
    return (
      <div style={{ marginTop: IS_OVERRIDEN_CORE_BUTTON_PLACEMENT }}>
        <CoreComponentScreen
          IscoreButtonWidth={IS_OVERRIDEN_CORE_BUTTON_WIDTH}
          // Filter dashboard props
          showFilterDashboard={true}
          filterConfigKey={"storeMappingStoreToDCFCFilterConfiguration"}
          onApplyFilter={onFilterDashboardClick}
          autoHideFilterButton={true}
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
                children="Are you sure to update all changes ?"
                infoList={[]}
                primaryButtonLabel="Update"
                secondaryButtonLabel="Close"
                onPrimaryButtonClick={() => {
                  onConfirm();
                }}
                onSecondaryButtonClick={() => {
                  setShowModal(false);
                }}
              />

              <div data-testid="resultContainer">
                {(dcCols.length > 0 || fcCols.length > 0) && (
                  <AgGridTable
                    columns={toggleFcValue ? fcCols : dcCols}
                    selectAllHeaderComponent={hasEditPermissions}
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
                    cacheBlockSize={props.pageSize || 10}
                    paginationPageSize={props.pageSize}
                    uniqueRowId={"store_code"}
                    onSelectionChanged={onSelectionChanged}
                    setAllInterdependentFields={true}
                    onSetAllApply={setAllChanges}
                    onCellValueChanged={onCellValueChanged}
                    tableName={toggleFcValue ? FC_TABLE_NAME : DC_TABLE_NAME}
                    requestUrl={"store-mapping/store-dc?page=1"}
                    appliedFilters={filterDependencyRef.current}
                    tableHeader="Filtered Store: DC Mapping"
                    topRightOptions={getTopRightOptions()}
                    customSetAllComponent={props.customSetAllComponent}
                    setAllPanelWidth={props.setAllPanelWidth}
                    showDownloadButton={totalRowsCount > 0}
                    onDownloadButtonClick={() => downloadData()}
                    isChatEnabled={isThreadFeatureEnabled}
                    enableCellComment={false}
                  />
                )}
              </div>
            </div>
            {/* } */}
          </Loader>
        </CoreComponentScreen>
      </div>
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
    pageSize:
      state.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig?.inventorysmart_page_count,
    inventorysmartScreenConfig:
      state.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    setProductStatusData: (data) => dispatch(setProductStatusData(data)),
    addSnack: (snackObj) => dispatch(addSnack(snackObj)),
    setFilterConfiguration: (filterConfiguration) =>
      dispatch(setFilterConfiguration(filterConfiguration)),
    getTenantConfigApplicationLevel: (dynamicRoute, queryParam) =>
      dispatch(getTenantConfigApplicationLevel(dynamicRoute, queryParam)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(StoretoDCFC);
