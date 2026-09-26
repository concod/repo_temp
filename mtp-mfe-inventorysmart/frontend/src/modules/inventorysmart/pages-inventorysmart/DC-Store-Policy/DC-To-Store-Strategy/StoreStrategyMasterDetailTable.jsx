import PropTypes from "prop-types";
import React, { useCallback, useEffect, useRef, useState } from "react";
import AgGridComponent from "core/Utils/agGrid";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { connect } from "react-redux";
import moment from "moment";
import Loader from "core/Utils/Loader/loader";
import DeleteIcon from "@mui/icons-material/Delete";
import { makeStyles } from "@mui/styles";
import {
  getStoreDcPolicyRulesList,
  setDcStorePolicyData,
  setDcStorePolicyDataLoader,
  saveRuleName,
  setSavedEditedRules,
  deleteRulesDc,
  saveNetworkRuleName,
  deleteNetworkRulesDc,
} from "modules/inventorysmart/services-inventorysmart/DC-Store-Policy/dc-store-strategy";
import {
  setConfigureData,
  setBulkConfigureData,
} from "modules/inventorysmart/services-inventorysmart/Configuration/inventory-smart-configuration-services";
import { cloneDeep, isEmpty, isNull, isUndefined } from "lodash";
import { displaySnackMessages } from "../../inventorysmart-utility";
import {
  ERROR_MESSAGE,
  INVENTORY_SUBMODULES_NAMES,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { CONFIGURE } from "modules/inventorysmart/constants-inventorysmart/routesConstants";
import { Grid } from "@mui/material";
import { Button } from "impact-ui-v3";
import { addSnack } from "core/actions/snackbarActions";
import CellRenderers from "core/Utils/agGrid/cellRenderer";
import { isActionAllowedOnSubModule } from "../../inventorysmart-utility";
import SetAllModalComponent from "./Set-All-Modal-Component";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import { getStoreDcPolicyNetworkRulesList } from "modules/inventorysmart/services-inventorysmart/DC-Store-Network/dc-store-network";
import { getDropDownOptions } from "modules/inventorysmart/services-inventorysmart/Network-Route/network-route";
import StoreDetailPanel from "./StoreDetailPanel";
import { getDefaultRows } from "./utils";


const useStyles = makeStyles({
  customTableOverride: {
    '& .ia-basic-table-layout.table-v32 .ag-pinned-left-cols-container': {
      zIndex: '0 !important'
    },
    '& .ia-basic-table-layout.table-v32 .ag-pinned-right-cols-container': {
      zIndex: '0 !important'
    },
  },
  detailPanel: {
    padding: '16px 24px',
    maxHeight: '400px',
    overflowY: 'auto',
    backgroundColor:'#ffff'
  },
  detailPanelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  detailPanelLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  gridContainer: {
    marginBottom: '24px',
  },
  headerLabel: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#0D152C',
  },
  divider: {
    width: '1px',
    height: '16px',
    backgroundColor: '#D9DDE7',
  },
  panelLabel: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#60697D',
  },
  sourceBadge: {
    padding: "2px 8px",
    borderRadius: "1000px",
    fontSize: "14px",
    fontWeight: 500,
    lineHeight: "20px",
    display: "inline-block",
  },
  dcBadge: {
    backgroundColor: "#F6F6F3",
    color: "#8C906A",
  },
  poBadge: {
    backgroundColor: "#E9F7FC",
    color: "#1789A5",
  },
  dc_poBadge: {
    backgroundColor: "#F4F1F9",
    color: "#7552AD",
  },
});

export const handleErrorMessage = (e, props) => {
  const errObj = e?.response?.data;
  if (errObj?.show_message)
    displaySnackMessages(errObj?.message, "error", props);
  else displaySnackMessages(ERROR_MESSAGE, "error", props);
};

const StoreStrategyMasterDetailTable = (props) => {
  const classes = useStyles();

  const sortStoreDetailsByStartDate = (storeDetails) => {
    if (!storeDetails || storeDetails.length === 0) return storeDetails;
    return [...storeDetails].sort((a, b) => {
      if (!a.start_date) return 1;
      if (!b.start_date) return -1;
      return moment(a.start_date).diff(moment(b.start_date));
    });
  };

  const canTakeActionOnModules = (subModuleName, action) => {
    return isActionAllowedOnSubModule(
      props.inventorysmartModulesPermission,
      props?.module,
      subModuleName,
      action
    );
  };

  const hasEditAccess = () => {
    return canTakeActionOnModules(
      INVENTORY_SUBMODULES_NAMES.INVENTORY_DC_STORE_POLICY_STRATEGY,
      "edit"
    );
  };

  const [dcStorePolicyColumns, setDcPolicyColumns] = useState([]);

  const childColumnDefsRef = useRef([]);
  const filterDependencies = useRef({});
  const agGridInstance = useRef(null);
  const [selectedRules, setSelectedRules] = useState([]);
  const [deSelectedRules, setDeselectedRules] = useState([]);
  const [networkOption, setNetworkOption] = useState([]);
  const [isSetAllModalVisible, setAllModalVisibility] = useState(false);
  const [rulesListPayload, setRulesListPayload] = useState({});
  const isManageRclFlow = props?.isManageRclFlow;

  // Generic function to handle configure click
  const handleConfigureClick = (params, columns) => {
    props.setConfigureData({
      ruleCode: params.data.c_rule_code,
      columns: columns,
      parentData: params.data,
    });

    if (!isManageRclFlow) {
      props.history.push(CONFIGURE, {
        fromPage: 'DC Store Policy Strategy',
        ruleCode: params.data.c_rule_code,
        mode: "default"
      });
    } else {
      props?.setShowConfigure(true);
      props?.setRuleCode(params.data.c_rule_code);
    }
  };

  const pageSize =
    props?.inventorysmartScreenConfig?.inventorysmart_page_count || 10;

  // ─── Column setup ───────────────────────────────────────────────────────────
  useEffect(() => {
    const getColumns = async () => {
      let tableName = props.redirectedFromNetworkTab
        ? "rcl_supply_network"
        : "rcl_dc_store_policy";

      // Fetch parent and child column defs in parallel
      const [dcStoresColDefRaw, childColDefRaw] = await Promise.all([
        getColumnsAg(`table_name=${tableName}`)(),
        getColumnsAg(`table_name=rcl_dc_store_policy_set_all`)(),
      ]);
      let dcStoresColDef = dcStoresColDefRaw

      let requestBodyForAllNetwork = {
        table_name: "supply_network",
        column_names: ["network_id", "network_name"],
      };
      let networkOptions = [];
      if (props.redirectedFromNetworkTab) {
        const data = await props.getDropDownOptions(requestBodyForAllNetwork);
        networkOptions = data.data.data.map((item) => ({
          label: item.network_name,
          value: item.network_id,
        }));
      }

      dcStoresColDef = dcStoresColDef.map((item) => {
        // agGroupCellRenderer on c_rule_code renders the expand/collapse chevron
        // in master-detail mode (same renderer, different grid mode behaviour).
        if (item.column_name === "c_rule_code") {
          item.cellRenderer = "agGroupCellRenderer";
          delete item.rowGroup;
        }

        if (item.column_name === "supply_network_name") {
          item.type = "list";
          item.options = networkOptions;
          // In the parent table this column is not relevant — hide it;
          // it will be shown in the child (StoreDetailPanel) grid instead.
          item.hide = true;
        }
        if (item?.column_name === "source") {
          item.cellRenderer = (cellProps) => {
            const source = cellProps?.value;
            return (
              <span
                className={`${classes.sourceBadge} ${
                  source === "po"
                    ? classes.poBadge
                    : source === "dc"
                    ? classes.dcBadge
                    : classes.dc_poBadge
                }`}
              >
                {source === "po" ? "PO Only" : source === "dc" ? "DC Only" : "DC + PO"}
              </span>
            );
          };
        }

        if (item?.column_name === "rule_name") {
          item.cellClass = `cell-renderer ${item?.cellClass}`;
          item.is_editable = true;
          item.disabled = !hasEditAccess();
          item.cellRenderer = (cellProps, extraProps) => {
            if (cellProps?.node?.data?.is_default) {
              return <div>{cellProps?.value}</div>;
            }
            return (
              <CellRenderers
                cellData={cellProps}
                column={item}
                extraProps={extraProps}
              />
            );
          };
        }

        // Link-type columns (store/group mapped, profile, rules, scheduler)
        // are child-only data — hide them from the parent table.
        if (item.type === "link") {
          item.hide = true;
        }

        // Date columns are child-only — hide from the parent table.
        if (
          item.column_name === "start_date" ||
          item.column_name === "end_date"
        ) {
          item.hide = true;
        }

        return item;
      });
      
      const childColumns = childColDefRaw.map((col) => {
        const childCol = { ...col };
        delete childCol.cellRenderer;
        delete childCol.onClick;
        childCol.hide = false;
        return childCol;
      });

      // Add a static "Configure >" button column on the right of each parent row.
      dcStoresColDef.push({
        headerName: "",
        colId: "configure_action",
        disableSortBy: true,
        isFixed: true,
        minWidth: 150,
        width: 150,
        pinned: "right",
        cellRenderer: (params) => (
          (isManageRclFlow || params?.rowIndex > 0) && <Button
            variant="tertiary"
            size="large"
            onClick={() => handleConfigureClick(params, childColumns)}
          >
            Configure &gt;
          </Button>
        ),
        suppressMenu: true,
      });

      setNetworkOption(networkOptions);
      setDcPolicyColumns(dcStoresColDef);
      childColumnDefsRef.current = childColumns;
    };

    getColumns();
    props?.setSavedEditedRules([]);
  }, []);

  // ─── Re-fetch when filters change ───────────────────────────────────────────
  useEffect(() => {
    if (!isEmpty(props.selectedDependencyValue)) {
      filterDependencies.current = props.selectedDependencyValue;
      agGridInstance.current?.api?.refreshServerSideStore({ purge: true });
      setDeselectedRules([]);
    } else {
      filterDependencies.current = {};
    }
  }, [props.selectedDependencyValue]);

  // ─── Data fetching ───────────────────────────────────────────────────────────
  const manualCallFetchRulesList = async (manualbody, pageIndex, params) => {
    const is_po_strategy_flow =
      JSON.parse(sessionStorage.getItem("is_po_strategy_flow")) || false;
    props.setDcStorePolicyDataLoader(true);
    setDeselectedRules([]);

    let body = {
      meta: {
        ...manualbody,
        limit: { limit: pageSize, page: isNull(pageIndex) ? 1 : pageIndex + 1 },
      },
      filters: isEmpty(filterDependencies.current)
        ? []
        : filterDependencies?.current?.filters,
      is_po_strategy_flow,
    };
    setRulesListPayload(body);

    try {
      let response = props.redirectedFromNetworkTab
        ? await getStoreDcPolicyNetworkRulesList(body)
        : await getStoreDcPolicyRulesList(body);

      if (response?.data?.show_message) {
        displaySnackMessages(response?.data?.message, "success", props);
      }

      let formattedResponse = [];
      response?.data?.data &&
        response.data.data.forEach((thisData) => {
          let storeDetailsWithId = thisData.store_details.map(
            (thisDetails, id) => {
              thisDetails.supply_network_name = `${thisDetails.supply_network_id}`;
              return { ...thisDetails, id };
            }
          );
          let sortedStoreDetails = sortStoreDetailsByStartDate(storeDetailsWithId);
          let thisObj = {
            ...thisData,
            ...thisData.rcl_dimension,
            store_details: sortedStoreDetails,
          };
          delete thisObj["rcl_dimension"];
          formattedResponse.push(thisObj);
        });

      let formattedData;
      if (pageIndex) {
        formattedData = agGridRowFormatter(
          formattedResponse,
          params?.api?.checkConfiguration,
          "c_rule_code"
        );
      } else {
        params.api.setCheckConfiguration([]);
        formattedData = formattedResponse;
      }

      props.setDcStorePolicyData(cloneDeep(formattedData));
      props.setDcStorePolicyDataLoader(false);

      if (!response.data?.data?.length) {
        return { data: [], totalCount: 0 };
      }
      props.downloadButtonStateChange(false);
      return { data: formattedData, totalCount: response?.data?.total };
    } catch (e) {
      props.setDcStorePolicyDataLoader(false);
      handleErrorMessage(e, props);
      return { data: 0, totalCount: 0 };
    }
  };

  // ─── Rule name inline save (blur on rule_name cell) ─────────────────────────
  const onBlurHandler = async (
    e,
    data,
    column,
    isChanged
  ) => {
    if (column?.colId === "rule_name" && isChanged) {
      const { rule_name, c_rule_code } = data;
      try {
        let reqBody = {
          rule_name: rule_name || "",
          rule_code: c_rule_code,
        };
        const response = props.history?.location?.state?.redirectedFromNetworkTab
          ? await props.saveNetworkRuleName(reqBody)
          : await props.saveRuleName(reqBody);
        if (response?.status && response?.message) {
          displaySnackMessages(response?.message, "success", props);
          agGridInstance.current.api.refreshServerSideStore({ purge: true });
        }
      } catch (e) {
        handleErrorMessage(e, props);
      }
    }
  };

  // ─── Delete selected rules ───────────────────────────────────────────────────
  const onDeleteRule = async () => {
    let defaultRuleSelected = false;
    agGridInstance.current.api.getSelectedRows().forEach((row) => {
      if (row.is_default) defaultRuleSelected = true;
    });
    if (defaultRuleSelected) {
      displaySnackMessages("Default Rules cannot be deleted", "info", props);
      return;
    }
    props.setDcStorePolicyDataLoader(true);
    const row_delete = selectedRules.map((thisRule) => ({
      rule_code: thisRule.c_rule_code,
    }));
    const deletePayload = {
      meta: {
        search: [],
        sort: [],
        range: [],
        limit: { limit: 10, page: 1 },
      },
      filters: isEmpty(filterDependencies.current)
        ? []
        : filterDependencies?.current?.filters,
      row_delete,
    };
    try {
      let response = null;
      if (props.redirectedFromNetworkTab) {
        const payload = { rule_codes: row_delete.map((item) => item.rule_code) };
        response = await props?.deleteNetworkRulesDc(payload);
      } else {
        response = await props?.deleteRulesDc(deletePayload);
      }
      if (response?.message) {
        displaySnackMessages(response?.message, "success", props);
        agGridInstance.current?.api?.refreshServerSideStore({ purge: true });
        props.setDcStorePolicyDataLoader(false);
      }
    } catch (e) {
      props.setDcStorePolicyDataLoader(false);
      handleErrorMessage(e, props);
    }
  };

  // ─── Selection tracking ──────────────────────────────────────────────────────
  const onSelectionChanged = () => {
    let selectedRows = [];
    agGridInstance?.current?.api?.forEachNode((node) => {
      if (node?.level === 0 && node.selected) {
        selectedRows.push({ ...node.data });
      }
    });
    setSelectedRules(selectedRows);

    const deSelections = agGridInstance?.current?.api
      ?.getRenderedNodes()
      ?.filter((node) => !node.selected && node.data?.c_rule_code)
      ?.map((rowNode) => ({ rule_code: rowNode.data.c_rule_code }));
    setDeselectedRules(deSelections);
  };

  // ─── Toolbar buttons ─────────────────────────────────────────────────────────
  const getTopRightOptions = () => {
    let options = [];
    if (selectedRules?.length > 0) {
      options.push(
        <Button
          key="set-all"
          id="set-all-exception"
          variant="primary"
          size="large"
          onClick={() => {
            let defaultRuleSelected = false;
            let selectedRows = agGridInstance.current.api.getSelectedRows();
            selectedRows.map((row) => {
              if (row.is_default) {
                defaultRuleSelected = true;
              }
            });
            if (defaultRuleSelected) {
              displaySnackMessages(
                "One or more selected rules cannot be edited as they are system defaults. Please change the selection",
                "info",
                props
              );
            } else {
              // Navigate to Set All Configure page instead of opening modal
              const defaultRowConfig = props.inventorysmartScreenConfig?.inventorysmart_configuration?.defaultSetAllRow || {};
              props.setBulkConfigureData({
                columns: childColumnDefsRef.current,
                parentData: {
                  store_details: [getDefaultRows(0, defaultRowConfig)],
                  c_rule_code: selectedRows?.map((e) => e?.c_rule_code),
                  source:"dc_po",
                  po_same_as_dc:true
                },
              });

              if (!isManageRclFlow) {
                props.history.push(CONFIGURE, {
                  fromPage: 'DC Store Policy Strategy',
                  selectedRules: selectedRules,
                  mode: "set_all"
                });
              }
              else {
                props?.setShowConfigure(true)
                props?.setIsSetAll(true)
              }
            }
          }}
          disabled={
            !hasEditAccess() ||
            isUndefined(selectedRules) ||
            selectedRules.length === 0
          }
        >
          Set All
        </Button>
      );
      if (!isManageRclFlow) {
        options.push(
          <Button
            key="delete"
            variant="tertiary"
            id="delete-rules"
            size="large"
            onClick={onDeleteRule}
            title="Delete Rules"
            disabled={
              !hasEditAccess() ||
              isUndefined(selectedRules) ||
              selectedRules.length === 0
            }
          >
            <DeleteIcon />
          </Button>
        );
      }
    }
    return options;
  };

  // ─── Master-Detail: isRowMaster ──────────────────────────────────────────────
  const isRowMaster = useCallback(
    (data) => Array.isArray(data?.store_details) && data.store_details.length > 0,
    []
  );

  // ─── Master-Detail: detail cell renderer ────────────────────────────────────
  const DetailCellRenderer = useCallback(
    (params) => {
      const source = params?.data?.source;
      const cols = childColumnDefsRef.current;

      // Configuration array for StoreDetailPanel rendering
      const panelConfigs = source === 'dc_po' && !params?.data?.po_same_as_dc
        ? [
            { key: "dc-panel", filter: "dc", source: "dc" },
            { key: "po-panel", filter: "po", source: "po" }
          ]
        : source === "po"
        ? [{ key: "po-pannel", filter: "po", source }]
        : [{ key: "dc-pannel", filter: "dc", source }];

      return (
        <div className={classes.detailPanel}>
          <div className={classes.detailPanelHeader}>
            <div className={classes.detailPanelLeft}>
              <span className={classes.headerLabel}>Details</span>
              <div className={classes.divider} />
              <span className={classes.panelLabel}>
                Source: <span className={`${classes.sourceBadge} ${source === "po" ? classes.poBadge : source === "dc" ? classes.dcBadge : classes.dc_poBadge}`}>
                  {source === "po" ? "PO Only" : source === "dc" ? "DC Only" : "DC + PO"}
                </span>
              </span>
            </div>
            <Button
              key="configure"
              variant="primary"
              size="large"
              onClick={() => handleConfigureClick(params, cols)}
            >
              Configure
            </Button>
          </div>
          {panelConfigs.map(({ key, filter, source: sourceProp }) => (
            <div key={key} className={classes.gridContainer}>
              <StoreDetailPanel
                {...params}
                columns={cols}
                source={sourceProp}
                data={params.data.store_details?.filter(data => data?.source === filter) || []}
                isManageRclFlow={isManageRclFlow}
                addSnack={props.addSnack}
                onConfigureClick={() => handleConfigureClick(params, cols)}
                hideTableHeader={!(source === "dc_po" && !params?.data?.po_same_as_dc)}
              />
            </div>
          ))}
        </div>
      );
    },
    [] 
  );

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <Grid>
      <SetAllModalComponent
        resetSelectedRules={setSelectedRules}
        isSetAllModalVisible={isSetAllModalVisible}
        setAllModalVisibility={setAllModalVisibility}
        filterDependencies={filterDependencies}
        filtersWithSearch={rulesListPayload}
        selectedRules={selectedRules}
        redirectedFromNetworkTab={props.redirectedFromNetworkTab}
        networkOptions={networkOption}
        agGridInstance={agGridInstance}
        isManageRclFlow={false}
        selectedDependencyValue={props?.selectedDependencyValue}
        history={props?.history}
        deSelectedRules={deSelectedRules}
        setDeselectedRows={setDeselectedRules}
        excludeDeselections
      />
      {!isManageRclFlow && dcStorePolicyColumns?.length > 0 && (
        <Loader loader={props.dcStorePolicyTableDataLoader} minHeight="350px">
          <div className={classes.customTableOverride}>
            <AgGridComponent
              topRightOptions={getTopRightOptions()}
              hideSelectAllRecords={false}
              rowModelType="serverSide"
              serverSideStoreType="partial"
              selectAllHeaderComponent={hasEditAccess()}
              cacheBlockSize={pageSize}
              loadTableInstance={(params) => {
                agGridInstance.current = params;
              }}
              manualCallBack={(body, pageIndex, params) =>
                manualCallFetchRulesList(body, pageIndex, params)
              }
              columns={dcStorePolicyColumns}
              skipAutoSizeColumn={false}
              onGridChanged
              onRowSelected
              uniqueRowId="c_rule_code"
              suppressClickEdit={false}
              onBlur={onBlurHandler}
              onSelectionChanged={onSelectionChanged}
              paginationPageSize={pageSize}
              wrapCellText
              autoCellHeight
              wrapHeaderText
              autoHeaderHeight
              // ── master-detail props ──
              childKey={"store_details"}
              masterDetail
              isRowMaster={isRowMaster}
              detailCellRenderer={DetailCellRenderer}
              detailRowAutoHeight
              keepDetailRows
              showDownloadButton={
                props.showDownload && !props?.downloadDisabled
              }
              onDownloadButtonClick={props?.downloadDcStoreStrategy}
              disablePaginationForSinglePage
            />
          </div>
        </Loader>
      )}
      {isManageRclFlow && props.rclRulesTableName && dcStorePolicyColumns.length > 0 && (
        <Loader loader={props.dcStorePolicyTableDataLoader} minHeight={"350px"}>
          <div className={classes.customTableOverride}>
            <AgGridComponent
              topRightOptions={getTopRightOptions()}
              loadTableInstance={(params) => {
                agGridInstance.current = params;
              }}
              hideSelectAllRecords={false}
              manualCallBack={props.fetchTableDataRCLTable}
              rowModelType="serverSide"
              serverSideStoreType="partial"
              uniqueRowId={"c_rule_code"}
              columns={dcStorePolicyColumns}
              selectAllHeaderComponent={hasEditAccess()}
              // onCellValueChanged={(params) => {
              //   onCellValueChanged(params);
              // }}
              cacheBlockSize={pageSize}
              masterDetail
              detailCellRenderer={DetailCellRenderer}
              skipAutoSizeColumn={false}
              childKey={"store_details"}
              purgeClosedRowNodes={true}
              hideChildSelection={true}
              groupDisplayType={"custom"}
              onGridChanged
              onRowSelected
              suppressAggFuncInHeader={true}
              suppressClickEdit={true}
              onSelectionChanged={(data) => onSelectionChanged(data)}
              paginationPageSize={pageSize}
              onBlur={onBlurHandler}
              wrapCellText
              autoCellHeight
              wrapHeaderText
              autoHeaderHeight
              disablePaginationForSinglePage
            />
          </div>
        </Loader>
      )}

    </Grid>
  );
};

StoreStrategyMasterDetailTable.propTypes = {
  getStoreDcPolicyRulesList: PropTypes.func,
  selectedDependencyValue: PropTypes.shape({
    meta: PropTypes.any,
  }),
  setDcStorePolicyData: PropTypes.func,
  setDcStorePolicyDataLoader: PropTypes.func,
  redirectedFromNetworkTab: PropTypes.bool,
  is_po_strategy_flow: PropTypes.bool,
  downloadButtonStateChange: PropTypes.func,
  showDownload: PropTypes.bool,
  downloadDisabled: PropTypes.bool,
  downloadDcStoreStrategy: PropTypes.func,
  history: PropTypes.shape({ push: PropTypes.func }),
  module: PropTypes.string,
  setShowConfigure: PropTypes.func,
  setRuleCode: PropTypes.func,
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer } = store;
  return {
    dcStorePolicyTableDataLoader:
      inventorysmartReducer?.dcStoreStrategyReducer
        ?.dcStorePolicyTableDataLoader,
    inventorysmartScreenConfig:
      inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    inventorysmartModulesPermission:
      inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartModulesPermission,
    savedEditedRules:
      inventorysmartReducer?.dcStoreStrategyReducer?.savedEditedRules,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (payload) => dispatch(addSnack(payload)),
    getDropDownOptions: (payload) => dispatch(getDropDownOptions(payload)),
    getStoreDcPolicyRulesList: (body) =>
      dispatch(getStoreDcPolicyRulesList(body)),
    setDcStorePolicyData: (body) => dispatch(setDcStorePolicyData(body)),
    setDcStorePolicyDataLoader: (body) =>
      dispatch(setDcStorePolicyDataLoader(body)),
    saveRuleName: (body) => dispatch(saveRuleName(body)),
    saveNetworkRuleName: (body) => dispatch(saveNetworkRuleName(body)),
    setSavedEditedRules: (body) => dispatch(setSavedEditedRules(body)),
    deleteRulesDc: (body) => dispatch(deleteRulesDc(body)),
    deleteNetworkRulesDc: (body) => dispatch(deleteNetworkRulesDc(body)),
    setConfigureData: (payload) => dispatch(setConfigureData(payload)),
    setBulkConfigureData: (payload) =>
      dispatch(setBulkConfigureData(payload)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(StoreStrategyMasterDetailTable);
