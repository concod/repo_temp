import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { Select, OldTable, Input, Button, Popover, useTranslation } from "impact-ui-v3";
import { connect } from "react-redux";
import { makeStyles } from "@mui/styles";
import WarningIcon from "assets/warning.svg";
import { addSnack } from "core/actions/snackbarActions";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import { Tooltip } from "impact-ui-v3";
import CommonPanel from "../../Common/components/CommonPanel/CommonPanel";
import { handleErrorMessage } from "../../inventorysmart-utility";
import {
  getAddTransferOptions,
  getAddTransferSizes,
} from "modules/inventorysmart/services-inventorysmart/Create-Transfer-Recommendations-S2S/create-transfer-recommendations-service";
import {
  getTooltipTitle,
  onKeyDownPreventNeg,
  bulkUpdateChildColumnValues,
  updateChildColumnValue,
  syncRemainingSourceOh,
  resolveSourceStoreCode,
  DEFAULT_COL_FIELD,
  DEFAULT_CAP_FIELD,
} from "./transferUnitsUtils";
import { isEmpty } from "lodash";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import CellRenderer from "core/Utils/agGrid/cellRenderer";

const useStyles = makeStyles(() => ({
  addTransferBody: {
    display: "flex",
    flexDirection: "column",
    gap: 0,
  },
  selectRow: {
    display: "flex",
    gap: 16,
    marginBottom: 12,
  },
  divider: {
    width: "calc(100% + 32px)",
    height: 1,
    backgroundColor: "#D9DDE7",
    margin: "0px -16px",
    marginBottom: "12px",
  },
  tableContainer: {
    margin: "0px -16px",
    "& .ia-basic-table-layout.table-v32 > div": {
      margin: 0,
    },
    "& .MuiInputBase-input::-webkit-inner-spin-button": {
      display: "none",
    },
    "& .table-input-cell-rendererwrapper": {
      padding: "0px 13px",
    },
    "& .ag-input-cell": {
      "& > div": {
        maxHeight: "32px !important",
        height: "32px !important",
        "& > div": {
          maxHeight: "32px !important",
          height: "32px !important",
          border: "1px solid #C3C8D4",
          borderRadius: "8px",
          boxSizing: "border-box",
        },
      },
    },
    "& .ag-cell:has(.waring-icon)": {
      display: "flex !important",
      padding: "0 !important",
    },
    "& .waring-icon": {
      display: "flex",
      justifyContent: "center",
    },
    "& .row-disabled": {
      backgroundColor: "#FAFAFA !important",
      "& .ag-cell": {
        color: "#B4BAC7 !important",
      },
      "& .ag-checkbox-input-wrapper": {
        "&::after": {
          backgroundColor: "#FAFAFA !important",
          cursor: "not-allowed",
        },
        "&:hover::after": {
          border: "1px solid #c3c8d4",
        },
        "& input": {
          cursor: "not-allowed",
        },
      },
    },
  },
}));

const AddTransferPanel = (props) => {
  const classes = useStyles();

  const { t } = useTranslation();

  const [loading, setLoading] = useState(false);
  const [sizesLoading, setSizesLoading] = useState(false);
  const [roleOptions, setRoleOptions] = useState([]);
  const [storeOptionsMap, setStoreOptionsMap] = useState({});
  const [storeOptions, setStoreOptions] = useState([]);
  const [rowData, setRowData] = useState([]);
  const [columnDefs, setColumnDefs] = useState([]);

  const [selectedRole, setSelectedRole] = useState(null);
  const [isRoleOpen, setIsRoleOpen] = useState(false);

  const [selectedStore, setSelectedStore] = useState(null);
  const [isStoreOpen, setIsStoreOpen] = useState(false);

  const [articleOptions, setArticleOptions] = useState([]);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [isArticleOpen, setIsArticleOpen] = useState(false);
  const hasMode = !!props.mode;

  const [selectedRows, setSelectedRows] = useState([]);
  const [showSetAll, setShowSetAll] = useState(false);
  const [setAllUnits, setSetAllUnits] = useState("");
  const [anchorEl, setAnchorEl] = useState(null);
  const grandTotalRef = useRef({});
  const tableRef = useRef(null);

  const addCellRenderer = (columns) => {
    return columns.map((column) => {
      if (column.field === "transfer_units") {
        return {
          ...column,
          cellRenderer: (params, extraProps) => {
            if (isEmpty(params.data?.info)) {
              return (
                <CellRenderer
                  cellData={{ ...params, onKeyDown: onKeyDownPreventNeg }}
                  column={column}
                  extraProps={extraProps}
                  actions={null}
                />
              );
            }
            return <div className="number-cell">{params.value}</div>;
          },
        };
      }
      if (column.field === "flag") {
        return {
          ...column,
          cellRenderer: (params) => {
            if (params.data?.info && !isEmpty(params.data.info)) {
              return (
                <Tooltip
                  orientation="top"
                  title={getTooltipTitle(params)}
                  variant="tertiary"
                >
                  <span className="waring-icon">
                    <WarningIcon fontSize="small" />
                  </span>
                </Tooltip>
              );
            }
            return null;
          },
        };
      }
      return column;
    });
  };

  const getStoreMapping = () => {
    const isSource = selectedRole?.value === "source";
    return {
      source_store_code: isSource
        ? props.focusStoreData?.store_code || ""
        : selectedStore?.value || "",
      destination_store_code: isSource
        ? selectedStore?.value || ""
        : props.focusStoreData?.store_code || "",
    };
  };

  // Fetch options on mount
  useEffect(() => {
    let cancelled = false;
    const fetchOptions = async () => {
      try {
        setLoading(true);
        let payload;
        if (hasMode) {
          payload = {
            allocation_code: props.allocationCode,
            mode: props.mode,
            article: props.article,
            source_store: props.otherData?.sourceStoreCode || "",
            destination_store: props.otherData?.destinationStoreCode || "",
          };
        } else {
          payload = {
            allocation_code: props.allocationCode,
            mode: "route",
            article: props.article,
            focus_store: props.focusStoreData?.store_code,
          };
        }
        const response = await props.getAddTransferOptions(payload);
        if (!cancelled && response?.data?.status) {
          const data = response.data.data;
          if (hasMode) {
            // Mode-based flow: show articles dropdown
            if (data.articles) {
              setArticleOptions(data.articles);
            }
          } else {
            // Route flow: show role + store dropdowns
            if (data.role_options) {
              setRoleOptions(data.role_options.options || []);
              if (data.role_options.selected) {
                setSelectedRole(data.role_options.selected);
              }
            }
            if (data.stores) {
              setStoreOptionsMap(data.stores);
              // Set store options based on selected role (opposite side)
              const roleValue = data.role_options?.selected?.value;
              const oppositeRole =
                roleValue === "source" ? "destination" : "source";
              if (data.stores[oppositeRole]) {
                let options = data.stores[oppositeRole];
                options = options.map((item) => ({
                  ...item,
                  label: replaceSpecialCharacter(item.label),
                }));
                setStoreOptions(options);
              }
            }
          }
        }
      } catch (error) {
        handleErrorMessage(error, props);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchOptions();
    return () => {
      cancelled = true;
    };
  }, []);

  // Update store options when role changes (show opposite side's stores)
  useEffect(() => {
    const oppositeRole =
      selectedRole?.value === "source" ? "destination" : "source";
    if (selectedRole?.value && storeOptionsMap[oppositeRole]) {
      let options = storeOptionsMap[oppositeRole];
      options = options.map((item) => ({
        ...item,
        label: replaceSpecialCharacter(item.label),
      }));
      setStoreOptions(options);
    } else {
      setStoreOptions([]);
    }
    setSelectedStore(null);
    setRowData([]);
  }, [selectedRole, storeOptionsMap]);

  // Fetch sizes when store/article is selected
  useEffect(() => {
    if (hasMode) {
      // Mode-based: trigger when article is selected
      if (!selectedArticle || (Array.isArray(selectedArticle) && !selectedArticle.length)) {
        setRowData([]);
        return;
      }
    } else {
      // Route-based: trigger when store is selected
      if (!selectedStore || (Array.isArray(selectedStore) && !selectedStore.length)) {
        setRowData([]);
        return;
      }
    }
    let cancelled = false;
    const fetchSizes = async () => {
      try {
        setSizesLoading(true);
        let payload;
        if (hasMode) {
          payload = {
            allocation_code: props.allocationCode,
            article: selectedArticle.value,
            source_store: props.otherData?.sourceStoreCode || "",
            destination_store: props.otherData?.destinationStoreCode || "",
          };
        } else {
          const {
            source_store_code,
            destination_store_code,
          } = getStoreMapping();
          payload = {
            allocation_code: props.allocationCode,
            article: props.article,
            source_store: source_store_code,
            destination_store: destination_store_code,
          };
        }
        const response = await props.getAddTransferSizes(payload);
        if (!cancelled && response?.data?.status) {
          const data = response.data.data;
          setRowData(data.sizes || []);
          grandTotalRef.current = data.grand_total || {};
          let updatedColumns = agGridColumnFormatter([
            {
              column_name: "",
              checkboxSelection: true,
              headerCheckboxSelection: true,
              headerCheckboxSelectionFilteredOnly: false,
              suppressMenu: true,
              resizable: false,
              minWidth: 56,
              maxWidth: 56,
            },
            {
              column_name: "flag",
              label: "",
              minWidth: 56,
              maxWidth: 56,
              suppressMenu: true,
              resizable: false,
            },
            ...data.columns,
          ]);
          updatedColumns = addCellRenderer(updatedColumns);
          setColumnDefs(updatedColumns);
        }
      } catch (error) {
        handleErrorMessage(error, props);
        if (!cancelled) setRowData([]);
      } finally {
        if (!cancelled) setSizesLoading(false);
      }
    };
    fetchSizes();
    return () => {
      cancelled = true;
    };
  }, [hasMode, selectedArticle, selectedStore]);

  const onSelectionChanged = useCallback((params) => {
    const selected = params.api.getSelectedRows();
    setSelectedRows(selected);
  }, []);

  const handleRoleChange = (option) => {
    setSelectedRole(option);
    setSelectedRows([]);
  };

  const handleStoreChange = (option) => {
    setSelectedStore(option);
    setSelectedRows([]);
  };

  const onCellBlur = (
    _e,
    data,
    column,
    _isChanged,
    _pre,
    oldValue,
    cellData,
    newVal
  ) => {
    if (column.colId !== DEFAULT_COL_FIELD) return;
    const api = tableRef.current?.api;
    if (!api) return;

    const node = cellData.node;
    const { newRemainingOh } = updateChildColumnValue(node, newVal, {
      oldValue,
    });

    const srcCode = resolveSourceStoreCode(node, props.otherData);
    const size = node.data.sizes || "";
    const propagationMap = new Map();
    if (srcCode && size) {
      propagationMap.set(`${srcCode}_${size}`, newRemainingOh);
    }

    syncRemainingSourceOh({ api, propagationMap });
  };

  const handleSetAllApply = () => {
    const units = Number(setAllUnits) || 0;
    if (!tableRef.current?.api) return;

    bulkUpdateChildColumnValues({
      api: tableRef.current.api,
      getNewValue: () => units,
    });

    setShowSetAll(false);
    setAnchorEl(null);
    setSetAllUnits("");
    tableRef.current.api.deselectAll();
  };

  const handleApply = () => {
    if (!tableRef.current?.api) return;
    const api = tableRef.current.api;
    const allRows = [];
    let transferUnits = 0;
    let remainingSourceOh = 0;
    api.forEachNode((node) => {
      allRows.push({ ...node.data });
      transferUnits += node.data.transfer_units;
      remainingSourceOh += node.data[DEFAULT_CAP_FIELD];
    });

    let source_store_code, destination_store_code;
    if (hasMode) {
      source_store_code = props.otherData?.sourceStoreCode || "";
      destination_store_code = props.otherData?.destinationStoreCode || "";
    } else {
      const mapping = getStoreMapping();
      source_store_code = mapping.source_store_code;
      destination_store_code = mapping.destination_store_code;
    }
    const newRow = {
      child: allRows,
      source_store_code,
      destination_store_code,
      ...grandTotalRef.current,
      transfer_units: transferUnits,
      remaining_source_oh: remainingSourceOh,
      article: selectedArticle?.value || props.article,
      new_created: true,
    };

    if (props.onApply) {
      props.onApply(newRow);
    }
    props.onClose();
  };

  return (
    <CommonPanel
      headerText={t("inventorysmart.s2sAddTransfer")}
      width="808px"
      height="auto"
      onClose={props.onClose}
      primaryButtonLabel={t("inventorysmart.apply")}
      secondaryButtonLabel={t("inventorysmart.cancel")}
      onPrimaryButtonClick={handleApply}
      onSecondaryButtonClick={props.onClose}
      primaryButtonDisabled={!rowData.length}
    >
      <div className={classes.addTransferBody}>
        <div className={classes.selectRow}>
          {hasMode ? (
            <Select
              isOpen={isArticleOpen}
              label={t("inventorysmart.s2sStyleColor")}
              setIsOpen={setIsArticleOpen}
              isWithSearch={true}
              isClearable={true}
              isMulti={false}
              placeholder={t("inventorysmart.s2sSelect")}
              currentOptions={articleOptions}
              setCurrentOptions={() => {}}
              initialOptions={articleOptions}
              selectedOptions={selectedArticle}
              setSelectedOptions={setSelectedArticle}
              handleChange={(option) => {
                setSelectedArticle(option);
                setSelectedRows([]);
              }}
              width="254px"
              minWidth="254px"
            />
          ) : (
            <>
              <Select
                isOpen={isRoleOpen}
                label={t("inventorysmart.s2sRole")}
                setIsOpen={setIsRoleOpen}
                isWithSearch={false}
                isClearable={false}
                isMulti={false}
                placeholder={t("inventorysmart.s2sSelect")}
                currentOptions={roleOptions}
                setCurrentOptions={() => {}}
                initialOptions={roleOptions}
                selectedOptions={selectedRole}
                setSelectedOptions={setSelectedRole}
                handleChange={handleRoleChange}
                width="254px"
                minWidth="254px"
              />
              <Select
                isOpen={isStoreOpen}
                label={
                  selectedRole?.value === "source"
                    ? t("inventorysmart.s2sDestinationStore")
                    : t("inventorysmart.s2sSourceStore")
                }
                setIsOpen={setIsStoreOpen}
                isWithSearch={true}
                isClearable={true}
                isMulti={false}
                placeholder={t("inventorysmart.s2sSelect")}
                currentOptions={storeOptions}
                setCurrentOptions={() => {}}
                initialOptions={storeOptions}
                selectedOptions={selectedStore}
                setSelectedOptions={setSelectedStore}
                handleChange={handleStoreChange}
                width="254px"
                minWidth="254px"
              />
            </>
          )}
        </div>

        <div className={classes.divider} />
        <div className={classes.tableContainer}>
          <Loader loader={loading || sizesLoading}>
            <OldTable
              viewPoint="list"
              tableHeader={t("inventorysmart.transferView")}
              columnDefs={columnDefs}
              rowData={rowData}
              rowSelection="multiple"
              height="228px"
              onSelectionChanged={onSelectionChanged}
              pagination={false}
              cardContainer={false}
              suppressRowClickSelection
              suppressColumnMenu
              hideTableSetting
              hideTableFormat
              hideTableActions
              hideRowHeightOptionMenu
              hidePaginationPageSizeSelector
              hideNumericFormat
              hideFontSize
              gridOptions={{
                onBlur: onCellBlur,
              }}
              onGridReady={(params) => {
                tableRef.current = params;
              }}
              rowClassRules={{
                "row-disabled": (params) => !isEmpty(params.data?.info),
              }}
              topRightOptions={
                selectedRows && selectedRows.length > 0 ? (
                  <Button
                    id="addTransferSetAll"
                    aria-describedby="addTransferSetAll"
                    onClick={(event) => {
                      setAnchorEl(event.currentTarget);
                      setShowSetAll(true);
                    }}
                  >
                    Set All
                  </Button>
                ) : undefined
              }
            />
          </Loader>
        </div>
        <Popover
          id="addTransferSetAll"
          anchorEl={anchorEl}
          anchorOrigin={{
            horizontal: "left",
            vertical: "bottom",
          }}
          open={showSetAll}
          onClose={() => {
            setShowSetAll(false);
            setAnchorEl(null);
          }}
          width="240px"
          title={t("inventorysmart.s2sSetAll")}
          primaryButtonLabel={t("inventorysmart.apply")}
          onPrimaryButtonClick={handleSetAllApply}
          secondaryButtonLabel={t("inventorysmart.cancel")}
          onSecondaryButtonClick={() => {
            setShowSetAll(false);
            setAnchorEl(null);
            setSetAllUnits("");
          }}
        >
          <Input
            label="Units"
            type="number"
            value={setAllUnits}
            placeholder="Enter Units"
            inputProps={{ min: 0 }}
            onKeyDown={onKeyDownPreventNeg}
            onChange={(e) => setSetAllUnits(e.target.value)}
            style={{ width: 216, marginBottom: "20px" }}
          />
        </Popover>
      </div>
    </CommonPanel>
  );
};

const mapStateToProps = (store) => {
  return {};
};

const mapDispatchToProps = (dispatch) => ({
  getAddTransferOptions: (snack) => dispatch(getAddTransferOptions(snack)),
  getAddTransferSizes: (snack) => dispatch(getAddTransferSizes(snack)),
  addSnack: (snack) => dispatch(addSnack(snack)),
});

export default connect(mapStateToProps, mapDispatchToProps)(AddTransferPanel);
