import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "impact-ui-v3";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import AgGridComponent from "core/Utils/agGrid";
import CellRenderers from "core/Utils/agGrid/cellRenderer";
import { setFilterConfiguration } from "core/actions/filterAction";
import { addSnack } from "core/actions/snackbarActions";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import { customSetAllField } from "core/commonComponents/coreComponentScreen/constants";
import {
  fetchFilterFieldValues,
  formattedFilterConfiguration,
} from "core/commonComponents/coreComponentScreen/utils";
import { cloneDeep, difference, isEmpty, isNull } from "lodash";
import {
  getAllProductDC,
  mapProductToDC,
} from "modules/inventorysmart/pages-inventorysmart/Product-Mapping/services-product-mapping/productMappingService";
import { connect } from "react-redux";
import { Prompt } from "react-router";
import Loader from "core/Utils/Loader/loader";
import ConfirmBox from "core/Utils/confirmPrompt/confirmPopup";
import { setActiveScreenName } from "core/pages/commonModulesServices/common-assort-service";
import {
  getAllDCData,
  getAllStyleDC,
} from "../services-dc-mapping/dc-mapping-service";
import "./filter.scss";

import { INVENTORY_SUBMODULES_NAMES } from "core/Utils/constants/inventorySmart-constants";
import { isActionAllowedOnSubModule } from "core/Utils/utils";
import { ERROR_MESSAGE } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { Button, Prompt as IaPrompt } from "impact-ui-v3";
import { IS_OVERRIDEN_CORE_BUTTON_WIDTH,IS_OVERRIDEN_CORE_BUTTON_PLACEMENT } from "core/constants";

function DCtoProduct(props) {
  const { t } = useTranslation();
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
  const onFilterDependency = useRef(null);
  const onFilterSectionApplied = useRef(0);
  const columnFiltersApplied = useRef([]);
  const tableInstance = useRef(null);

  const setNewTableInstance = (params) => {
    tableInstance.current = params;
  };

  const handleErrorMessage = (e) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message) displaySnackMessages(errObj?.message, "error");
    else displaySnackMessages(ERROR_MESSAGE, "error");
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
    const dc_prod_access = canTakeActionOnModules(
      INVENTORY_SUBMODULES_NAMES.INVENTORY_DC_MAPPING_DC_PRODUCT,
      "edit"
    );
    if (!dc_prod_access) {
      return canTakeActionOnModules(
        INVENTORY_SUBMODULES_NAMES.INVENTORY_DC_MAPPING,
        "edit"
      );
    }
    return true;
  };

  const getData = async (inputdata, final_cols, dim) => {
    // this function processes the input data which can be displayed on the table
    // inputs are array objects returned from the backend, column names and dimension()product or style

    let final_data = [];
    for (const data of inputdata) {
      let temp = {};
      if (data.dc_map !== null) {
        for (const col_key of final_cols) {
          if (col_key?.extra?.is_dc_col) {
            //For dc columns, we make the default value as false
            //Then update based on dc_map loop below
            temp[col_key.accessor] = false;
          } else {
            //If the column is not dc type, we get the data from API response
            temp[col_key.accessor] = data[col_key.accessor];
          }
          for (const dc_key of data.dc_map) {
            if (dc_key.name.replaceAll(".", "_") === col_key.accessor) {
              temp[col_key.accessor] = true;
            }
          }
        }
      } else {
        for (const col_key of final_cols) {
          if (col_key?.extra?.is_dc_col) {
            //For dc columns, we make the default value as false
            //Then update based on dc_map loop below
            temp[col_key.accessor] = false;
          } else {
            temp[col_key.accessor] = data[col_key.accessor];
          }
        }
      }
      if (dim === "product") {
        temp["product_code"] = data.product_code;
        temp["product_name"] = data.product_name;
        temp["article"] = data?.article;
        temp["l0_name"] = data.l0_name;
        temp["l1_name"] = data.l1_name;
        temp["l2_name"] = data.l2_name;
        temp["product_channel_name"] = data.product_channel_name;
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
    let editPermission = checkAccess();
    final_cols = final_cols.map((item) => {
      if (item?.extra?.is_dc_col) {
        //We are replacing . with _ because aggrid internally treats . as nested fields
        //We are getting . in one of the DC field names
        item.field = item.field.replaceAll(".", "_");
        item.accessor = item.accessor.replaceAll(".", "_");
        item.column_name = item.column_name.replaceAll(".", "_");
        item.type = "ToogleField";
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
              filterDashboardData: [...defaultValues, ...dcdefaultValues],
              isCrossDimensionFilter: false,
              screen_name: props.screenName,
            },
          ];
          const filterConfig = formattedFilterConfiguration(
            "dcToProductMappingFilterConfiguration",
            filterConfigData,
            "Dc To Product Mapping"
          );
          props.setFilterConfiguration(filterConfig);
        }

        setloader(false);
      } catch (error) {
        setloader(false);
        handleErrorMessage(error);
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

      tableInstance.current.api?.deselectAll(true);
      updateSetAllData([]);
      setFlag_edit(false);
      setloader(false);
      tableInstance.current.api?.refreshServerSideStore({ purge: true });
      const message = t("inventorysmart.mappingDataUpdatedSuccessfully");
      displaySnackMessages(message, "success");
    } catch (err) {
      handleErrorMessage(err);
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
        if (onFilterSectionApplied.current === 0) {
          // table filter applied trigger manual callback

          tableInstance.current?.api?.refreshServerSideStore({ purge: true });
        } else if (onFilterSectionApplied.current === 1) {
          // column filter applied, no need to trigger callback
          let productcols = await getAllDCData(dcbody, "product");
          let updatedprdcols = columnUpdate(productcols);
          setproductCols(updatedprdcols);
          setColumns(updatedprdcols);
        }
      } else {
        if (onFilterSectionApplied.current === 0) {
          // table filter applied trigger manual callback

          tableInstance.current?.api?.refreshServerSideStore({ purge: true });
        } else if (onFilterSectionApplied.current === 1) {
          // column filter applied, no need to trigger callback

          let stylecols = await getAllDCData(dcbody, "style");
          let updatedcols = columnUpdate(stylecols);
          setstyleCols(updatedcols);
          setColumns(updatedcols);
        }
      }
      setloader(false);
    } catch (error) {
      handleErrorMessage(error);
      setloader(false);
    }
  };

  const onFilterDashboardClick = (
    dependencyData,
    filterData,
    filterSectionApplied
  ) => {
    onFilterSectionApplied.current = filterSectionApplied;
    if (filterSectionApplied === 1) {
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
      handleErrorMessage(err);
      setloader(false);
    }
  };

  const saveRequest = () => {
    if (setAllData.length) {
      setShowModal(true);
    } else {
      displaySnackMessages(t("inventorysmart.noChangeToSave"), "warning");
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

    const getTopRightOptions = () => {
      let options = [];
      if (selectedRowsIDs?.length > 0) {
        options.push(
          <Button
            variant="primary"
            onClick={async () => {
              if (setAllData.length) {
                showConfirmBox(true);
              } else if (selectedRowsIDs.length > 0) {
                tableInstance.current.trigerSetAll(true);
              } else {
                displaySnackMessages(
                  t("inventorysmart.pleaseSelectAtleastOneProduct"),
                  "error"
                );
              }
            }}
            disabled={!checkAccess()}
            children={t("inventorysmart.setAll")}
          />
        );
      }
      options.push(
        <>
          <Button
            variant="secondary"
            onClick={() => {
              if (setAllData.length) {
                showConfirmBox(true);
              } else {
                displaySnackMessages(
                  t("inventorysmart.noChangeToSave"),
                  "warning"
                );
              }
            }}
          >
            {t("inventorysmart.cancel")}
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              saveRequest();
            }}
            disabled={!checkAccess()}
          >
            {t("inventorysmart.save")}
          </Button>
        </>
      );
      return options;
    };

    return (
      <div style={{ marginTop: IS_OVERRIDEN_CORE_BUTTON_PLACEMENT }}>
        <CoreComponentScreen
          showPageRoute={false}
          IscoreButtonWidth={IS_OVERRIDEN_CORE_BUTTON_WIDTH}
          // Filter dashboard props
          showFilterDashboard={true}
          filterConfigKey={"dcToProductMappingFilterConfiguration"}
          onApplyFilter={onFilterDashboardClick}
          screenName={"dc to product"}
          autoHideFilterButton={true}
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
              title={t("inventorysmart.confirmChanges")}
              children={t("inventorysmart.areYouSureToSaveAllYourChanges")}
              infoList={[]}
              primaryButtonLabel={t("inventorysmart.update")}
              secondaryButtonLabel={t("inventorysmart.close")}
              onPrimaryButtonClick={() => {
                onConfirm(setAllData);
                setShowModal(false);
              }}
              onSecondaryButtonClick={() => setShowModal(false)}
            />
            <Loader loader={showloader}>
              <div data-testid="resultContainer">
                {dimension === "product" && (
                  <AgGridComponent
                    columns={columns}
                    selectAllHeaderComponent={true}
                    uniqueRowId={
                      props.isAggregated ? "article" : "product_code"
                    }
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
                    topRightOptions={getTopRightOptions()}
                    tableHeader={
                      <>
                        <span style={{ fontWeight: "normal" }}>
                          {t("inventorysmart.filteredTable")}{" "}
                        </span>
                        <strong>
                          {dynamicLabelsBasedOnTenant("product", "core")} level
                        </strong>
                      </>
                    }
                    customSetAllComponent={props.customSetAllComponent}
                    showSaveTableConfig={false}
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
                    setAllButtonLabel={t("inventorysmart.applyAndSave")}
                    topRightOptions={getTopRightOptions()}
                    tableHeader={
                      <>
                        <span style={{ fontWeight: "normal" }}>
                          {t("inventorysmart.filteredTable")}{" "}
                        </span>
                        <strong>
                          {dynamicLabelsBasedOnTenant("product", "core")} level
                        </strong>
                      </>
                    }
                    customSetAllComponent={props.customSetAllComponent}
                  />
                )}
              </div>
            </Loader>
          </div>
        </CoreComponentScreen>
      </div>
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
      state.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartModulesPermission,
    savedFilterSelection: state.filterReducer.savedFilterSelection,
    isAggregated: state.dcMappingReducerService.isAggregated,
  };
};
const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (body) => dispatch(addSnack(body)),
    setActiveScreenName: (data) => dispatch(setActiveScreenName(data)),
    setFilterConfiguration: (data) => dispatch(setFilterConfiguration(data)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(DCtoProduct);
