import { addSnack } from "core/actions/snackbarActions";
import { isEmpty, uniqBy } from "lodash";
import {
  ERROR_MESSAGE,
  NO_DATA_FOUND,
  POP_UP_TYPE,
  tableArticleFilter,
  ROLES_ACCESS_MODULES_MAPPING,
  APP_NAME,
  FULL_ACCESS_PERMISSIONS_LIST,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import {
  getProductRuleTableData,
  getRuleHeaderConfiguration,
  setProductRuleTableLoader,
  setSelectedFilters,
  updateAutoAllocation,
} from "modules/inventorysmart/services-inventorysmart/Product-Profile/product-rule-services";
import { useEffect, useState } from "react";
import makeStyles from "@mui/styles/makeStyles";
import { connect } from "react-redux";
import AgGridComponent from "core/Utils/agGrid";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import Loader from "core/Utils/Loader/loader";
import ProductRulePopUp from "./ProductRulePopUp";
import {
  getModuleLevelAccess,
  setInventorySmartModulesPermissions,
  setInventorySmartPermissionLoader,
} from "modules/inventorysmart/services-inventorysmart/common/inventory-smart-common-services";
import SetAllTabs from "./setAllTab";
import { Button } from "@mui/material";
import { INVENTORY_SUBMODULES_NAMES } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { isActionAllowedOnSubModule } from "../../inventorysmart-utility";

const useStyles = makeStyles((theme) => ({
  setAllBtn: {
    padding: "1rem",
    display: "flex",
    justifyContent: "flex-end",
  },
}));

const ProductRuleTable = (props) => {
  const [agGridInstance, setAgGridInstance] = useState({});
  const [userTableColumns, setUserTableColumns] = useState([]);
  const [render, setRender] = useState(true);
  const classes = useStyles();

  // pop up states
  const [open, setOpen] = useState(false);
  const [triggeSetAll, updateTriggeSetAll] = useState(false);
  const [popUpColumnData, setPopUpColumnData] = useState([]);
  const [popUpRowData, setPopUpRowData] = useState([]);
  const [metaBody, setMetaBody] = useState([]);
  const [autoAllocationBtn, showAutoAllocationBtn] = useState(false);
  useEffect(() => {
    if (props.inventorysmartScreenConfig) {
      const fetchModulesAccess = async () => {
        try {
          props.setInventorySmartPermissionLoader(true);
          // props.module is fetched  from routes
          const moduleName = props?.module;
          const subModules = ROLES_ACCESS_MODULES_MAPPING[props?.module];

          let rolesBasedModulesPermission = {};

          // identifying if its for vb or signet
          if (props.inventorysmartScreenConfig.roleBasedAccess) {
            await Promise.all(
              subModules.map(async (module) => {
                const accessDataResponse = await props?.getModuleLevelAccess({
                  app: APP_NAME,
                  module,
                });

                rolesBasedModulesPermission[module] = Object.keys(
                  accessDataResponse.data.data
                );
              })
            );
          } else {
            subModules.map(async (subModule) => {
              rolesBasedModulesPermission[
                subModule
              ] = FULL_ACCESS_PERMISSIONS_LIST;
            });
          }
          props?.setInventorySmartModulesPermissions({
            [moduleName]: rolesBasedModulesPermission,
          });
        } catch (error) {
          console.log(error, "error");
          displaySnackMessages(ERROR_MESSAGE, "error");
        } finally {
          props.setInventorySmartPermissionLoader(false);
        }
      };
      fetchModulesAccess();
      return () => {
        props.resetProductProfile && props.resetProductProfile();
      };
    }
  }, [props.inventorysmartScreenConfig]);

  //fetch column header of grid
  useEffect(() => {
    setRender(false);
    const fetchColumnData = async () => {
      try {
        let autoAllocationBtnTag = false;
        let cols = await getRuleHeaderConfiguration(
          "inventorysmart_product_rules"
        )();
        cols = cols.map((item) => {
          if (item.column_name === "auto_allocation_status") {
            autoAllocationBtnTag = true;
          }
          item.onClick = (tableInfo) => {
            setPopUpColumnData(tableInfo?.cellData?.colDef || {});
            setPopUpRowData(tableInfo?.cellData?.data || {});
            openModal();
          };
          return item;
        });
        showAutoAllocationBtn(autoAllocationBtnTag);
        setUserTableColumns(cols);
        setRender(true);
      } catch (err) {
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    };
    fetchColumnData();
  }, [props.selectedRuleFilters]);

  const loadTableInstance = (params) => {
    setAgGridInstance(params);
  };

  const manualCallBack = async (manualBody, pageIndex = 0, params = []) => {
    props.setProductRuleTableLoader(true);
    let filter = props.selectedRuleFilters;

    if (pageIndex === 0 && props.isRedirectedFromDifferentPage) {
      let articleFilter = tableArticleFilter;
      articleFilter.values = [...props.selectedRulesArticles];

      filter = [...filter, articleFilter];
    }

    let body = {
      filters: [...filter],
      application_code: props.applicationObjectList[0]?.application_code || 0,
      meta: {
        ...manualBody,
        limit: { limit: 10, page: pageIndex + 1 },
      },
    };
    try {
      let response = await props.getProductRuleTableData(body);
      //agGridRowFormatter should be removed once it's handled from BE
      //to handle it from BE pass params.api.checkConfiguration in request body to the above api call
      if (response?.data?.length > 0) {
        let formattedData = agGridRowFormatter(
          response?.data,
          params?.api?.checkConfiguration,
          "article"
        );

        props.setProductRuleTableLoader(false);
        setMetaBody(manualBody);
        return {
          data: formattedData,
          // totalCount: response.total,
        }; // returning for server side pagination on ag grid
      } else {
        props.setProductRuleTableLoader(false);
        displaySnackMessages(NO_DATA_FOUND, "success");
        return {
          data: [],
          totalCount: 0,
        };
      }
    } catch (err) {
      props.setProductRuleTableLoader(false);
      displaySnackMessages(ERROR_MESSAGE, "error");
      return [];
    }
  };

  const openModal = () => {
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
  };

  useEffect(() => {
    if (!isEmpty(props.savePayloadForPopUp)) {
      agGridInstance?.api?.forEachNode((node) => {
        // TO DO : update for 3 type of columns
        if (props.savePayloadForPopUp?.selection_type === POP_UP_TYPE.dc) {
          if (node?.data?.ph_code === props.savePayloadForPopUp?.ph_code) {
            node.data.dc_mapped =
              props.savePayloadForPopUp.selected_values.length;
            node.data.default_dcs = props.savePayloadForPopUp.selected_values;
          }
        }
        if (
          props.savePayloadForPopUp?.selection_type ===
          POP_UP_TYPE.product_profile
        ) {
          if (node?.data?.ph_code === props.savePayloadForPopUp?.ph_code) {
            // display default value "-" if pp name is unselected
            node.data.product_profile_name =
              props.savePayloadForPopUp?.selectedRowData[0]?.name === undefined
                ? "-"
                : props.savePayloadForPopUp?.selectedRowData[0]?.name;
            node.data.default_product_profile =
              props.savePayloadForPopUp?.selected_values;
          }
        }

        if (props.savePayloadForPopUp?.selection_type === POP_UP_TYPE.store) {
          if (node.data.ph_code === props.savePayloadForPopUp.ph_code) {
            let totalStores = uniqBy(
              props.savePayloadForPopUp?.selectedRowData,
              function (e) {
                return e.store_code;
              }
            );
            let totalGroups =
              props.savePayloadForPopUp?.selected_values?.length;

            node.data.store_group_mapped_display =
              totalGroups + " / " + totalStores.length;

            node.data.default_store_groups =
              props.savePayloadForPopUp?.selected_values;
          }
        }
      });
      agGridInstance?.api?.redrawRows();
    }
  }, [props.savePayloadForPopUp]);

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };
  const setAllRequest = () => {
    let checkSelection =
      agGridInstance?.api?.getSelectedNodes()?.length > 0 ? true : false;
    if (checkSelection) {
      updateTriggeSetAll(true);
    } else {
      displaySnackMessages("Please select atleast one row", "error");
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
  const onBlur = async (params) => {
    try {
      let reqBody = {
        ph_code: [params.data?.ph_code],
        channel: params.data?.channel,
        auto_allocation_status: params.data?.auto_allocation_status,
      };
      await props.updateAutoAllocation(reqBody);
      displaySnackMessages("Saved successfully", "success");
    } catch (err) {
      params.node.setDataValue(
        "auto_allocation_status",
        !params.data?.auto_allocation_status
      );
      displaySnackMessages("unable to save the auto allocation", "error");
    }
  };
  return (
    <>
      <Loader
        loader={
          props.productRuleTableLoader || props.inventorySmartPermissionLoader
        }
        minHeight={"350px"}
      >
        {!props.inventorysmartScreenConfig?.disableSetAllForSkuRule && (
          <div className={classes.setAllBtn}>
            <Button
              onClick={setAllRequest}
              id="productRulePopCancelBtn"
              color="primary"
              variant="contained"
              disabled={
                !canTakeActionOnModules(
                  INVENTORY_SUBMODULES_NAMES.INVENTORY_PRODUCT_RULES,
                  "edit"
                )
              }
            >
              Set All
            </Button>
          </div>
        )}

        {render && (
          <AgGridComponent
            uniqueRowId={"article"}
            columns={userTableColumns}
            onRowSelected
            manualCallBack={(body, pageIndex, params) =>
              manualCallBack(body, pageIndex, params)
            }
            rowModelType="serverSide"
            serverSideStoreType="partial"
            cacheBlockSize={10}
            selectAllHeaderComponent={true}
            rowSelection="multiple"
            onBlur={(
              e,
              data,
              column,
              isChanged,
              value,
              initialValue,
              cellData
            ) => onBlur(cellData)}
            loadTableInstance={loadTableInstance} // to make use of available grid api's
          />
        )}
      </Loader>
      {triggeSetAll && (
        <SetAllTabs
          active={open}
          openModal={openModal}
          closeModal={() => {
            updateTriggeSetAll(false);
          }}
          filters={props.selectedRuleFilters}
          checkAll={
            agGridInstance.api.checkConfiguration.length > 1
              ? agGridInstance.api.checkConfiguration[
                  agGridInstance.api.checkConfiguration.length - 2
                ].checkAll
              : false
          }
          popUpColumnData={popUpColumnData}
          popUpROWData={popUpRowData}
          manualCallBack={manualCallBack}
          agGridInstance={agGridInstance}
          selectedRowData={agGridInstance.api.getSelectedNodes().map((row) => {
            return row.data;
          })}
          metaBody={metaBody}
          autoAllocationBtn={autoAllocationBtn}
          setProductRuleTableLoader={props.setProductRuleTableLoader}
          module={props.module}
        ></SetAllTabs>
      )}
      {open && (
        <ProductRulePopUp
          active={open}
          openModal={openModal}
          closeModal={closeModal}
          filters={props.selectedRuleFilters}
          popUpColumnData={popUpColumnData}
          popUpROWData={popUpRowData}
          manualCallBack={manualCallBack}
          agGridInstance={agGridInstance}
          setProductRuleTableLoader={props.setProductRuleTableLoader}
          module={props.module}
        />
      )}
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    productRuleTableLoader:
      store.inventorysmartReducer.productRuleService.productRuleTableLoader,
    selectedRuleFilters:
      store.inventorysmartReducer.productRuleService.selectedRuleFilters,
    savePayloadForPopUp:
      store.inventorysmartReducer.productRuleService.savePayloadForPopUp,
    selectedStoreGroupDataPopUp:
      store.inventorysmartReducer.productRuleService
        .selectedStoreGroupDataPopUp,
    applicationObjectList:
      store.inventorysmartReducer.productRuleService.applicationObjectList,
    selectedRulesArticles:
      store.inventorysmartReducer.productRuleService.selectedRulesArticles,
    inventorySmartPermissionLoader:
      store.inventorysmartReducer.inventorySmartCommonService
        ?.inventorySmartPermissionLoader,
    inventorysmartModulesPermission:
      store.inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartModulesPermission,
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
  };
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (snack) => dispatch(addSnack(snack)),

  selectedFilters: (body) => dispatch(setSelectedFilters(body)),
  setProductRuleTableLoader: (body) =>
    dispatch(setProductRuleTableLoader(body)),
  getProductRuleTableData: (body) => dispatch(getProductRuleTableData(body)),
  updateAutoAllocation: (body) => dispatch(updateAutoAllocation(body)),
  getModuleLevelAccess: (payload) => dispatch(getModuleLevelAccess(payload)),
  setInventorySmartPermissionLoader: (payload) =>
    dispatch(setInventorySmartPermissionLoader(payload)),
  setInventorySmartModulesPermissions: (payload) =>
    dispatch(setInventorySmartModulesPermissions(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(ProductRuleTable);
