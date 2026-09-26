import { Button, FormControlLabel, Radio, RadioGroup } from "@mui/material";
import globalStyles from "core/Styles/globalStyles";
import AgGridComponent from "core/Utils/agGrid";
import CellRenderers from "core/Utils/agGrid/cellRenderer";
import { setFilterConfiguration } from "core/actions/filterAction";
import { addSnack } from "core/actions/snackbarActions";
import { getTenantConfigApplicationLevel } from "core/actions/tenantConfigActions";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import { customSetAllField } from "core/commonComponents/coreComponentScreen/constants";
import {
  fetchFilterFieldValues,
  formattedFilterConfiguration,
} from "core/commonComponents/coreComponentScreen/utils";
import { Prompt as IaPrompt } from "impact-ui";
import { clone, cloneDeep, difference, isEmpty, isNull } from "lodash";
import { mapStoretoDC } from "core/pages/storeMapping/services/storeMappingService";
import React, { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { Prompt } from "react-router";
import Loader from "../../../Utils/Loader/loader";
import ConfirmBox from "../../../Utils/confirmPrompt/confirmPopup";
import { setProductStatusData } from "../../../actions/productStoreStatusActions";
import { setActiveScreenName } from "../../commonModulesServices/common-assort-service";
import {
  getAllDCData,
  getAllFCDC,
  getAllStoreDC,
  mapDCtoFC,
} from "../services-dc-mapping/dc-mapping-service";
import "./filter.scss";

import { INVENTORY_SUBMODULES_NAMES } from "core/Utils/constants/inventorySmart-constants";
import { checkToDisplayToggleAttributeLevel } from "core/Utils/functions/utils";
import { isActionAllowedOnSubModule } from "core/Utils/utils";
import { dynamicLabelKeysBasedOnTenant } from "core/Utils/DynamicLabels";

function DCtoStore(props) {
  const [showloader, setloader] = useState(true);
  const [columns, setColumns] = useState([]);
  const [selectedRowsIDs, setSelectedRowsIDs] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [confirmBox, showConfirmBox] = useState(false);
  const [dimension, changeDimension] = useState("store");
  const [setAllData, updateSetAllData] = useState([]);
  const [storeCols, setStoreCols] = useState([]);
  const [fcCols, setfcCols] = useState([]);
  const [dcList, setdcList] = useState([]);
  const [flag_edit, setFlag_edit] = useState(false);
  const [showFCLevelView, setShowFCLevelView] = useState(true);

  const globalClasses = globalStyles();

  const tableInstance = useRef(null);

  const onFilterDependency = useRef(null);

  const setNewTableInstance = (params) => {
    tableInstance.current = params;
  };

  const canTakeActionOnModules = (subModuleName, action) => {
    return isActionAllowedOnSubModule(
      props.inventorysmartModulesPermission,
      props.module,
      subModuleName,
      action
    );
  };

  const checkAccess = () => {
    const dc_store_access = canTakeActionOnModules(
      INVENTORY_SUBMODULES_NAMES.INVENTORY_DC_MAPPING_DC_STORE,
      "edit"
    );
    if (!dc_store_access) {
      return canTakeActionOnModules(
        INVENTORY_SUBMODULES_NAMES.INVENTORY_DC_MAPPING,
        "edit"
      );
    }
    return true;
  };

  const getData = (inputdata, final_cols, dim) => {
    let final_data = [];

    inputdata.forEach((data) => {
      let temp = {};
      if (data.dc_map !== null) {
        for (const fc_key of final_cols) {
          if (fc_key?.extra?.is_dc_col) {
            //For dc columns, we make the default value as false
            //Then update based on dc_map loop below
            temp[fc_key.accessor] = false;
          } else {
            //If the column is not dc type, we get the data from API response
            temp[fc_key.accessor] = data[fc_key.accessor];
          }
          for (const dc_key of data.dc_map) {
            if (dc_key.name.replaceAll(".", "_") === fc_key.accessor) {
              temp[fc_key.accessor] = true;
            }
          }
        }
      } else {
        for (const fc_key of final_cols) {
          temp[fc_key.accessor] = false;
        }
      }
      if (dim === "store") {
        temp["store_code"] = data.store_code;
        temp["store_name"] = data.store_name;
        temp["store_id"] = data.store_id;
        //Adding default client key variable as well to the object
        temp[dynamicLabelKeysBasedOnTenant("store_code", "core")] =
          data[dynamicLabelKeysBasedOnTenant("store_code", "core")];
      } else {
        temp["fc_code"] = data.fc_code;
      }
      temp["name"] = data.name;
      temp["is_selected"] = data.is_selected;
      temp["channel"] = data.channel;
      final_data.push(temp);
    });
    return final_data;
  };

  const columnUpdate = (final_cols) => {
    let editPermission = checkAccess();
    final_cols = final_cols.map((item) => {
      if (item?.extra?.is_dc_col) {
        //We are replacing . with _ because aggrid internally treats . as nested fields
        //We are getting . in one of the DC field names
        item.field = item.field.replaceAll(".", "_");
        item.accessor = item.accessor.replaceAll(".", "_");
        item.column_name = item.column_name.replaceAll(".", "_");
        item.type = "bool";
        item.is_editable = props.isSuperUser ? true : false;
        item.disabled = !editPermission;
        item.cellRenderer = (params, extraProps) => {
          return (
            <CellRenderers
              cellData={params}
              column={item}
              extraProps={extraProps}
              actions={null}
            ></CellRenderers>
          );
        };
      } else {
        item.showTooltip = true;
      }
      return item;
    });
    return final_cols;
  };

  const setdcData = async (dccolsdata) => {
    let dcdata = [];
    for (const item of dccolsdata) {
      let newdata = {};
      newdata["id"] = item["dc_code"];
      newdata["value"] = item["dc_code"];
      newdata["label"] = item["accessor"];
      if (item["dc_code"]) {
        dcdata.push(newdata);
      }
    }

    setdcList(dcdata);
    return dcdata;
  };

  const setdcToStoreFilterConfiguration = async () => {
    if (isEmpty(props.storeFilterDashboardConfiguration)) {
      const storeFilterData = await fetchFilterFieldValues(
        "DC store",
        props.savedFilterSelection,
        props.screenName
      );
      let filterConfigData = [
        {
          filterDashboardData: storeFilterData,
          isCrossDimensionFilter: false,
          screen_name: props.screenName,
        },
      ];
      if (sessionStorage.getItem("currentApp") === "inventorysmart") {
        filterConfigData[0]["saved_filter_screen_name"] =
          "Inventorysmart DC Store Mapping";
      }
      const filterConfig = formattedFilterConfiguration(
        "dcToStoreMappingFilterConfiguration",

        filterConfigData,
        "Dc To Store Mapping"
      );
      props.setFilterConfiguration(filterConfig);
    }
  };

  const setdcToFcFilterConfiguration = async () => {
    if (isEmpty(props.fcFilterDashboardConfiguration)) {
      const fcFilterData = await fetchFilterFieldValues(
        "DC fc",
        props.savedFilterSelection,
        props.screenName
      );
      const filterConfigData = [
        {
          filterDashboardData: fcFilterData,
          isCrossDimensionFilter: false,
          screen_name: props.screenName,
        },
      ];
      const filterConfig = formattedFilterConfiguration(
        "dcToFcMappingFilterConfiguration",
        filterConfigData,
        "Dc To FC Mapping"
      );
      props.setFilterConfiguration(filterConfig);
    }
  };

  useEffect(() => {
    const getFilterData = async () => {
      try {
        if (dimension === "store") {
          await setdcToStoreFilterConfiguration();
        } else if (dimension === "fc") {
          await setdcToFcFilterConfiguration();
        }
      } catch (error) {
        setloader(false);
        displaySnackMessages("Something went wrong", "error");
      }
    };

    getFilterData();
  }, [dimension]);

  useEffect(() => {
    const getInitialData = async () => {
      try {
        let dcbody = {
          filters: [],
        };
        let fccols = await getAllDCData(dcbody, "fc");
        let storecols = await getAllDCData(dcbody, "store");
        let storeColumns = columnUpdate(storecols);
        let fcColumns = columnUpdate(fccols);
        setStoreCols(storeColumns);
        setfcCols(fcColumns);
        setColumns(storeColumns);
        setdcData(storecols);

        let showFCLevelViewResp = await checkToDisplayToggleAttributeLevel(
          "core_show_fc_level_view",
          3
        );
        setShowFCLevelView(showFCLevelViewResp);
        setloader(false);
      } catch (error) {
        setloader(false);
        displaySnackMessages("Something went wrong", "error");
      }
    };

    getInitialData();

    props.setActiveScreenName("DC/FC  to Store mapping");
    sessionStorage.setItem("activeScreenName", "DC/FC  to Store mapping");
  }, []);

  //Append the setall changes to the table instance
  //Because we don't have access to setAll props latest state in cellValueChanged callback
  useEffect(() => {
    if (tableInstance.current) {
      tableInstance.current.api.setAllData = setAllData;
    }
  }, [setAllData]);

  // function is called on edit action in table
  const onCellValueChanged = (params) => {
    const existingNewMappingChanges = (params?.api?.setAllData || []).filter(
      (item) => {
        return params.data.store_code === item.store_code;
      }
    );
    let mappedData = [];
    let unmappedData = [];
    if (existingNewMappingChanges.length === 1) {
      mappedData = cloneDeep(existingNewMappingChanges[0]["dc"]["map"]);
      unmappedData = cloneDeep(existingNewMappingChanges[0]["dc"]["unmap"]);
    }
    if (params.newValue && unmappedData.includes(params.colDef.dc_code)) {
      unmappedData.pop(params.colDef.dc_code);
    } else if (params.newValue && !mappedData.includes(params.colDef.dc_code)) {
      mappedData.push(params.colDef.dc_code);
    } else if (!params.newValue && mappedData.includes(params.colDef.dc_code)) {
      mappedData.pop(params.colDef.dc_code);
    } else if (
      !params.newValue &&
      !unmappedData.includes(params.colDef.dc_code)
    ) {
      unmappedData.push(params.colDef.dc_code);
    }
    const dataSet = {
      store_code: params.data.store_code,
      dc: {
        map: mappedData,
        unmap: unmappedData,
      },
    };
    const otherStoresSetAllData = clone(setAllData).filter((val) => {
      return val.store_code !== dataSet.store_code;
    });
    if (mappedData.length || unmappedData.length) {
      updateSetAllData([...otherStoresSetAllData, dataSet]);
    } else {
      updateSetAllData([...otherStoresSetAllData]);
    }
  };

  const formatData = (data, selectedIds) => {
    const mappedIds = dcList.map((item) => item.id);

    return {
      map: data.dc ? data.dc : [],
      unmap: difference(mappedIds, data.dc),
    };
  };

  // updating ag-grid data
  const onSetAllApply = async (data, agGrid) => {
    const dataSet = formatData(data, selectedRowsIDs);

    let setAllBody = {
      dc: dataSet,
      store_code: {
        filters: onFilterDependency.current,
        meta: {
          range: [],
          sort: [],
          search: [],
        },
        selection: {
          data: tableInstance?.current?.api?.checkConfiguration,
          unique_columns: ["store_code"],
        },
      },
    };
    // patch api call for set all action
    const response = await onConfirm(setAllBody, true);
    return response;
  };

  const onConfirm = async (payloadData, isSetAllAction = false) => {
    try {
      setloader(true);
      setShowModal(false);

      if (isSetAllAction) {
        // set all patch api call
        await mapStoretoDC(payloadData, true)();
      } else {
        // edit api call
        dimension === "store"
          ? await mapStoretoDC({ elements: payloadData })()
          : await mapDCtoFC({ elements: payloadData })();
      }

      tableInstance.current.api?.deselectAll(true);
      updateSetAllData([]);
      setFlag_edit(false);
      setloader(false);
      tableInstance.current.api?.refreshServerSideStore({ purge: true });
      const message = "Mapping Data Updated Successfully";
      displaySnackMessages(message, "success");
    } catch (err) {
      const errMsg = !isEmpty(err.response.data.message)
        ? err.response.data.message
        : "Something went wrong";
      displaySnackMessages(errMsg, "error");
      setloader(false);
    }
  };

  const dcStoreMappingManualCallBack = async (
    manualbody,
    pageIndex,
    pageSize
  ) => {
    if (isNull(onFilterDependency.current)) {
      return {
        data: [],
        totalCount: 0,
      }; // returning for server side pagination on ag grid
    }
    setloader(true);
    try {
      let body = {
        filters: onFilterDependency.current,
        meta: {
          ...manualbody,
          limit: { limit: 10, page: pageIndex + 1 },
        },
        selection: {
          data: tableInstance?.current?.api?.checkConfiguration,
          unique_columns: ["store_code"],
        },
      };

      if (dimension === "store") {
        let { data: STORE } = await getAllStoreDC(body);

        // fetch columns
        let storedata = getData(STORE.data, storeCols, "store");
        setloader(false);
        return {
          data: storedata,
          totalCount: STORE.total,
        }; // returning for server side pagination on ag grid
      } else {
        let { data: FC } = await getAllFCDC(body);
        let fdata = getData(FC.data, fcCols, "fc");
        setloader(false);
        return {
          data: fdata,
          totalCount: FC.total,
        }; // returning for server side pagination on ag grid
      }
    } catch (err) {
      displaySnackMessages("Something went wrong", "error");
      setloader(false);
    }
  };

  const onFilter = async () => {
    try {
      tableInstance.current.api?.refreshServerSideStore({ purge: true });
      tableInstance.current.api?.deselectAll(true);
    } catch (error) {
      setloader(false);
    }
  };

  const onFilterDashboardClick = (dependencyData) => {
    onFilterDependency.current = dependencyData;
    onFilter();
  };

  const saveRequest = () => {
    if (setAllData.length) {
      setShowModal(true);
    } else {
      displaySnackMessages("There is no change to save.", "warning");
    }
  };

  const handleChangeDimension = async (event) => {
    changeDimension(event.target.value);
    if (event.target.value === "store") {
      setColumns(storeCols);
    } else {
      setColumns(fcCols);
    }
  };

  // const onReset = () => {
  //   updateData([]);
  //   setFlag_edit(false);
  // };

  const onCancel = () => {
    tableInstance.current.api?.refreshServerSideStore({ purge: false });
    tableInstance.current.api?.deselectAll(true);
    updateSetAllData([]);
    setFlag_edit(false);
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

  const onSelectionChanged = (event) => {
    // fetch all selected rows
    let selections = event.api.getSelectedRows().map((item) => {
      if (dimension === "store") {
        return {
          store_code: item.store_code,
        };
      } else {
        return {
          fc_code: item.fc_code,
        };
      }
    });
    setSelectedRowsIDs(selections);
  };

  const renderContent = () => {
    let formData = [
      {
        ...customSetAllField("dc", "list", "Map DCs"),
        options: dcList,
        isMulti: true,
        is_required: false,
        required: false,
      },
    ];

    return (
      <>
        {dimension === "store" && (
          <CoreComponentScreen
            showFilterDashboard={true}
            filterConfigKey={"dcToStoreMappingFilterConfiguration"}
            onApplyFilter={onFilterDashboardClick}
            hideNoDataFound
          />
        )}
        {dimension === "fc" && (
          <CoreComponentScreen
            showFilterDashboard={true}
            filterConfigKey={"dcToFcMappingFilterConfiguration"}
            onApplyFilter={onFilterDashboardClick}
            hideNoDataFound
          />
        )}

        <Loader loader={showloader}>
          <Prompt when={flag_edit} message={""} />
          <div data-testid="filterContainer">
            {confirmBox && (
              <ConfirmBox
                onClose={() => showConfirmBox(false)}
                onConfirm={() => {
                  onCancel();
                  showConfirmBox(false);
                }}
              />
            )}
            <IaPrompt
              isOpen={showModal}
              title="Confirm Changes"
              subHeading="Are you sure to save all your changes?"
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
            <div data-testid="resultContainer">
              <div>
                <div
                  className={`${globalClasses.flexRow} ${globalClasses.layoutAlignBetweenCenter} ${globalClasses.marginBottom}`}
                >
                  <RadioGroup
                    row
                    aria-label="gender"
                    name="controlled-radio-buttons-group"
                    value={dimension}
                    onChange={handleChangeDimension}
                  >
                    <FormControlLabel
                      value="store"
                      control={<Radio color="primary" />}
                      label="Store"
                    />
                    {showFCLevelView && (
                      <FormControlLabel
                        value="fc"
                        control={<Radio color="primary" />}
                        label="FC"
                      />
                    )}
                  </RadioGroup>

                  <div
                    className={`${globalClasses.flexRow} ${globalClasses.gap}`}
                  >
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={async () => {
                        if (setAllData.length) {
                          showConfirmBox(true);
                        } else if (selectedRowsIDs.length > 0) {
                          tableInstance.current.trigerSetAll(true);
                        } else {
                          displaySnackMessages(
                            "Please select atleast one Store",
                            "error"
                          );
                        }
                      }}
                      disabled={!checkAccess()}
                    >
                      Set All
                    </Button>
                  </div>
                </div>
                {columns.length > 0 && (
                  <AgGridComponent
                    columns={columns}
                    selectAllHeaderComponent={true}
                    uniqueRowId={"store_code"}
                    sizeColumnsToFitFlag
                    onSelectionChanged={onSelectionChanged}
                    onGridChanged
                    manualCallBack={(body, pageIndex, params) =>
                      dcStoreMappingManualCallBack(body, pageIndex, params)
                    }
                    rowModelType="serverSide"
                    serverSideStoreType="partial"
                    cacheBlockSize={10}
                    loadTableInstance={setNewTableInstance}
                    onSetAllApply={onSetAllApply}
                    customSetAllFields={formData}
                    onCellValueChanged={onCellValueChanged}
                    onRowSelected
                    showSaveTableConfig={false}
                    setAllButtonLabel="Apply and Save"
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
                onClick={() => {
                  saveRequest();
                }}
                disabled={!checkAccess()}
              >
                Save
              </Button>
              <Button
                variant="outlined"
                onClick={() => {
                  if (setAllData.length) {
                    showConfirmBox(true);
                  } else {
                    tableInstance.current?.api?.deselectAll(true);
                    displaySnackMessages("There are no changes.", "warning");
                  }
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Loader>
      </>
    );
  };

  return <React.Fragment>{renderContent()}</React.Fragment>;
}
const mapStateToProps = (state) => {
  return {
    selectedFilters: state.filterReducer.selectedFilters["dctostore"],
    selectedfcFilters: state.filterReducer.selectedFilters["fctostore"],
    isSuperUser:
      state.tenantUserRoleMgmtReducer.userRoleManagementReducer.isSuperUser,
    inventorysmartModulesPermission:
      state.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartModulesPermission,
    storeFilterDashboardConfiguration:
      state.filterReducer.filterDashboardConfiguration[
        "dcToStoreMappingFilterConfiguration"
      ],
    fcFilterDashboardConfiguration:
      state.filterReducer.filterDashboardConfiguration[
        "dcToFcMappingFilterConfiguration"
      ],
    savedFilterSelection: state.filterReducer.savedFilterSelection,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (body) => dispatch(addSnack(body)),
    setProductStatusData: (data) => dispatch(setProductStatusData(data)),
    setActiveScreenName: (data) => dispatch(setActiveScreenName(data)),
    getTenantConfigApplicationLevel: (dynamicRoute, queryParam) =>
      dispatch(getTenantConfigApplicationLevel(dynamicRoute, queryParam)),
    setFilterConfiguration: (filterConfiguration) =>
      dispatch(setFilterConfiguration(filterConfiguration)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(DCtoStore);
