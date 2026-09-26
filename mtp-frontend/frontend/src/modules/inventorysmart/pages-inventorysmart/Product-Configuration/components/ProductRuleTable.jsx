import { addSnack } from "core/actions/snackbarActions";
import { isEmpty, uniqBy } from "lodash";
import globalStyles from "core/Styles/globalStyles";
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
  materialRuleDownloadCheck,
  updateCrossCountryAllocation,
  autoAllocSchRuleDownloadCheck,
} from "modules/inventorysmart/services-inventorysmart/Product-Profile/product-rule-services";
import { useEffect, useState } from "react";
import makeStyles from "@mui/styles/makeStyles";
import { connect } from "react-redux";
import AgGridComponent from "core/Utils/agGrid";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import Loader from "core/Utils/Loader/loader";
import ProductRulePopUp from "./ProductRulePopUp";
import {
  setInventorySmartModulesPermissions,
  setInventorySmartPermissionLoader,
} from "modules/inventorysmart/services-inventorysmart/common/inventory-smart-common-services";
import SetAllTabs from "./setAllTab";
import { Button, FormControlLabel, Grid, Radio, RadioGroup, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";
import { INVENTORY_SUBMODULES_NAMES } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { isActionAllowedOnSubModule } from "../../inventorysmart-utility";
import { getSelectedRowsForInfiniteRowModel } from "core/Utils/agGrid/table-functions";
import DownloadButton from "../../StoreInventoryAlerts/components/Download";
import { getModuleLevelAccessUtility } from "core/actions/userAccessActions";
import { Button as IAButton } from "impact-ui";
import UploadHandler from "core/commonComponents/uploadHandler";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import {
  PRODUCT_STOREGROUP_MAPPING,
  PRODUCT_STOREGROUP_MAPPING_INSTRUCTIONS,
} from "core/pages/store-grouping/grouping-contants/stringConstants";
import { useRef } from "react";
import { productStoreGroupMappingFile } from "modules/inventorysmart/services-inventorysmart/Constraints/constraints-services";
import { ACTIVE_STORE_FILTER, AUTO_ALLOCATION_SCHEDULER, MATERIAL_RULE } from "../constants";
import { CREATE_STORE_ALLOCATION_RULES_MAPPING } from "modules/inventorysmart/constants-inventorysmart/routesConstants";
import { useNavigate } from "react-router-dom-v5-compat";
import { getObjectsAfterCheckAll } from "../../StoreInventoryAlerts/components/AlertsActionPopup";
import { getValueBetweenZeroToOne } from "core/Utils/functions/utils";

const useStyles = makeStyles((theme) => ({
  setAllBtn: {
    padding: "1rem",
    display: "flex",
    justifyContent: "flex-end",
    gap: "1.5rem",
  },
}));

const ProductRuleTable = (props) => {
  const [agGridInstance, setAgGridInstance] = useState({});
  const [userTableColumns, setUserTableColumns] = useState([]);
  const [render, setRender] = useState(true);
  const classes = useStyles();
  const globalClasses = globalStyles();

  // pop up states
  const [open, setOpen] = useState(false);
  const [triggeSetAll, updateTriggeSetAll] = useState(false);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState(MATERIAL_RULE);

  const [editedRows, setEditedRows] = useState([]);
  const [popUpColumnData, setPopUpColumnData] = useState([]);
  const [popUpRowData, setPopUpRowData] = useState([]);
  const [metaBody, setMetaBody] = useState([]);
  const [autoAllocationBtn, showAutoAllocationBtn] = useState(false);
  const [crossCountryAllocationBtn, showCrossCountryAllocationBtn] = useState(false);
  const [crossCountryAllocationOptions, setCrossCountryAllocationOptions] = useState([]);;

  const [payload, setPayload] = useState();
  const [schedulerPayload, setSchedulerPayload] = useState();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isdisabled, setisdisabled] = useState(false)

  const validationHandler = useRef();

  const navigate = useNavigate();

  const { inventorysmart_configuration: inventorysmartConfiguration } = props.inventorysmartScreenConfig || {};
  const { productRules: productRulesConfig } = inventorysmartConfiguration || {};
  const { addActiveFilter, checkDownloadCountForAASch } = productRulesConfig || {};

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
            let accessDataResponse = await getModuleLevelAccessUtility({
              app: APP_NAME,
              module: subModules,
            })();
            rolesBasedModulesPermission = Object.fromEntries(
              Object.entries(accessDataResponse).map(([module, actions]) => [
                module,
                Object.keys(actions),
              ])
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
          displaySnackMessages(ERROR_MESSAGE, "error");
        } finally {
          props.setInventorySmartPermissionLoader(false);
        }
      };
      fetchModulesAccess();
      return () => {
        props.resetProductProfile();
      };
    }
  }, [props.inventorysmartScreenConfig]);


  const openConfirmationPopUp = () => {
    let isCustomDownloadCheckRequired = true;
    let url = "/inventory-smart/reporting/generate_reports?report_type=product_rule";
    let customDownloadCheckAPI = props.materialRuleDownloadCheck;
    let requestBody = payload;
    let columns = userTableColumns;

    if (selectedOption === AUTO_ALLOCATION_SCHEDULER) {
      isCustomDownloadCheckRequired = false;
      url = "/inventory-smart/allocation-scheduler-rule/download/search";
      requestBody = schedulerPayload;
      columns = [];

      if (checkDownloadCountForAASch) {
        isCustomDownloadCheckRequired = true;
        url = "/inventory-smart/reporting/generate_reports?report_type=allocation_scheduler_rule";
        customDownloadCheckAPI = props.autoAllocSchRuleDownloadCheck;
        columns = userTableColumns;
      }
    }

    return (
      <Dialog open={isPopupOpen} onClose={() => setIsPopupOpen(false)}>
        <DialogTitle>Download </DialogTitle>
        <DialogContent>
          <RadioGroup
            value={selectedOption}
            onChange={(e) => setSelectedOption(e.target.value)}
          >
            <FormControlLabel
              value={MATERIAL_RULE}
              control={<Radio />}
              label={MATERIAL_RULE}
            />
            {!props.inventorysmartScreenConfig?.inventorysmart_configuration?.drillDown?.hiddenTabs.includes(
              "auto allocation rules"
            ) && <FormControlLabel
                value={AUTO_ALLOCATION_SCHEDULER}
                control={<Radio />}
                label={AUTO_ALLOCATION_SCHEDULER}
              />}
          </RadioGroup>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsPopupOpen(false)} color="primary">
            Cancel
          </Button>
          <Button
            onClick={() => {
              setIsPopupOpen(false);
            }}
            color="primary"
          >
            <DownloadButton
              url={url}
              isCustomDownloadCheckRequired={isCustomDownloadCheckRequired}
              customDownloadCheckAPI={customDownloadCheckAPI}
              disable={isdisabled}
              requestBody={requestBody}
              excludeURLObject={null}
              includeExclusionFilter={true}
              columns={columns}
            />
          </Button>
          {/* <Button onClick={handleDownload} color="primary">
            Download
          </Button> */}
        </DialogActions>
      </Dialog>
    );
  };
  //fetch column header of grid
  useEffect(() => {
    setRender(false);
    const fetchColumnData = async () => {
      try {
        let autoAllocationBtnTag = false;
        let crossCountryTag = false;
        let cols = await getRuleHeaderConfiguration(
          "inventorysmart_product_rules"
        )();
        cols = cols.map((item) => {
          if (item.column_name === "auto_allocation_status") {
            autoAllocationBtnTag = true;
          }
          if (item.column_name === "cross_country_allocation") {
            crossCountryTag = props.inventorysmartScreenConfig?.isCrossCountryAllowed;
            setCrossCountryAllocationOptions(item.extra.options);
          }
          item.onClick = (tableInfo) => {
            setPopUpColumnData(tableInfo?.cellData?.colDef || {});
            setPopUpRowData(tableInfo?.cellData?.data || {});
            openModal();
          };
          return item;
        });
        showAutoAllocationBtn(autoAllocationBtnTag);
        showCrossCountryAllocationBtn(crossCountryTag);
        setUserTableColumns(cols);
        setRender(true);
      } catch (err) {
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    };
    fetchColumnData();
    let excludedFilterValues = JSON.parse(
      localStorage.getItem("filter_attribute_exclusion_values")
    );
  }, [props.selectedRuleFilters]);

  const loadTableInstance = (params) => {
    setAgGridInstance(params);
  };

  const onSaveHandler = async () => {
    try {
      let reqBody = editedRows.map((item) => {
        return {
          ph_code: item?.ph_code,
          channel: item?.channel,
          cross_country_allocation: item?.cross_country_allocation,
          approval_type: item?.approval_type,
          threshold: item?.threshold,
          ...item
        }
      });
      await props.updateCrossCountryAllocation(reqBody);
      setEditedRows([])
      agGridInstance.api?.refreshServerSideStore({ purge: true });
      displaySnackMessages("Saved successfully", "success");
    } catch (err) {
      displaySnackMessages("Unable to save CrossCountry allocation", "err")
    }

  }
  const manualCallBack = async (manualBody, pageIndex = 0, params = []) => {
    props.setProductRuleTableLoader(true);
    let filter = props.selectedRuleFilters;

    if (props.isRedirectedFromDifferentPage) {
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
      filtered_selection: !isEmpty(props.filteredSelection)
        ? props.filteredSelection
        : [],
      popupLink: props.popUpLinkFromDashbaord,
    };

    if (addActiveFilter) {
      body.filters = [...body.filters, ACTIVE_STORE_FILTER]
    }

    let excludedFilterValues = JSON.parse(
      localStorage.getItem("filter_attribute_exclusion_values")
    );
    setPayload({
      filters: [...props.selectedRuleFilters, ...excludedFilterValues],
      meta: {
        ...manualBody,
        limit: {
          limit: 10,
          page: 1,
        },
      },
      application_code: 1,
    });
    setSchedulerPayload({
      filters: [...props.selectedRuleFilters, ...excludedFilterValues],
      meta: {
        ...manualBody,
        limit: {
          limit: 10,
          page: 1,
        },
        search: []
      },
      application_code: 1,
    });
    try {
      let response = await props.getProductRuleTableData(body);
      //agGridRowFormatter should be removed once it's handled from BE
      //to handle it from BE pass params.api.checkConfiguration in request body to the above api call
      if (pageIndex == 0 && !response?.data?.length) {
        setisdisabled(true)
        props.setProductRuleTableLoader(false);
        displaySnackMessages(NO_DATA_FOUND, "success");
        return {
          data: [],
          totalCount: 0,
        };
      } else {
        setisdisabled(false)
        let formattedData = response.data;
        formattedData = agGridRowFormatter(
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

  const onCellValueChanged = (params) => {
    setEditedRows((editedRows) => {
      const { ph_code, channel, l0_name } = params.data; // Row identifiers
      const columnName = params.colDef.field; // The updated column name
      let newValue = params.newValue; // The updated value

      // Find if the row already exists in the editedRows
      const existingRowIndex = editedRows.findIndex(
        (item) => item.ph_code === ph_code && item.channel === channel && item.l0_name === l0_name
      );

      let updatedRows;
      if (columnName === "threshold") {
        newValue = getValueBetweenZeroToOne(newValue);
      }
      if (existingRowIndex !== -1) {
        // Row exists, update the specific column
        updatedRows = editedRows.map((row, index) => {
          if (index === existingRowIndex) {
            return { ...row, [columnName]: newValue }; // Update only the changed field
          }
          return row;
        });
      } else {
        // Row doesn't exist, create a new entry with the updated column
        const newRow = { ph_code, channel, l0_name, [columnName]: newValue };
        updatedRows = [...editedRows, newRow];
      }

      return updatedRows;
    });
  };

  const onBlur = async (params) => {
    try {
      // Call the below API for the cross country allocation column change
      if (params.colDef.accessor === "auto_allocation_status") {
        let reqBody = {
          ph_code: [params.data?.ph_code],
          channel: params.data?.channel,
          auto_allocation_status: params.data?.auto_allocation_status,
        };
        await props.updateAutoAllocation(reqBody);
        displaySnackMessages("Saved successfully", "success");

      }
      if (params.colDef.accessor === "threshold") {
        let newValue = params.data?.threshold;
        newValue = getValueBetweenZeroToOne(newValue);
        params.node.setDataValue(
          "threshold",
          newValue
        );
      }

    } catch (err) {
      params.node.setDataValue(
        "auto_allocation_status",
        !params.data?.auto_allocation_status
      );
      displaySnackMessages("unable to save the auto allocation", "error");
    }
  };

  const attachCallBacks = (callback) => {
    validationHandler.current = { validate: callback };
  };
  const handleUpload = async (file) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await props.productStoreGroupMappingFile(formData);
      props.addSnack({
        message:
          res.message || "Please wait for notification to be received shortly",
        options: {
          variant: "success",
        },
      });
      setIsModalOpen(false);
    } catch (error) {
      if (error.response?.data?.data?.length) {
        validationHandler.current.validate(error.response?.data?.data);
      } else {
        props.addSnack({
          message: error?.data?.message || "Something went wrong.",
          options: {
            variant: "error",
          },
        });
        validationHandler.current.validate([]);
      }
    }
  };

  const setFilterPayload = () => {
    let selected_phcodes = {
      attribute_name: "ph_code",
      dimension: "product",
      filter_type: "cascaded",
      operator: "in",
      system_filter: true,
      values: agGridInstance.api
        .getSelectedNodes()
        .map((row) => {
          return row.data;
        })
        .map((item) => item.ph_code),
    };
    let l_userActions = getObjectsAfterCheckAll(
      agGridInstance?.api?.checkConfiguration
    );
    let filterPayload = [];
    if (isEmpty(l_userActions)) {
      filterPayload = [...props.selectedRuleFilters, selected_phcodes];
    } else {
      let l_userActionClubbed = l_userActions.reduce(
        (result, obj) => Object.assign(result, obj),
        {}
      );
      if (l_userActionClubbed?.unCheckedRows) {
        let unselected_phcodes = {
          attribute_name: "ph_code",
          dimension: "product",
          filter_type: "cascaded",
          operator: "not in",
          system_filter: true,
          values: l_userActionClubbed?.unCheckedRows.map((item) =>
            Number(item)
          ),
        };

        filterPayload = [...props.selectedRuleFilters, unselected_phcodes];
      } else {
        filterPayload = [...props.selectedRuleFilters];
      }
    }
    return filterPayload;
  };

  const handleStoreSchedulerRequest = () => {
    let checkSelection =
      agGridInstance?.api?.getSelectedNodes()?.length > 0 ? true : false;
    if (checkSelection) {
      // Redirecting to the store mapping screen with the selected article data.
      navigate(CREATE_STORE_ALLOCATION_RULES_MAPPING, {
        state: {
          meta: payload.meta,
          rowData: agGridInstance?.api
            ?.getSelectedNodes()
            .map((item) => item.data),
          filters: setFilterPayload(),
        },
      });
    } else {
      displaySnackMessages("Please select at-least one row", "error");
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
        <div
          className="d-md-flex"
          style={{ justifyContent: "end", alignItems: "center" }}
        >
          {(props.inventorysmartScreenConfig?.client === '_NA' || props.inventorysmartScreenConfig?.client === '_EU') && (
            <Button
              onClick={() => setIsPopupOpen(true)}
              color="primary"
              variant="contained"
            >
              Download
            </Button>

          )}

          {!props.inventorysmartScreenConfig?.disableSetAllForSkuRule && (
            <div className={classes.setAllBtn}>
              {!props.inventorysmartScreenConfig?.inventorysmart_configuration?.drillDown?.hiddenTabs.includes(
                "auto allocation rules"
              ) && (
                  <Button
                    onClick={handleStoreSchedulerRequest}
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
                    Set Store Scheduler
                  </Button>
                )}
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
              {props.inventorysmartScreenConfig?.product_store_group_upload && (
                <>
                  <IAButton
                    variant="primary"
                    id="uploadConstraints"
                    onClick={() => setIsModalOpen(true)}
                    icon={FileUploadIcon}
                  />
                  <UploadHandler
                    handleUpload={handleUpload}
                    isModalOpen={isModalOpen}
                    setIsModalOpen={setIsModalOpen}
                    attachCallBacks={attachCallBacks}
                    jsonUpload={false}
                    macroIdPath={"product_store_group_vba_template"}
                    templateConfig={[...PRODUCT_STOREGROUP_MAPPING]}
                    uploadInstructions={[
                      ...PRODUCT_STOREGROUP_MAPPING_INSTRUCTIONS,
                    ]}
                    tenantUploadConfig={{}}
                    templateName={"ProductStoreGroupTemplate"}
                  />
                </>
              )}
            </div>
          )}
        </div>

        {render && (
          <AgGridComponent
            uniqueRowId={"ph_code"}
            columns={userTableColumns}
            onRowSelected
            manualCallBack={(body, pageIndex, params) =>
              manualCallBack(body, pageIndex, params)
            }
            rowModelType="serverSide"
            serverSideStoreType="partial"
            cacheBlockSize={10}
            onCellValueChanged={onCellValueChanged}
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
        {(props.inventorysmartScreenConfig?.client === "_NA" || props.inventorysmartScreenConfig?.client === "_EU") &&
          <div className={`${globalClasses.centerAlign} ${globalClasses.marginVertical1rem}`}>
            <Button
              onClick={onSaveHandler}
              color="primary"
              variant="contained"
              disabled={!editedRows.length}
            >
              Save
            </Button>
          </div>}
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
          selectedRowData={getSelectedRowsForInfiniteRowModel(
            agGridInstance,
            false
          )}
          updateTriggeSetAll={updateTriggeSetAll}
          metaBody={metaBody}
          autoAllocationBtn={autoAllocationBtn}
          crossCountryAllocationBtn={crossCountryAllocationBtn}
          crossCountryAllocationOptions={crossCountryAllocationOptions}
          setProductRuleTableLoader={props.setProductRuleTableLoader}
          module={props.module}
        ></SetAllTabs>
      )}
      {isPopupOpen && openConfirmationPopUp()}
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
    popUpLinkFromDashbaord:
      store.inventorysmartReducer.productRuleService.popUpLinkFromDashbaord,
    filteredSelection:
      store.inventorysmartReducer.productRuleService.filteredSelection,
    excelDownload:
      store.inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.inventorysmart_configuration
        ?.excelDownload,
  };
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (snack) => dispatch(addSnack(snack)),

  selectedFilters: (body) => dispatch(setSelectedFilters(body)),
  setProductRuleTableLoader: (body) =>
    dispatch(setProductRuleTableLoader(body)),
  getProductRuleTableData: (body) => dispatch(getProductRuleTableData(body)),
  updateAutoAllocation: (body) => dispatch(updateAutoAllocation(body)),
  setInventorySmartPermissionLoader: (payload) =>
    dispatch(setInventorySmartPermissionLoader(payload)),
  setInventorySmartModulesPermissions: (payload) =>
    dispatch(setInventorySmartModulesPermissions(payload)),
  productStoreGroupMappingFile: (payload) =>
    dispatch(productStoreGroupMappingFile(payload)),
  materialRuleDownloadCheck: (payload) => dispatch(materialRuleDownloadCheck(payload)),
  autoAllocSchRuleDownloadCheck: (payload) => dispatch(autoAllocSchRuleDownloadCheck(payload)),
  updateCrossCountryAllocation: (body) => dispatch(updateCrossCountryAllocation(body)),
});

export default connect(mapStateToProps, mapDispatchToProps)(ProductRuleTable);
