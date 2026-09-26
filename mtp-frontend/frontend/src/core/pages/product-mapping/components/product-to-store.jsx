import React, { useEffect, useState } from "react";
import Loader from "../../../Utils/Loader/loader";
import { Button } from "@mui/material";
import { Button as MuiButton } from "impact-ui";
import globalStyles from "core/Styles/globalStyles";
import DownloadIcon from "@mui/icons-material/Download";
import makeStyles from "@mui/styles/makeStyles";
import {
  getAllProductAndGroups,
  setTenantUploadConfig,
  getAllProductsData,
  fetchUploadConfig,
  uploadMappings,
  downloadMappingData,
} from "../services-product-mapping/productMappingService";
import MappedStore from "./mapped-stores";
import { Switch } from "impact-ui";
import ProductStyleTable from "./style-level-Table";
import { setActiveScreenName } from "../../commonModulesServices/common-assort-service";
import { getColumnsAg } from "../../../actions/tableColumnActions";
import {
  Dialog,
  DialogActions,
  DialogContent,
  FormControlLabel,
  Radio,
  RadioGroup,
} from "@mui/material";
import { connect } from "react-redux";
import { addSnack } from "core/actions/snackbarActions";
import { configureViewButton } from "core/pages/storeMapping/components/common-mapping-functions";
import AgGridTable from "core/Utils/agGrid";
import CellRenderers from "core/Utils/agGrid/cellRenderer";
import { useRef } from "react";
import UploadHandler from "core/commonComponents/uploadHandler";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import {
  dynamicLabelKeysBasedOnTenant,
  dynamicLabelsBasedOnTenant,
  fetchDynamicConfigFromTenantReducer,
} from "core/Utils/DynamicLabels";
import { getTenantConfigApplicationLevel } from "core/actions/tenantConfigActions";
import { productMappingTableArticleFilter } from "core/Utils/utils";
import { isActionAllowedOnSubModule } from "core/Utils/utils";
import { INVENTORY_SUBMODULES_NAMES } from "core/Utils/constants/inventorySmart-constants";
import { captializeStringIfCamelCase } from "core/Utils/formatter";
import { DEFAULT_LEVELS } from "config/constants";
import { cloneDeep, isNumber } from "lodash";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";

const useStyles = makeStyles((theme) => ({
  confirmBox: {
    "& .MuiDialog-paper": {
      minWidth: "430px",
      borderRadius: "10px 10px 6px 6px",
    },
  },
  contentBody: {
    minHeight: "10rem",
  },
  action: {
    background: "#f7f7f7",
    padding: "1rem",
  },
  title: {
    ...theme.typography.h4,
    fontWeight: "600",
    paddingTop: "1.5rem",
  },
  text: {
    fontSize: "0.9rem",
    color: "#5a5a5ad9",
  },
  toggleStyle: {
    flex: 1,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
}));

const ProductsStoreMapping = React.forwardRef((props, ref) => {
  const [showloader, setloader] = useState(true);
  const [columns, setColumns] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedRowsIDs, setSelectedRowsIDs] = useState([]);
  const [styleRowData, setStyleRowData] = useState([]);
  const [productCurrentPage, setProductCurrentPage] = useState(0);
  const [styleCurrentPage, setStyleCurrentPage] = useState(0);
  const [showMappedStore, setShowMappedStore] = useState(false);
  const [showUploadBtn, setShowUploadBtn] = useState(false);
  const [selectedID, setSelectedID] = useState("");
  const [checked, setChecked] = useState(false);
  const [productDimension, setProductDimension] = useState("product");
  const [styleLevelColumns, setStyleColumns] = useState([]);
  const [productData, setProductData] = useState([]);
  const [productCols, setProductCols] = useState([]);
  const [productGroupCols, setProductGroupCols] = useState([]);
  const [totalProduct, setProductTotal] = useState("");
  const [totalProductStyle, setProductStyleTotal] = useState("");
  const [tableInstance, setTableInstance] = useState(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [templateHeaders, setTemplateHeaders] = useState([]);
  const [showDownloadBtn, setShowDownloadBtn] = useState(false);
  const [downloadFilterBody, setDownloadFilterBody] = useState({});
  const validationHandler = useRef();
  const classes = useStyles();
  const globalClasses = globalStyles();
  const moduleCodeRef = useRef("");

  const productGroupTableRef = useRef(null);
  const productTableRef = useRef(null);
  const styleTableRef = useRef(null);

  const [displayLevels, setDisplayLevels] = useState(
    DEFAULT_LEVELS["product"].map((level) =>
      dynamicLabelKeysBasedOnTenant(level, "core")
    )
  );
  const displaySnackMessages = (msg, type) => {
    props.addSnack({
      message: msg,
      options: {
        variant: type,
      },
    });
  };

  useEffect(() => {
    const getInitialData = async () => {
      try {
        const displayLevelsResp = await props.getTenantConfigApplicationLevel(
          3,
          {
            attribute_name: "display_levels",
          }
        );
        let updatedLevels = cloneDeep(displayLevels);

        //By default, we have 2 levels, product and style
        //If user wants to hide any level, we can pass in those levels
        //in the hiddenLevels of displayLevels key in tenant attribute master
        //Along with that, we can also provide default level key
        if (
          displayLevelsResp?.data?.data?.[0]?.["attribute_value"] &&
          displayLevelsResp?.data?.data?.[0]?.["attribute_value"]?.["value"]?.[
            "product"
          ]
        ) {
          let defaultLvl =
            displayLevelsResp?.data?.data?.[0]?.["attribute_value"]?.[
              "value"
            ]?.["product"]?.["default"];
          const hidden_levels =
            displayLevelsResp?.data?.data?.[0]?.["attribute_value"]?.[
              "value"
            ]?.["product"]?.["hidden_levels"];
          if (hidden_levels) {
            updatedLevels = cloneDeep(updatedLevels).filter(
              (level) =>
                !hidden_levels.includes(
                  dynamicLabelKeysBasedOnTenant(level, "core")
                )
            );
            setDisplayLevels(updatedLevels);
          }
          if (defaultLvl !== "product") {
            setChecked(true);
          }
        }
        let cols = [];
        let productGroupColumns = [];

        let columnPromises = [];
        columnPromises.push(
          getColumnsAg("table_name=product_store_products")()
        );
        columnPromises.push(
          getColumnsAg("table_name=product_store_product_groups")()
        );
        columnPromises.push(getColumnsAg("table_name=product_store_styles")());
        const productStoreMappingDownload = fetchDynamicConfigFromTenantReducer(
          "core",
          "mapping_download_csv_landing_screen"
        );
        setShowDownloadBtn(Boolean(productStoreMappingDownload));
        const results = await Promise.all(columnPromises);
        cols = cloneDeep(results[0]);
        productGroupColumns = cloneDeep(results[1]);
        let styleCols = cloneDeep(results[2]);
        cols = cols.map((item) => {
          if (item.column_name === "mapped_stores_count") {
            item.type = "link";
            item.is_aggregated = false;
            item.is_editable = true;
            item.cellRenderer = (cellProps, extraProps) => {
              return (
                <CellRenderers
                  cellData={cellProps}
                  column={item}
                  extraProps={extraProps}
                ></CellRenderers>
              );
            };
          }
          item.onClick = (tableInfo) => {
            setSelectedID(tableInfo.cellData.data);
            setShowMappedStore(true);
          };
          return item;
        });
        styleCols = styleCols.map((item) => {
          if (item.column_name === "mapped_stores") {
            item.type = "link";
            item.is_aggregated = false;
            item.is_editable = true;
            item.cellRenderer = (cellProps, extraProps) => {
              return (
                <CellRenderers
                  cellData={cellProps}
                  column={item}
                  extraProps={extraProps}
                ></CellRenderers>
              );
            };
          }
          item.onClick = (tableInfo) => {
            setSelectedID(tableInfo.cellData.data);
            setShowMappedStore(true);
          };
          return item;
        });
        productGroupColumns = productGroupColumns.map((item) => {
          if (item.column_name === "mapped_stores_count") {
            item.type = "link";
            item.is_aggregated = false;
            item.is_editable = true;
            item.cellRenderer = (cellProps, extraProps) => {
              return (
                <CellRenderers
                  cellData={cellProps}
                  column={item}
                  extraProps={extraProps}
                ></CellRenderers>
              );
            };
            item.onClick = (tableInfo) => {
              setSelectedID(tableInfo.cellData.data);
              setShowMappedStore(true);
            };
          }
          return item;
        });

        setColumns(cols);
        setProductGroupCols(productGroupColumns);
        setProductCols(cols);
        setStyleColumns(styleCols);
        setloader(false);
      } catch (error) {
        console.log(error);
      }
    };

    getInitialData();
    updateUploadConfig();

    props.setActiveScreenName("Product to Store mapping");
    sessionStorage.setItem("activeScreenName", "Product to Store mapping");
  }, []);

  const updateUploadConfig = async () => {
    try {
      const templateData = await fetchUploadConfig();
      const headerData =
        templateData?.data?.data?.map((obj) => {
          return { label: obj.label, key: obj.column };
        }) || [];
      setTemplateHeaders(headerData);
      const uploadConfig = fetchDynamicConfigFromTenantReducer(
        "core",
        "showProductSheetUploadBtn"
      );
      setShowUploadBtn(Boolean(uploadConfig));
      let tenantData = await props.getTenantConfigApplicationLevel(1, {
        attribute_name: "ps_mapping_upload_instructions",
      });
      props.setTenantUploadConfig(tenantData.data?.data[0]?.attribute_value);
    } catch (error) {
      console.log(error);
      displaySnackMessages(
        error.response?.data?.message || "Something went wrong",
        "error"
      );
    }
  };

  const manualCallBack = async (manualbody, pageIndex, params) => {
    setloader(true);
    if (ref.current.length === 0) {
      setloader(false);
      return {
        data: [],
        totalCount: 0,
      };
    }
    let filter = ref.current;
    // to filter table based on selected sku's, show data selected on alerts on inventory screen
    if (pageIndex === 0 && props.isRedirectedFromDifferentPage) {
      let articleFilter = productMappingTableArticleFilter;
      articleFilter.values = [...props.selectedProductMappingArticles];
      filter = [...ref.current, articleFilter];
    }

    try {
      let body = {
        filters: filter,
        meta: {
          ...manualbody,
        },
      };
      if (productDimension === "product") {
        if (checked) {
          const { data: styleDetails } = await getAllProductAndGroups(
            body,
            `product_level=style&page=${pageIndex + 1}`
          )();
          styleDetails.data = configureViewButton(
            styleDetails.data,
            "mapped_stores"
          );
          //Temporarily keeping it at FE level
          let formatedData = agGridRowFormatter(
            styleDetails.data,
            params.api.checkConfiguration,
            dynamicLabelKeysBasedOnTenant(`style`, "core")
          );
          setStyleRowData(styleDetails.data);
          setStyleCurrentPage(pageIndex + 1);
          setProductStyleTotal(styleDetails.total);
          setloader(false);
          setDownloadFilterBody(body);
          return {
            data: formatedData,
            totalCount: styleDetails.total,
          };
        } else {
          const { data: products } = await getAllProductAndGroups(
            body,
            `product_level=product&page=${pageIndex + 1}`
          )();
          products.data = configureViewButton(
            products.data,
            "mapped_stores_count"
          );
          //Temporarily keeping it at FE level
          let formatedData = agGridRowFormatter(
            products.data,
            params.api.checkConfiguration,
            dynamicLabelKeysBasedOnTenant(`product_code`, "core")
          );
          setProductTotal(products.total);
          setProductData(products.data);
          setProductCurrentPage(pageIndex + 1);
          setloader(false);
          setDownloadFilterBody(body);
          return {
            data: formatedData,
            totalCount: products.total,
          };
        }
      } else if (productDimension === "product_group") {
        const { data: group } = await getAllProductAndGroups(
          body,
          `product_level=product_group&page=${pageIndex + 1}`
        )();
        group.data = configureViewButton(group.data, "mapped_stores_count");
        //Temporarily keeping it at FE level
        let formatedData = agGridRowFormatter(
          group.data,
          params.api.checkConfiguration,
          dynamicLabelKeysBasedOnTenant(`pg_code`, "core")
        );
        setloader(false);
        return {
          data: formatedData,
          totalCount: group.total,
        };
      }
      setloader(false);
    } catch (err) {
      setloader(false);
    }
  };

  /**
   * attachCallBacks funtions will
   * check if there is any callback
   * if there is any callback
   * then attach that call to
   * validationHandler
   * @param {function} callback
   */
  const attachCallBacks = (callback) => {
    validationHandler.current = { validate: callback };
  };

  useEffect(() => {
    props.filtersSelection.length ? onClickFilter() : onReset();
  }, [props.filtersSelection]);

  const onFilter = async () => {
    setloader(true);
    tableInstance.toggleAllRowsSelected(false);
    try {
      let body = {
        filters: props.filtersSelection,
        meta: {
          range: [],
          sort: [],
          search: [],
          // limit: { limit: 10, page: 1 },
        },
      };
      const { data: product } = await getAllProductAndGroups(
        body,
        `product_level=product`
      )();
      const { data: group } = await getAllProductAndGroups(
        body,
        `product_level=product_group`
      )();
      product.data = configureViewButton(product.data, "mapped_stores_count");
      group.data = configureViewButton(group.data, "mapped_stores_count");
      // setStyleRowData(styleDetails.data);
      setProductTotal(product.total);
      // setProductStyleTotal(styleDetails.total);
      setProductData(product.data);
      setloader(false);
    } catch (err) {
      setloader(false);
    }
  };

  const onClickFilter = () => {
    if (productTableRef.current && !checked)
      productTableRef.current.api.refreshServerSideStore({ purge: true });
    if (styleTableRef.current && checked)
      styleTableRef.current.api.refreshServerSideStore({ purge: true });
    if (productGroupTableRef.current)
      productGroupTableRef.current.api.refreshServerSideStore({ purge: true });
  };

  const onConfirm = async () => {
    try {
      displaySnackMessages("Product Data Updated Successfully", "success");
      setShowModal(false);
    } catch (err) {
      console.log(err);
    }
  };

  const handleChangeDimension = (event) => {
    if (event.target.value === "product") {
      setColumns(productCols);
    } else {
      setColumns(productGroupCols);
    }
    props.changeDimension(event.target.value);
    setProductDimension(event.target.value);
  };

  const onReset = () => {
    setSelectedRowsIDs([]);
    onClickFilter();
  };

  const onStyleSwitch = async (event) => {
    const checkChecked = event.target.checked;
    setChecked(checkChecked);
  };

  const onSelectionChanged = (event) => {
    const selectedRows = event.api.getSelectedRows();
    setSelectedRowsIDs(selectedRows);
  };

  const canTakeActionOnModules = (subModuleName, action) => {
    return isActionAllowedOnSubModule(
      props?.inventorysmartModulesPermission,
      props?.module,
      subModuleName,
      action
    );
  };

  const valiateProductGroup = () => {
    let flag = true;
    //We need to add module level config for core screen configuration
    //In each module, hiddenModules will give access to hidden elements
    //Using those keys, we can hide the elements
    const productMappingConfig = fetchDynamicConfigFromTenantReducer(
      "core",
      "productMapping"
    );
    if (props.inventorysmartScreenConfig?.inventorysmart_grouping_hiddentab) {
      flag =
        props.inventorysmartScreenConfig?.inventorysmart_grouping_hiddentab.indexOf(
          "productGroup"
        ) > -1
          ? false
          : true;
    } else if (
      productMappingConfig &&
      productMappingConfig["hiddenModules"] &&
      (productMappingConfig["hiddenModules"].includes(
        "productGroupingRadioButton"
      ) ||
        productMappingConfig["hiddenModules"].includes("productRadioButton"))
    ) {
      flag = false;
    }
    return flag;
  };

  const getTableConfiguration = () => {
    let currentTableRef = null;
    let uniqueColumns = [];
    let enableSelectAll = false;
    if (productDimension === "product" && checked) {
      currentTableRef = styleTableRef;
      uniqueColumns = [dynamicLabelKeysBasedOnTenant("style", "core")];
    }
    if (productDimension === "product" && !checked) {
      currentTableRef = productTableRef;
      uniqueColumns = [dynamicLabelKeysBasedOnTenant("product_code", "core")];
      enableSelectAll = true;
    }
    if (productDimension === "product_group") {
      currentTableRef = productGroupTableRef;
      uniqueColumns = [dynamicLabelKeysBasedOnTenant("pg_code", "core")];
    }
    return {
      selection: {
        data: currentTableRef?.current?.api?.checkConfiguration || {},
        unique_columns: uniqueColumns,
      },
      enable_selectall: enableSelectAll,
    };
  };

  const onModifyClick = async () => {
    try {
      let selectedProductsList = [];
      if (selectedRowsIDs.length > 0) {
        // check if selected products count is less than 10,000
        // if not show message, else proceed with modify flow
        if (productDimension === "product_group") {
          selectedProductsList = selectedRowsIDs;
        } else if (productDimension === "product") {
          const tableConfiguration = getTableConfiguration();
          let body = {
            filters: props.filtersSelection ? props.filtersSelection : [],
            meta: {
              range: [],
              sort: [],
              search: [],
              limit: { limit: 10000, page: 1 },
            },
            selection: {
              data: [],
              unique_columns: ["product_code"],
            },
            extra: {
              selection: tableConfiguration.selection,
            },
          };
          setloader(true);
          let { data: product } = await getAllProductsData(
            body,
            `pagination?product_level=product`
          )();
          setloader(false);
          selectedProductsList = product?.data;
        }

        props.toggleModifyMapping({
          cols: columns,
          selectedProducts: selectedProductsList,
          tableConfiguration: getTableConfiguration(),
        });
      } else {
        displaySnackMessages(
          `Please select atleast one ${captializeStringIfCamelCase(
            dynamicLabelsBasedOnTenant("product", "core")
          )}`,
          "error"
        );
      }
    } catch (error) {
      if (error.response?.data?.message) {
        displaySnackMessages(error.response?.data?.message, "error");
      } else {
        displaySnackMessages("Something went wrong", "error");
      }
      setloader(false);
    }
  };

  /**
   * @function
   * @description Validate parcedExcelData, create payload using CSV_CONFIG and call file upload api
   */
  const handleUpload = async (file) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("module_code", moduleCodeRef.current)
      const res = await uploadMappings(formData);
      displaySnackMessages(
        res?.data?.message ||
          "Please wait for notification to be received shortly",
        "success"
      );
      if (res?.data?.status) {
        setIsUploadModalOpen(false);
      } else {
        validationHandler.current.validate([{ message: res?.data?.message }]);
      }
    } catch (error) {
      if (error.response?.data?.data?.length) {
        validationHandler.current.validate(error.response?.data?.data);
      } else {
        displaySnackMessages(
          error.response?.data?.message || "Something went wrong.",
          "error"
        );
        validationHandler.current.validate([]);
      }
    }
  };

  const downloadData = async () => {
    setloader(true);
    try {
      const modifiedFilterBody = {
        ...downloadFilterBody,
        meta: {
          ...downloadFilterBody.meta,
          ...(props?.inventorysmartScreenConfig?.dashboard?.downloadAllOnTableSearch 
            ? { 
                ...downloadFilterBody.meta,
                search: []        
              }
            : downloadFilterBody.meta),
        }
      };
      
      setDownloadFilterBody(modifiedFilterBody);
      const resp = await downloadMappingData(modifiedFilterBody);
      displaySnackMessages(
        resp?.data?.message ||
          "Download initiated, you will recieve a notification shortly.",
        "success"
      );
      setloader(false);
    } catch (error) {
      displaySnackMessages(
        error.response?.data?.message || "Something went wrong.",
        "error"
      );
      setloader(false);
    }
  };

  const renderContent = () => {
    return (
      <Loader loader={showloader || props.fetchProductIdsInGrpLoader}>
        <div data-testid="filterContainer">
          {showMappedStore && (
            <MappedStore
              checked={checked}
              selectedID={selectedID}
              dimension={productDimension}
              onModify={(dataBody) => {
                props.toggleModifyMapping({
                  ...dataBody,
                  tableConfiguration: getTableConfiguration(),
                });
              }}
              onCancel={() => {
                setShowMappedStore(false);
              }}
              disableModify={canTakeActionOnModules(
                INVENTORY_SUBMODULES_NAMES.INVENTORY_PRODUCT_MAPPING,
                "edit"
              )}
              isAggregated={props.isAggregated}
            ></MappedStore>
          )}

          <Dialog
            open={showModal}
            className={classes.confirmBox}
            onClose={() => setShowModal(false)}
            id={"routePrompt"}
          >
            <DialogContent className={classes.contentBody}>
              <div className={classes.title}> Update Changes</div>
              <div className={classes.text}>
                Are you sure to update all changes ?
              </div>
            </DialogContent>
            <DialogActions className={classes.action}>
              <Button
                id="routePromptYes"
                onClick={() => setShowModal(false)}
                color="primary"
                autoFocus
              >
                Close
              </Button>
              <Button
                id="routePromptYes"
                onClick={() => onConfirm()}
                color="primary"
                autoFocus
              >
                Update
              </Button>
            </DialogActions>
          </Dialog>

          <div data-testid="resultContainer">
            <div
              className={`${globalClasses.flexRow} ${globalClasses.layoutAlignBetweenCenter} ${globalClasses.marginBottom}`}
            >
              <RadioGroup
                row
                name="controlled-radio-buttons-group"
                value={productDimension}
                onChange={handleChangeDimension}
              >
                {valiateProductGroup() && (
                  <FormControlLabel
                    value="product"
                    control={<Radio color="primary" />}
                    label={dynamicLabelsBasedOnTenant("product", "core")}
                  />
                )}
                {valiateProductGroup() && (
                  <FormControlLabel
                    value="product_group"
                    control={<Radio color="primary" />}
                    label={dynamicLabelsBasedOnTenant(
                      "product_grouping",
                      "core"
                    )}
                  />
                )}
              </RadioGroup>
              {productDimension === "product" ? (
                <div className={classes.toggleStyle}>
                  {displayLevels.length === 2 && (
                    <Switch
                      className="switch"
                      id="productToggleBtn"
                      checked={checked}
                      onChange={onStyleSwitch}
                      rightLabel={
                        displayLevels.includes(
                          dynamicLabelKeysBasedOnTenant("style", "core")
                        ) &&
                        `${dynamicLabelsBasedOnTenant("style", "core")}
                           level`
                      }
                      leftLabel={
                        displayLevels.includes("product") &&
                        `${dynamicLabelsBasedOnTenant("product", "core")}
                           level`
                      }
                    />
                  )}
                </div>
              ) : (
                <div className={classes.toggleStyle} />
              )}
              <div
                className={`${globalClasses.flexRow} ${globalClasses.layoutAlignBetweenCenter} ${globalClasses.gap}`}
              >
                {showDownloadBtn && productDimension === "product" && (
                  <MuiButton
                    onClick={() => downloadData()}
                    icon={DownloadIcon}
                    variant="secondary"
                    disabled={!ref.current?.length || 
                      !canTakeActionOnModules(
                        INVENTORY_SUBMODULES_NAMES.INVENTORY_PRODUCT_MAPPING,
                        "edit"
                      )
                    }
                  />
                )}
                {showUploadBtn && (
                  <>
                    <Button
                      variant="contained"
                      color="primary"
                      id="Edit&Upload"
                      onClick={() => {
                        setIsUploadModalOpen(true);
                      }}
                    >
                      <FileUploadIcon />
                    </Button>
                    <UploadHandler
                      handleUpload={handleUpload}
                      isModalOpen={isUploadModalOpen}
                      setIsModalOpen={(val) => {
                        setIsUploadModalOpen(val);
                      }}
                      attachCallBacks={attachCallBacks}
                      templateConfig={templateHeaders}
                      uploadInstructions={[]}
                      tenantUploadConfig={props.tenantUploadConfig}
                      templateName="productMappingTemplate"
                      moduleName="Product Mapping"
                      moduleCodeRef={moduleCodeRef}
                      macroIdPath={"plr_upload_template"}
                    />
                  </>
                )}
                <Button
                  variant="contained"
                  color="primary"
                  onClick={onModifyClick}
                  disabled={
                    !canTakeActionOnModules(
                      INVENTORY_SUBMODULES_NAMES.INVENTORY_PRODUCT_MAPPING,
                      "edit"
                    )
                  }
                >
                  Modify
                </Button>
              </div>
            </div>
            {productCols.length > 0 && productDimension === "product" && (
              <ProductStyleTable
                ref={checked ? styleTableRef : productTableRef}
                productColumns={productCols}
                styleColumns={styleLevelColumns}
                styleRowData={styleRowData}
                productRowData={productData}
                totalProductStyle={totalProductStyle}
                totalProduct={totalProduct}
                checked={checked}
                setSelectedRowsIDs={setSelectedRowsIDs}
                productCurrentPage={productCurrentPage}
                styleCurrentPage={styleCurrentPage}
                manualCallBack={manualCallBack}
                setTableInstance={setTableInstance}
                onSelectionChanged={onSelectionChanged}
                isAggregated={props.isAggregated}
              ></ProductStyleTable>
            )}
            {productDimension === "product_group" && (
              <AgGridTable
                columns={productGroupCols}
                selectAllHeaderComponent={true}
                hideSelectAllRecords={true}
                sizeColumnsToFitFlag
                onGridChanged
                onRowSelected
                manualCallBack={(body, pageIndex, params) =>
                  manualCallBack(body, pageIndex, params)
                }
                loadTableInstance={(gridInstance) => {
                  productGroupTableRef.current = gridInstance;
                }}
                rowModelType="serverSide"
                serverSideStoreType="partial"
                cacheBlockSize={10}
                uniqueRowId={"pg_code"}
                onSelectionChanged={onSelectionChanged}
              />
            )}
          </div>
        </div>
      </Loader>
    );
  };

  return <React.Fragment>{renderContent()}</React.Fragment>;
});

const mapStateToProps = (state) => {
  return {
    inventorysmartModulesPermission:
      state.inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartModulesPermission,
    inventorysmartScreenConfig:
      state.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    isAggregated: state.productMappingReducerService.isAggregated,
    tenantUploadConfig: state.productMappingReducerService.tenantUploadConfig,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    setActiveScreenName: (data) => dispatch(setActiveScreenName(data)),
    setTenantUploadConfig: (data) => dispatch(setTenantUploadConfig(data)),
    addSnack: (snackObj) => dispatch(addSnack(snackObj)),
    getTenantConfigApplicationLevel: (dynamicRoute, queryParam) =>
      dispatch(getTenantConfigApplicationLevel(dynamicRoute, queryParam)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps, null, {
  forwardRef: true,
})(ProductsStoreMapping);
