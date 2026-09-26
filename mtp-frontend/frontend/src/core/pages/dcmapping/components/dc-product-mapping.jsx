import { Button, Typography } from "@mui/material";
import globalStyles from "core/Styles/globalStyles";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
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
import { cloneDeep, difference, isEmpty, isNull } from "lodash";
import {
  getAllProductDC,
  mapProductToDC,
} from "core/pages/product-mapping/services-product-mapping/productMappingService";
import React, { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { Prompt } from "react-router";
import Loader from "../../../Utils/Loader/loader";
import ConfirmBox from "../../../Utils/confirmPrompt/confirmPopup";
import { setProductStatusData } from "../../../actions/productStoreStatusActions";
import { setActiveScreenName } from "../../commonModulesServices/common-assort-service";
import {
  getAllDCData,
  // getAllProductDC,
  getAllStyleDC,
} from "../services-dc-mapping/dc-mapping-service";
import "./filter.scss";

import { INVENTORY_SUBMODULES_NAMES } from "core/Utils/constants/inventorySmart-constants";
import { isActionAllowedOnSubModule } from "core/Utils/utils";

function DCtoProduct(props) {
  const [showloader, setloader] = useState(true);
  const [columns, setColumns] = useState([]);
  const [selectedRowsIDs, setSelectedRowsIDs] = useState([]);
  const [dcList, setdcList] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [confirmBox, showConfirmBox] = useState(false);
  const [dimension, changeDimension] = useState("product");
  const [setAllData, updateSetAllData] = useState([]);
  const [productCols, setproductCols] = useState([]);
  const [styleCols, setstyleCols] = useState([]);
  const [flag_edit, setFlag_edit] = useState(false);
  const globalClasses = globalStyles();
  const onFilterDependency = useRef(null);
  const onFilterSectionApplied = useRef(0);
  const columnFiltersApplied = useRef([]);
  const tableInstance = useRef(null);
  const [showStyleLevelData, setShowStyleLevelData] = useState(true);
  const includeDCFilter = props?.includeDCFilter == false ? false : true;

  const setNewTableInstance = (params) => {
    tableInstance.current = params;
  };

  const getData = async (inputdata, final_cols, dim) => {
    // this function processes the input data which can be displayed on the table
    // inputs are array objects returned from the backend, column names and dimension()product or style

    let final_data = [];
    for (const data of inputdata) {
      let temp = {};
      if (data.dc_map !== null) {
        for (const col_key of final_cols) {
          temp[col_key.accessor] = false;
          for (const dc_key of data.dc_map) {
            if (dc_key.name.replaceAll(".", "_") === col_key.accessor) {
              temp[col_key.accessor] = true;
            }
          }
        }
      } else {
        for (const col_key of final_cols) {
          temp[col_key.accessor] = false;
        }
      }
      if (dim === "product") {
        temp["product_code"] = data.product_code;
        temp["product_name"] = data.product_name;
        temp["article"] = data?.article;
      } else {
        temp["style"] = data.style;
        temp["name"] = data.name;
      }
      temp["is_selected"] = data.is_selected;
      final_data.push(temp);
    }

    return final_data;
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

  const columnUpdate = (final_cols) => {
    let editPermission = canTakeActionOnModules(
      INVENTORY_SUBMODULES_NAMES.INVENTORY_DC_MAPPING,
      "edit"
    );
    final_cols = final_cols.map((item) => {
      if (
        item.column_name !== "product_code" &&
        item.column_name !== "style" &&
        item.column_name !== "product_name" &&
        item.column_name !== "article"
      ) {
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

  const processStyle = async (inpstyledata, dccols) => {
    /*
        This function will take style data as input and will decide 
        if a style be mapped to a dc or custom. If all product in a 
        style belongs to same Dc then its mapped to that dc else it is mapped as custom
    
    */

    let stylemappings = [];
    for (const data of inpstyledata) {
      let prodData = data.dc_map;
      const first_product = prodData[0].dc_map;
      let tempstyledata = {};
      tempstyledata["style"] = data["style"];
      for (const dccon of dccols) {
        if (dccon["accessor"] !== "style") {
          tempstyledata[dccon["accessor"]] = false;
        }
      }
      // check the product's dc mapping if each is same as the first product's mapping
      // first_product contains first product's dc mapping
      prodData.forEach((item) => {
        if (item["dc_map"] !== null) {
          item["dc_map"].forEach((mapped) => {
            tempstyledata[mapped[" name"]] = true;
            first_product &&
              first_product.forEach((tmpitem) => {
                if (tmpitem && tmpitem[" name"] !== mapped[" name"]) {
                  tempstyledata["custom"] = true;
                }
              });
          });
        }
      });
      for (const dccon of dccols) {
        if (
          !["style", "custom", "article"].includes(dccon["accessor"]) &&
          tempstyledata["custom"] === true
        ) {
          tempstyledata[dccon["accessor"]] = false;
        }
      }

      stylemappings = [...stylemappings, tempstyledata];
    }
    return stylemappings;
  };

  useEffect(() => {
    const getInitialData = async () => {
      try {
        let dcbody = {
          filters: [],
        };

        let stylecols = await getAllDCData(dcbody, "style");
        let productcols = await getAllDCData(dcbody, "product");
        let updatedcols = columnUpdate(stylecols);
        let updatedprdcols = columnUpdate(productcols);
        setstyleCols(updatedcols);
        setproductCols(updatedprdcols);
        setColumns(productcols);
        await setdcData(productcols);

        if (isEmpty(props.filterDashboardConfiguration)) {
          const defaultValues = await fetchFilterFieldValues(
            "dc to product",
            props.savedFilterSelection,
            props.screenName
          );

          const dcdefaultValues = await fetchFilterFieldValues(
            "dc mapping",
            [],
            props.screenName
          );

          let filterConfigData = [
            {
              filterSectionHeader: `${dynamicLabelsBasedOnTenant(
                "product",
                "core"
              )} Filter`,
              filterDashboardData: [...defaultValues],
              isCrossDimensionFilter: false,
              screen_name: props.screenName,
            },
          ];

          if (includeDCFilter) {
            filterConfigData.push({
              filterSectionHeader: "DC Filter",
              filterDashboardData: [...dcdefaultValues],
              isCrossDimensionFilter: false,
              screen_name: props.screenName,
              disableUamOnApply: true,
            });
          }

          const filterConfig = formattedFilterConfiguration(
            "dcToProductMappingFilterConfiguration",
            filterConfigData,
            "Dc To Product Mapping"
          );
          props.setFilterConfiguration(filterConfig);
        }

        let showStyleLevelDataResp = await props.getTenantConfigApplicationLevel(
          3,
          {
            attribute_name: "core_show_style_level_info",
          }
        );

        if (showStyleLevelDataResp?.data?.data?.[0]?.["attribute_value"]) {
          setShowStyleLevelData(
            showStyleLevelDataResp?.data?.data?.[0]?.["attribute_value"].value
          );
        }

        setloader(false);
      } catch (error) {
        setloader(false);
        displaySnackMessages("Something went wrong", "error");
      }
    };

    getInitialData();

    props.setActiveScreenName("dc to product");
    sessionStorage.setItem("activeScreenName", "dc to product");
  }, []);

  //Append the setall changes to the table instance
  //Because we don't have access to setAll props latest state in cellValueChanged callback
  useEffect(() => {
    if (tableInstance.current) {
      tableInstance.current.api.setAllData = setAllData;
    }
  }, [setAllData]);

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
      product_code: {
        filters: onFilterDependency.current,
        meta: {
          range: [],
          sort: [],
          search: [],
        },
        selection: {
          data: tableInstance?.current?.api?.checkConfiguration,
          unique_columns: [
            props.isAggregated ? "aggregation_code" : "product_code",
          ],
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
        await mapProductToDC(payloadData, true, props.isAggregated)();
      } else {
        // edit api call
        await mapProductToDC(
          { elements: payloadData },
          false,
          props.isAggregated
        )();
      }

      tableInstance.current.api.deselectAll(true);
      updateSetAllData([]);
      setFlag_edit(false);
      setloader(false);
      tableInstance.current.api?.refreshServerSideStore({ purge: true });
      const message = "Mapping Data Updated Successfully";
      if (!isSetAllAction) {
        displaySnackMessages(message, "success");
      } else {
        return { message: message };
      }
    } catch (err) {
      const errMsg = !isEmpty(err.response.data.message)
        ? err.response.data.message
        : "Something went wrong";
      displaySnackMessages(errMsg, "error");
      setloader(false);
    }
  };

  const onFilter = async () => {
    try {
      setloader(true);
      let dcbody = {
        filters: columnFiltersApplied.current,
      };
      if (dimension === "product") {
        if (onFilterSectionApplied.current == 0) {
          // table filter applied trigger manual callback

          tableInstance.current.api?.refreshServerSideStore({ purge: true });
        } else if (onFilterSectionApplied.current == 1) {
          // column filter applied, no need to trigger callback
          let productcols = await getAllDCData(dcbody, "product");
          let updatedprdcols = columnUpdate(productcols);
          setproductCols(updatedprdcols);
          setColumns(updatedprdcols);
        }
      } else {
        if (onFilterSectionApplied.current == 0) {
          // table filter applied trigger manual callback

          tableInstance.current.api?.refreshServerSideStore({ purge: true });
        } else if (onFilterSectionApplied.current == 1) {
          // column filter applied, no need to trigger callback

          let stylecols = await getAllDCData(dcbody, "style");
          let updatedcols = columnUpdate(stylecols);
          setstyleCols(updatedcols);
          setColumns(updatedcols);
        }
      }
      setloader(false);
    } catch (error) {
      setloader(false);
    }
  };

  const onFilterDashboardClick = (
    dependencyData,
    filterData,
    filterSectionApplied
  ) => {
    onFilterSectionApplied.current = filterSectionApplied;
    if (filterSectionApplied == 1) {
      // if column filter is applied only update column filter ref
      columnFiltersApplied.current = dependencyData;
    } else {
      // if table filter is applied only update onFilterDependency filter ref
      onFilterDependency.current = dependencyData;
    }
    onFilter();
  };

  const dcProductMappingManualCallBack = async (
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
          unique_columns: [
            props.isAggregated ? "aggregation_code" : "product_code",
          ],
        },
      };
      let dcbody = {
        filters: columnFiltersApplied.current,
      };

      if (dimension === "product") {
        let productcols = await getAllDCData(dcbody, "product");
        let updatedprdcols = columnUpdate(productcols);
        setproductCols(updatedprdcols);
        let queryParams = `?page=${pageIndex + 1}&level=${
          props.isAggregated ? "aggregation" : "product"
        }`;
        let { data: product } = await getAllProductDC(body, queryParams)();
        let productdata = await getData(product.data, productcols, "product");
        setloader(false);

        return {
          data: productdata,
          totalCount: product.total,
        }; // returning for server side pagination on ag grid
      } else {
        let stylecols = await getAllDCData(dcbody, "style");
        let updatedcols = columnUpdate(stylecols);
        setstyleCols(updatedcols);
        let allstyledata = await getAllStyleDC(body);
        let processedData = await processStyle(
          allstyledata.data.data,
          stylecols
        );
        setloader(false);

        return {
          data: processedData,
          totalCount: allstyledata.data.total,
        }; // returning for server side pagination on ag grid
      }
    } catch (err) {
      setloader(false);
    }
  };

  const saveRequest = () => {
    if (setAllData.length) {
      setShowModal(true);
    } else {
      displaySnackMessages("There is no change to save.", "warning");
    }
  };

  const handleChangeDimension = () => {
    if (dimension === "style") {
      setColumns(productCols);
      changeDimension("product");
    } else {
      setColumns(styleCols);
      changeDimension("style");
    }
    setSelectedRowsIDs([]);
  };

  // const onReset = () => {
  //   updateData([]);
  // };

  const onCancel = () => {
    tableInstance.current.api?.refreshServerSideStore({ purge: false });
    tableInstance.current.api.deselectAll(true);
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
      if (dimension === "product") {
        return {
          product_code: item.product_code,
        };
      } else {
        return {
          style: item.style,
        };
      }
    });
    setSelectedRowsIDs(selections);
  };

  // function is called on edit action in table
  const onCellValueChanged = (params) => {
    let dataSet = {};
    const nodeId = props.isAggregated ? "article" : "product_code";
    const existingNewMappingChanges = (params?.api?.setAllData || []).filter(
      (item) => {
        if (dimension === "product") {
          return params.data[nodeId] === item.product_code;
        } else {
          return params.data.style === item.style;
        }
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
    if (dimension === "product") {
      dataSet = {
        product_code: params.data[nodeId],
        dc: {
          map: mappedData,
          unmap: unmappedData,
        },
      };
    } else {
      dataSet = {
        style: params.data.style,
        dc: {
          map: mappedData,
          unmap: unmappedData,
        },
      };
    }
    // Check for duplicate updation and filter unecessary changes
    const newDataSet = (params.api.setAllData || []).filter((item) => {
      if (dimension === "product") {
        return dataSet.product_code !== item.product_code;
      } else {
        return dataSet.style !== item.style;
      }
    });
    //filter the map: [] and unmap : []
    if (mappedData.length || unmappedData.length) {
      updateSetAllData([...newDataSet, dataSet]);
    } else {
      updateSetAllData(newDataSet);
    }
  };

  const canTakeActionOnModules = (subModuleName, action) => {
    return isActionAllowedOnSubModule(
      props.inventorysmartModulesPermission,
      props.module,
      subModuleName,
      action
    );
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
      <CoreComponentScreen
        showPageRoute={false}
        // Filter dashboard props
        showFilterDashboard={true}
        filterConfigKey={"dcToProductMappingFilterConfiguration"}
        onApplyFilter={onFilterDashboardClick}
        hideNoDataFound
      >
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
          <Loader loader={showloader}>
            <div data-testid="resultContainer">
              <div
                className={`${globalClasses.flexRow} ${globalClasses.layoutAlignBetweenCenter} ${globalClasses.marginBottom}`}
              >
                <Typography variant="h6" gutterBottom>
                  Filtered Table
                </Typography>

                <div className={globalClasses.centerAlign}>
                  {dynamicLabelsBasedOnTenant("product", "core")}
                  &nbsp;level
                  {/* {showStyleLevelData && (
                    <>
                      <Switch
                        className="switch"
                        onChange={handleChangeDimension}
                      ></Switch>
                      {`${dynamicLabelsBasedOnTenant("style", "core")} level`}
                    </>
                  )} */}
                </div>

                {/* {showStyleLevelData && (
                  <div
                    className={`${globalClasses.flexRow} ${globalClasses.verticalAlignCenter}`}
                  >
                    Product level
                    <Switch
                      className="switch"
                      onChange={handleChangeDimension}
                    ></Switch>
                    {`${dynamicLabelsBasedOnTenant("style", "core")} level`}
                  </div>
                )} */}
                <div
                  className={`${globalClasses.flexRow} ${globalClasses.verticalAlignCenter} ${globalClasses.gap}`}
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
                          "Please select atleast one Product",
                          "error"
                        );
                      }
                    }}
                    disabled={
                      !canTakeActionOnModules(
                        INVENTORY_SUBMODULES_NAMES.INVENTORY_DC_MAPPING,
                        "edit"
                      )
                    }
                  >
                    Set All
                  </Button>
                </div>
              </div>
              {dimension === "product" && (
                <AgGridComponent
                  columns={columns}
                  selectAllHeaderComponent={true}
                  uniqueRowId={props.isAggregated ? "article" : "product_code"}
                  sizeColumnsToFitFlag
                  onSelectionChanged={onSelectionChanged}
                  onGridChanged
                  manualCallBack={(body, pageIndex, params) =>
                    dcProductMappingManualCallBack(body, pageIndex, params)
                  }
                  rowModelType="serverSide"
                  serverSideStoreType="partial"
                  cacheBlockSize={10}
                  loadTableInstance={setNewTableInstance}
                  onSetAllApply={onSetAllApply}
                  customSetAllFields={formData}
                  onCellValueChanged={onCellValueChanged}
                  onRowSelected
                />
              )}
              {dimension === "style" && (
                <AgGridComponent
                  columns={columns}
                  selectAllHeaderComponent={true}
                  uniqueRowId={"style"}
                  sizeColumnsToFitFlag
                  onSelectionChanged={onSelectionChanged}
                  onGridChanged
                  manualCallBack={(body, pageIndex, params) =>
                    dcProductMappingManualCallBack(body, pageIndex, params)
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
                />
              )}
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
                disabled={
                  !canTakeActionOnModules(
                    INVENTORY_SUBMODULES_NAMES.INVENTORY_DC_MAPPING,
                    "edit"
                  )
                }
              >
                Save
              </Button>
              <Button
                variant="outlined"
                onClick={() => {
                  if (setAllData.length) {
                    showConfirmBox(true);
                  } else {
                    displaySnackMessages(
                      "There is no change to save.",
                      "warning"
                    );
                  }
                }}
              >
                Cancel
              </Button>
            </div>
          </Loader>
        </div>
      </CoreComponentScreen>
    );
  };

  return <React.Fragment>{renderContent()}</React.Fragment>;
}
const mapStateToProps = (state) => {
  return {
    selectedFilters: state.filterReducer.selectedFilters["dctoproduct"],
    selecteddcFilters: state.filterReducer.selectedFilters["dctofilter"],
    isSuperUser:
      state.tenantUserRoleMgmtReducer.userRoleManagementReducer.isSuperUser,
    filterDashboardConfiguration:
      state.filterReducer.filterDashboardConfiguration[
        "dcToProductMappingFilterConfiguration"
      ],
    inventorysmartModulesPermission:
      state.inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartModulesPermission,
    savedFilterSelection: state.filterReducer.savedFilterSelection,
    isAggregated: state.dcMappingReducerService.isAggregated,
    includeDCFilter:
      state.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.inventorysmart_configuration
        ?.DCToProductMapping?.includeDCFilter,
  };
};
const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (body) => dispatch(addSnack(body)),
    setProductStatusData: (data) => dispatch(setProductStatusData(data)),
    setActiveScreenName: (data) => dispatch(setActiveScreenName(data)),
    setFilterConfiguration: (data) => dispatch(setFilterConfiguration(data)),
    getTenantConfigApplicationLevel: (dynamicRoute, queryParam) =>
      dispatch(getTenantConfigApplicationLevel(dynamicRoute, queryParam)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(DCtoProduct);
