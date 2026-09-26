import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import makeStyles from "@mui/styles/makeStyles";
import globalStyles from "core/Styles/globalStyles";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import AgGridTable from "core/Utils/agGrid";
import CellRenderers from "core/Utils/agGrid/cellRenderer";
import ConfirmBox from "core/Utils/confirmPrompt/confirmPopup";
import { productMappingTableArticleFilter } from "core/Utils/constants/inventorySmart-constants";
import { addSnack } from "core/actions/snackbarActions";
import { Prompt, Switch } from "impact-ui";
import { cloneDeep, isEmpty } from "lodash";
import React, { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import Loader from "../../../Utils/Loader/loader";
import { setProductStatusData } from "../../../actions/productStoreStatusActions";
import { getColumnsAg } from "../../../actions/tableColumnActions";
import { setActiveScreenName } from "../../commonModulesServices/common-assort-service";
import {
  getAllDC,
  getAllFC,
  getAllProductDC,
  mapProductToDC,
  mapProductToFC,
} from "../services-product-mapping/productMappingService";
import { getDCFCSetAllPayload } from "./common-functions";
import Modify from "./modify-product-mapping";
import { INVENTORY_SUBMODULES_NAMES } from "core/Utils/constants/inventorySmart-constants";
import { checkToDisplayToggleAttributeLevel } from "core/Utils/functions/utils";
import { isActionAllowedOnSubModule } from "core/Utils/utils";
import { getTenantConfigApplicationLevel } from "core/actions/tenantConfigActions";

const useStyles = makeStyles(() => ({
  button: {
    marginLeft: "0.6rem",
  },
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
    fontSize: "1rem",
    fontWeight: "600",
    paddingTop: "1.5rem",
  },
  text: {
    fontSize: "0.9rem",
    color: "#5a5a5ad9",
  },
  HeaderBreadCrumbs: {
    display: "flex",
    paddingBottom: "2rem",
  },
  footer: {
    textAlign: "center",
    padding: "1rem",
  },
}));

const ProductsFilter = React.forwardRef((props, ref) => {
  const globalClasses = globalStyles();
  const [showloader, setloader] = useState(true);
  const [columns, setColumns] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedRowsIDs, setSelectedRowsIDs] = useState([]);
  const [modifyProduct, showModifyProduct] = useState(false);
  const [setAllDataDC, updatesetAllDataDC] = useState([]);
  const [fcData, setfcData] = useState([]);
  const [dcData, setdcData] = useState([]);
  const [dcDefaultData, setdcDefaultData] = useState([]);
  const [fcCols, setfcCols] = useState([]);
  const [dcCols, setdcCols] = useState([]);
  const [disableSetAll, setDisableSetAll] = useState(false);
  const [toggleFcValue, setToggleFcValue] = useState(false);
  const [confirmBox, showConfirmBox] = useState(false);
  const dcfcTableRef = useRef(null);
  const [showFCLevelView, setShowFCLevelView] = useState(true); //State variable to show fc level
  const classes = useStyles();
  const { updateFlagEdit = () => {} } = props;

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
        let cols = await getColumnsAg("table_name=product_dc")();
        let fcColums = await getColumnsAg("table_name=product_fc")();

        // let actionPermissionCheck = canTakeActionOnModules(
        //   INVENTORY_SUBMODULES_NAMES.INVENTORY_PRODUCT_MAPPING_PRODUCT_DC_FC,
        //   "edit"
        // );
        cols.forEach(async (item) => {
          if (item.column_name === "dc_map") {
            item.isMulti =
              item?.extra?.is_multiple_selection === true ||
              item?.extra?.is_multiple_selection === false
                ? item?.extra?.is_multiple_selection
                : true;
            const { data: dcOptions } = await getAllDC()();
            item.options = dcOptions.data.map((opt) => {
              return {
                label: opt.name,
                id: `${opt.dc_code}`,
                value: `${opt.dc_code}`,
              };
            });
            // item.disabled = !actionPermissionCheck;
            item.cellRenderer = (cellProps, extraProps) => {
              return (
                <CellRenderers
                  cellData={cellProps}
                  column={item}
                  extraProps={extraProps}
                ></CellRenderers>
              );
            };
            if (item?.extra?.is_disabled) {
              setDisableSetAll(true);
            }
          }
        });
        fcColums.forEach(async (item) => {
          if (item.column_name === "fc_map") {
            item.isMulti = true;
            const { data: fcOptions } = await getAllFC()();
            item.options = fcOptions.data.map((opt) => {
              return {
                label: opt.name,
                id: `${opt.fc_code}`,
                value: `${opt.fc_code}`,
              };
            });
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
        });

        setColumns(cols);
        setdcCols(cols);
        setfcCols(fcColums);
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

    props.setActiveScreenName("Product to DC/FC mapping");
    sessionStorage.setItem("activeScreenName", "Product to DC/FC mapping");
  }, []);

  const canTakeActionOnModules = (subModuleName, action) => {
    return isActionAllowedOnSubModule(
      props?.inventorysmartModulesPermission,
      props?.module,
      subModuleName,
      action
    );
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

    let body = {
      filters: filter,
      meta: {
        ...manualbody,
        limit: { limit: 10, page: pageIndex + 1 },
      },
      selection: {
        data: params?.api?.checkConfiguration,
        unique_columns: props.isAggregated
          ? ["aggregation_code"]
          : ["product_code"],
      },
    };

    let queryParams = `?page=${pageIndex + 1}&level=${
      props.isAggregated ? "aggregation" : "product"
    }`;

    let { data: DC } = await getAllProductDC(body, queryParams)();
    DC.data = DC.data.map((item) => {
      if (item.dc_map) {
        item.dc_map = item.dc_map.map((item) => `${item.dc_code}`);
      }
      return item;
    });

    setloader(false);
    setdcData(DC.data);
    setdcDefaultData(cloneDeep(DC.data));
    setloader(false);
    return {
      data: DC.data,
      totalCount: DC.total,
    };
  };

  useEffect(() => {
    props.filtersSelection.length ? onClickFilter() : onReset();
  }, [props.filtersSelection]);

  const onClickFilter = () => {
    if (dcfcTableRef.current)
      dcfcTableRef.current.api.refreshServerSideStore({ purge: true });
  };

  const setAllChanges = async (fields_values, params) => {
    let map_col = columns.filter((col) => col.column_name === "dc_map");
    map_col = map_col.length === 1 ? map_col[0] : {};
    const setAllPayload = getDCFCSetAllPayload(
      "product",
      ref.current,
      params,
      fields_values,
      props.isAggregated,
      map_col
    );
    if (!toggleFcValue) {
      await mapProductToDC(setAllPayload, true, props.isAggregated)();
    }
    params.api.deselectAll();
    onClickFilter();
  };

  const saveRequest = () => {
    if (setAllDataDC.length) {
      setShowModal(true);
    } else {
      displaySnackMessages("There is no change to save.", "warning");
    }
  };

  const onConfirm = async () => {
    try {
      setloader(true);
      if (setAllDataDC.length) {
        let body = { elements: setAllDataDC };
        const response = await mapProductToDC(
          body,
          false,
          props.isAggregated
        )();
        if (response?.data?.message.includes("Failed")) {
          displaySnackMessages(response?.data?.message, "error");
          return;
        }
      }
      //Once we save the data, we reset to the original state
      updatesetAllDataDC([]);
      displaySnackMessages("Product(s) mapped successfully", "success");
      setShowModal(false);
      setloader(false);
      updateFlagEdit(false);
    } catch (err) {
      setloader(false);
      displaySnackMessages(
        "Unable to save the request.Please try again",
        "error"
      );
    }
  };

  const onReset = () => {
    updatesetAllDataDC([]);
    onClickFilter();
  };

  const onSelectionChanged = (event) => {
    setSelectedRowsIDs(event.api.getSelectedRows());
  };

  const onCellValueChanged = (params) => {
    let map_col = columns.filter((col) => col.column_name === "dc_map");
    map_col = map_col.length === 1 ? map_col[0] : {};
    const all_dc_options = isEmpty(map_col) ? [] : map_col?.options || [];
    let rowIndex = params.rowIndex % 10; //If rowIndex is greater than 10
    let value = Array.isArray(params.value)
      ? params.value.map((val) => val.value || val)
      : [params.value];
    const names = Array.isArray(params.value)
      ? params.value.map((val) => val.label || val)
      : [params.value];
    let row = {
      values: params.data,
    };
    const columnId = params.column.colId;
    const uniqueId = props.isAggregated ? "article" : "product_code";
    if (columnId === "dc_map") {
      //First filter the objects apart from the current row/product code
      //In the alreadyexist array, we will have edited objects which are not part of current product_code
      let alreadyexist = setAllDataDC
        ? setAllDataDC.filter((item) => row.values[uniqueId] !== item[uniqueId])
        : [];
      let newElement = {
        product_code: row.values[uniqueId],
        dc: {
          map: [],
          unmap: [],
        },
      };
      if (!map_col?.isMulti) {
        const mapped_dc = value[0];
        let dc_map = [];
        let dc_unmap = [];
        all_dc_options.forEach((dc_option) => {
          if (dc_option.value === mapped_dc) {
            dc_map.push(dc_option.value);
          } else {
            dc_unmap.push(dc_option.value);
          }
          newElement = {
            product_code: row.values[uniqueId],
            dc: {
              map: dc_map,
              unmap: dc_unmap,
            },
          };
        });
      } else {
        //check from the default data if the current dc-product_code are unmapped or not
        let unmapped = dcDefaultData
          .filter((item) => item[uniqueId] === row.values[uniqueId])
          .map((item) => item.dc_map)[0];

        //Prepare updated product_code with updated dc mappings
        //If we are newly mapping, it would go to map key list
        //If we are unmapping, it would go to unmap key list
        newElement = {
          product_code: row.values[uniqueId],
          dc: {
            map: unmapped
              ? value.filter((item) => unmapped.indexOf(item) === -1)
              : value,
            unmap: unmapped
              ? unmapped.filter((item) => value.indexOf(item) === -1)
              : [],
          },
        };
      }
      updatesetAllDataDC([...alreadyexist, newElement]);
      let newData = dcData.map((item, index) => {
        if (index === rowIndex) {
          return {
            ...item,
            [columnId]: value,
            [`${columnId}Names`]: names,
          };
        }
        return item;
      });
      setdcData(newData);
    }
    if (columnId === "fc_map") {
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
    updateFlagEdit(true);
  };

  const renderContent = () => {
    return (
      <Loader loader={showloader}>
        <div
          style={{ display: modifyProduct ? "none" : "" }}
          data-testid="filterContainer"
        >
          <Prompt
            isOpen={showModal}
            title="Confirm Changes"
            subHeading="Are you sure to save all your changes?"
            infoList={[]}
            primaryButtonProps={{
              children: "Update",
              onClick: () => {
                onConfirm();
                setShowModal(false);
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
                Filtered {dynamicLabelsBasedOnTenant("product", "core")}
              </Typography>
              <div className={globalClasses.centerAlign}>
                <Typography>DC Mapping</Typography>
                {showFCLevelView && (
                  <>
                    <Switch
                      onChange={(event) => {
                        if (event.target.checked) {
                          setToggleFcValue(true);
                          setColumns(fcCols);
                        } else {
                          setToggleFcValue(false);
                          setColumns(dcCols);
                        }
                      }}
                      disabled={true}
                    />
                    <Typography>FC Mapping</Typography>
                  </>
                )}
              </div>
              <div>
                <Button
                  variant="contained"
                  color="primary"
                  className={classes.button}
                  onClick={async () => {
                    if (selectedRowsIDs.length > 0) {
                      dcfcTableRef.current.trigerSetAll(true);
                    } else {
                      displaySnackMessages(
                        "Please select atleast one Product",
                        "error"
                      );
                    }
                  }}
                  disabled={
                    !canTakeActionOnModules(
                      INVENTORY_SUBMODULES_NAMES.INVENTORY_PRODUCT_MAPPING_PRODUCT_DC_FC,
                      "edit"
                    ) || disableSetAll
                  }
                >
                  Set All
                </Button>
              </div>
            </div>

            {columns.length > 0 && (
              <AgGridTable
                columns={columns}
                // rowData={toggleFcValue ? fcData : dcData}
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
                uniqueRowId={props.isAggregated ? "article" : "product_code"}
                onSelectionChanged={onSelectionChanged}
                setAllInterdependentFields={true}
                onSetAllApply={setAllChanges}
                onCellValueChanged={onCellValueChanged}
              />
            )}
          </div>
          {confirmBox && (
            <ConfirmBox
              onClose={() => showConfirmBox(false)}
              onConfirm={() => {
                if (dcData.length) {
                  updatesetAllDataDC([]);
                  onClickFilter();
                }
                showConfirmBox(false);
                updateFlagEdit(false);
              }}
            />
          )}
          <div className={classes.footer}>
            <Button
              variant="contained"
              color="primary"
              className={classes.button}
              onClick={() => {
                saveRequest();
              }}
              disabled={
                !canTakeActionOnModules(
                  INVENTORY_SUBMODULES_NAMES.INVENTORY_PRODUCT_MAPPING_PRODUCT_DC_FC,
                  "edit"
                )
              }
            >
              Save
            </Button>
            <Button
              variant="outlined"
              id="producttoDcfcCancelBtn"
              className={classes.button}
              onClick={() => {
                if ((dcData.length || fcData.length) && setAllDataDC.length) {
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

        {modifyProduct && (
          <div style={{ display: modifyProduct ? "" : "none" }}>
            <Modify
              cols={columns}
              selectedProducts={selectedRowsIDs[0]}
              goBack={() => showModifyProduct(false)}
            ></Modify>
          </div>
        )}
      </Loader>
    );
  };

  return <React.Fragment>{renderContent()}</React.Fragment>;
});

const mapStateToProps = (state) => {
  return {
    inventorysmartModulesPermission:
      state.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartModulesPermission,
    isAggregated: state.productMappingReducerService.isDcMappingAggregated,
  };
};
const mapDispatchToProps = (dispatch) => {
  return {
    setProductStatusData: (data) => dispatch(setProductStatusData(data)),
    setActiveScreenName: (data) => dispatch(setActiveScreenName(data)),
    addSnack: (snackObj) => dispatch(addSnack(snackObj)),
    getTenantConfigApplicationLevel: (dynamicRoute, queryParam) =>
      dispatch(getTenantConfigApplicationLevel(dynamicRoute, queryParam)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps, null, {
  forwardRef: true,
})(ProductsFilter);
