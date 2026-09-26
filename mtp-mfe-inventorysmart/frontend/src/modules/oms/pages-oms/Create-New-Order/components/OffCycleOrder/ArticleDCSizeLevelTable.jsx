import React, { useEffect, useRef, useState, useMemo } from "react";
import { connect } from "react-redux";
import moment from "moment";
import { Button, ButtonGroup } from "impact-ui-v3";
import { cloneDeep, isEmpty } from "lodash";
import { addSnack, closeSnack } from "core/actions/snackbarActions";
import AgGridComponent from "core/Utils/agGrid";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import globalStyles from "core/Styles/globalStyles";
import { getTenantTimeZoneDetails } from "core/commonComponents/coreComponentScreen/utils";
import CellRenderers from "core/Utils/agGrid/cellRenderer";
import {
  ERROR_MESSAGE,
  defaultTableData,
  OMS_OFF_CYCLE_ORDER_TOGGLE_OPTIONS,
  TENANT_DATE_FORMAT,
} from "modules/oms/constants-oms/stringConstants";
import OffCycleSetAllPopUp from "./OffCycleSetAllPopUp.jsx";
import { createTableHeader } from "./utils";
import {
  setArticleDCSizeLevelTableDataLoader,
  setArticleDCSizeLevelTableConfigLoader,
  getArticleDCSizeLevelColumnConfig,
  getArticleDCSizeLevelTableData,
  getOffCycleDCSizeLevelUpdateData,
  setOffCycleOrderHasUnsavedChanges,
} from "modules/oms/services-oms/Create-New-Order/off-cycle-order-service";

const ArticleDCSizeLevelTable = (props) => {
  const globalClasses = globalStyles();
  const classes = useStyles();

  const [articleDCSizeTableColumns, setArticleDCSizeTableColumns] = useState(
    []
  );
  const [render, setRender] = useState(false);
  const [editedCells, setEditedCells] = useState({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [openPopUp, setOpenPopUp] = useState(false);
  const [selectedArticleRows, setSelectedArticleRows] = useState([]);
  const [checkAllSetAllRequest, setCheckAllSetAllRequest] = useState([]);

  const articleDCSizeTableGridInstance = useRef(null);
  const currentDeepDiveFiltersRef = useRef(null);

  const DEFAULT_TOGGLE_STATUS =
    props?.OffCycleOrderScreenConfig?.off_cycle_orders?.default_toggle_value;

  const DESCRIPTION_LABEL =
    props?.OffCycleOrderScreenConfig?.off_cycle_orders?.description_label;

  const UNIQUE_KEY =
    props?.OffCycleOrderScreenConfig?.off_cycle_orders?.unique_key;

  const DESCRIPTION_KEY =
    props?.OffCycleOrderScreenConfig?.off_cycle_orders?.description_key;
  const { tenantDateFormat } = getTenantTimeZoneDetails();
  const DATE_FORMAT = tenantDateFormat || TENANT_DATE_FORMAT;
  const [isToggleChecked, setIsToggleChecked] = useState(DEFAULT_TOGGLE_STATUS);

  const TOGGLE_OPTIONS = useMemo(() => {
    const config = props?.OffCycleOrderScreenConfig?.off_cycle_orders || {};

    const selectedArticle = props.selectedArticle;

    const getDefaultToggles = () => [
      config.toggle_value_left || OMS_OFF_CYCLE_ORDER_TOGGLE_OPTIONS[0],
      config.toggle_value_right || OMS_OFF_CYCLE_ORDER_TOGGLE_OPTIONS[1],
    ];

    if (!selectedArticle) {
      return getDefaultToggles();
    }

    return getDefaultToggles();
  }, [props?.OffCycleOrderScreenConfig]);

  const [selectedToggleOption, setSelectedToggleOption] = useState(null);

  useEffect(() => {
    const newSelectedOption = DEFAULT_TOGGLE_STATUS
      ? TOGGLE_OPTIONS[1]?.value || OMS_OFF_CYCLE_ORDER_TOGGLE_OPTIONS[1].value
      : TOGGLE_OPTIONS[0]?.value || OMS_OFF_CYCLE_ORDER_TOGGLE_OPTIONS[0].value;

    setSelectedToggleOption(newSelectedOption);
    setEditedCells({});
    setHasUnsavedChanges(false);
  }, [TOGGLE_OPTIONS, DEFAULT_TOGGLE_STATUS]);

  useEffect(() => {
    if (articleDCSizeTableGridInstance?.current) {
      articleDCSizeTableGridInstance.current.api.checkAllSetAllRequest = checkAllSetAllRequest;
    }
  }, [checkAllSetAllRequest]);

  const cellClassRules = {
    [classes.disabledCell]: (params) => {
      const colDef = params.colDef;
      if (
        colDef.accessor === "size" ||
        colDef.accessor === "l1_name" ||
        props?.selectedSubClass?.order_status_id === 0 ||
        colDef.cellRenderer === "agGroupCellRenderer"
      )
        return false;
      return true;
    },
  };

  const displaySnackMessages = (message, variance) => {
    props.closeSnack();
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const getValidCheckConfiguration = (checkConfiguration) => {
    let validCheckConfiguration = [];
    if (Array.isArray(checkConfiguration)) {
      validCheckConfiguration = checkConfiguration.filter(
        (item) => item !== null && item !== undefined
      );
    }
    if (validCheckConfiguration.length === 0) return [];
    else return validCheckConfiguration;
  };

  const getCheckConfigurationForArticleDCSize = () => {
    const uniqueRowId = isToggleChecked
      ? TOGGLE_OPTIONS?.[1]?.value
      : TOGGLE_OPTIONS?.[0]?.value;

    let l_checkAllSetAllRequest = {
      searchColumns: articleDCSizeTableGridInstance?.current?.api?.getFilterModel(),
    };
    let setAllData;
    if (
      articleDCSizeTableGridInstance?.current?.api?.checkConfiguration[
        articleDCSizeTableGridInstance?.current?.api?.checkConfiguration
          .length - 2
      ]
    ) {
      setCheckAllSetAllRequest((old) => {
        if (old && old.length > 0) {
          setAllData = [...old, l_checkAllSetAllRequest];
          return [...old, l_checkAllSetAllRequest];
        } else {
          setAllData = [l_checkAllSetAllRequest];
          return [l_checkAllSetAllRequest];
        }
      });
    }
    const selection = {
      data: getValidCheckConfiguration(
        articleDCSizeTableGridInstance?.current?.api?.checkConfiguration
      ),
      unique_columns: [uniqueRowId || "loc_code"],
    };
    const checkConfig = {
      selection,
      set_all: setAllData,
      isSelectAllRecords:
        articleDCSizeTableGridInstance?.current?.api?.isSelectAllRecords,
    };
    return checkConfig;
  };

  const checkForEditability = (columnsDef) => {
    try {
      let updatedColumnsDef = cloneDeep(columnsDef);
      updatedColumnsDef = updatedColumnsDef.map((item) => {
        if (item.extra?.is_grouping_key) {
          item.cellRenderer = "agGroupCellRenderer";
        }
        if (item.column_name === "order_quantity_cof") {
          item.cellStyle = (params) => {
            let colour = { backgroundColor: "inherit" };
            if (params.node.data.isEdited)
              colour = { backgroundColor: "#0055af36" };
            // Calculate MOQ breach only when toggle is not checked (Size level) at parent level
            if (!isToggleChecked && params.node.data.isMOQBreached)
              colour = { backgroundColor: "#AF000033" };
            return colour;
          };
          item.cellRenderer = (params, extraProps) => {
            item.disabled = !isEmpty(props?.userAccess)
              ? !props?.isUserHasEditAccess
              : props?.isUserHasViewOnlyAccess;
            return (
              <CellRenderers
                cellData={params}
                column={item}
                extraProps={extraProps}
                actions={null}
              ></CellRenderers>
            );
          };
        }

        if (item.is_editable && item.column_name === "adjusted_delivery_date") {
          item.cellStyle = (params) => {
            return params.node.data.isDateEdited
              ? { backgroundColor: "#0055af36" }
              : { backgroundColor: "inherit" };
          };
          if (isToggleChecked) {
            item.cellRenderer = (params, extraProps) => {
              if (params.node.level === 0) {
                item.disabled = !isEmpty(props?.userAccess)
                  ? !props?.isUserHasEditAccess
                  : props?.isUserHasViewOnlyAccess;
                item.disablePast = true;
                return (
                  <CellRenderers
                    cellData={params}
                    column={item}
                    extraProps={extraProps}
                    actions={null}
                  ></CellRenderers>
                );
              } else {
                return params.node.data.adjusted_delivery_date
                  ? moment(
                      params.node.data.adjusted_delivery_date,
                      TENANT_DATE_FORMAT
                    ).format(DATE_FORMAT)
                  : "-";
              }
            };
          } else {
            item.cellRenderer = (params, extraProps) => {
              if (params.node.level === 0) {
                return "";
              } else {
                item.disabled = !isEmpty(props?.userAccess)
                  ? !props?.isUserHasEditAccess
                  : props?.isUserHasViewOnlyAccess;
                return (
                  <CellRenderers
                    cellData={params}
                    column={item}
                    extraProps={extraProps}
                    actions={null}
                  ></CellRenderers>
                );
              }
            };
          }
        }

        //item.cellClassRules = cellClassRules;

        return item;
      });
      return updatedColumnsDef;
    } catch (err) {
      displaySnackMessages("Something went wrong", "error");
      return [];
    }
  };

  const handleToggleOptionChange = (event, option) => {
    setEditedCells({});
    setHasUnsavedChanges(false);
    if (option !== null) {
      setIsToggleChecked(!isToggleChecked);
      setSelectedToggleOption(option);
    }
  };

  const manualCallBack = async (manualbody, pageIndex, params) => {
    try {
      props.setArticleDCSizeLevelTableDataLoader(true);

      // Use ref to get latest filters (in case props haven't updated yet)
      const appliedFilters = cloneDeep(
        currentDeepDiveFiltersRef.current || props.deepDiveFilters || []
      );
      const appliedDateFilters = [];

      // Adding the OMS Date filters to the filters
      if (!isEmpty(props?.ropDate)) {
        appliedDateFilters.push(props?.ropDate);
      }
      if (!isEmpty(props?.recommRecieptDate)) {
        appliedDateFilters.push(props?.recommRecieptDate);
      }
      // Adding the Deep Dive Date filters to the filters
      if (props?.weekRange?.attribute_name) {
        appliedDateFilters.push(props?.weekRange);
      }

      let orderByValue = !isToggleChecked ? TOGGLE_OPTIONS?.[0]?.value : "";

      let body = {
        filters: appliedFilters,
        meta: {
          ...manualbody,
          limit: { limit: 10, page: pageIndex + 1 },
        },
        draft_id: props.draftId,
        article: props.selectedArticle?.article || props.selectedArticle,
        order_by: orderByValue,
      };

      // Add date_filter if appliedDateFilters is present
      if (appliedDateFilters.length > 0) {
        body.date_filter = appliedDateFilters;
      }

      let response = await props.getArticleDCSizeLevelTableData(body);
      if (response.data.status) {
        const dataResponse = cloneDeep(response.data.data);

        const uniqueRowId = isToggleChecked
          ? TOGGLE_OPTIONS?.[1]?.value
          : TOGGLE_OPTIONS?.[0]?.value;
        let formatedData = agGridRowFormatter(
          dataResponse,
          params?.api?.checkConfiguration,
          uniqueRowId || "article_dc_size_id"
        );
        formatedData = formatedData.map((item) => {
          // Calculate MOQ breach only when toggle is not checked (Size level) at parent level
          if (!isToggleChecked) {
            item.isMOQBreached =
              item.min_order_quantity_sku !== null &&
              item.order_quantity_cof < item.min_order_quantity_sku;
          }
          return item;
        });

        props.setArticleDCSizeLevelTableDataLoader(false);
        return { data: formatedData, totalCount: response.data.total };
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");
        props.setArticleDCSizeLevelTableDataLoader(false);
        return defaultTableData;
      }
    } catch (err) {
      console.log("Error in Fetching Article DC Size Level Table Data", err);
      displaySnackMessages(ERROR_MESSAGE, "error");
      props.setArticleDCSizeLevelTableDataLoader(false);
      return defaultTableData;
    }
  };

  const loadTableInstance = (params) => {
    articleDCSizeTableGridInstance.current = params;
  };

  const onBlur = (_e, data, column, isChanged) => {
    const uniqueRowId = isToggleChecked
      ? TOGGLE_OPTIONS?.[1]?.value
      : TOGGLE_OPTIONS?.[0]?.value;

    const updateCellBy = isToggleChecked ? TOGGLE_OPTIONS?.[0]?.value : "id";

    if (isChanged) {
      if (column.colId === "order_quantity_cof") {
        articleDCSizeTableGridInstance.current.api.forEachNode((node) => {
          if (
            node.data[uniqueRowId] === data[uniqueRowId] &&
            !node.data[updateCellBy]
          ) {
            if (data[updateCellBy]) {
              // Child Node: Aggregate child values to parent
              const aggregatedValue = node.data.status_obj?.reduce(
                (acc, item) => acc + (item.order_quantity_cof || 0),
                0
              );

              node.data.order_quantity_cof = aggregatedValue;

              node.data.status_obj?.forEach((item) => {
                if (item[updateCellBy] === data[updateCellBy]) {
                  item.isEdited = true;
                  setEditedCells((prev) => {
                    const updatedRows = {
                      ...prev,
                      [item.id]: {
                        ...item,
                      },
                    };
                    return updatedRows;
                  });
                }
              });

              node.data.isEdited = true;
              setHasUnsavedChanges(true);
              // Calculate MOQ breach only when toggle is not checked (Size level) at parent level
              if (!isToggleChecked) {
                node.data.isMOQBreached =
                  node.data.min_order_quantity_sku !== null &&
                  node.data.order_quantity_cof <
                    node.data.min_order_quantity_sku;
              }
            } else {
              // Parent Node: Distribute value among children based on roq_id
              let totalRoqId = node.data.raw_roq_cof || 0;
              const childCount = node.data.status_obj?.length;

              if (childCount > 0) {
                if (totalRoqId === 0) {
                  // Distribute equally with remainder handling
                  const totalQuantity = data.order_quantity_cof || 0;
                  const baseQuantity = Math.floor(totalQuantity / childCount);
                  let remainder = totalQuantity % childCount;

                  node.data.status_obj?.forEach((item, index) => {
                    // Distribute base quantity to all items
                    item.order_quantity_cof = baseQuantity;

                    // Distribute remaining quantity incrementally
                    if (remainder > 0) {
                      item.order_quantity_cof += 1;
                      remainder -= 1;
                    }

                    // Mark as edited
                    item.isEdited = true;

                    // Update edited cells
                    setEditedCells((prev) => {
                      const updatedRows = {
                        ...prev,
                        [item.id]: { ...item },
                      };
                      return updatedRows;
                    });
                    setHasUnsavedChanges(true);
                  });
                } else {
                  // Distribute based on roq_id ratio
                  node.data.status_obj?.forEach((item) => {
                    const ratio = (item.raw_roq_cof || 0) / totalRoqId || 0;
                    item.order_quantity_cof = Math.round(
                      (data.order_quantity_cof || 0) * ratio
                    );

                    // Mark as edited
                    item.isEdited = true;

                    // Update edited cells
                    setEditedCells((prev) => {
                      const updatedRows = {
                        ...prev,
                        [item.id]: { ...item },
                      };
                      return updatedRows;
                    });
                    setHasUnsavedChanges(true);
                  });
                }
              }

              // Mark parent node as edited
              node.data.isEdited = true;

              // Calculate MOQ breach only when toggle is not checked (Size level) at parent level
              if (!isToggleChecked) {
                node.data.isMOQBreached =
                  node.data.min_order_quantity_sku !== null &&
                  node.data.order_quantity_cof <
                    node.data.min_order_quantity_sku;
              }
            }

            // Update the order quantity for the parent node to the sum of the child nodes
            node.data.order_quantity_cof = node.data.status_obj?.reduce(
              (acc, item) => acc + (item.order_quantity_cof || 0),
              0
            );

            articleDCSizeTableGridInstance.current.api.refreshCells({
              force: true,
              suppressFlash: false,
              columns: ["order_quantity_cof"],
            });
          }
        });
      }
    }
  };

  const refreshTableData = () => {
    articleDCSizeTableGridInstance?.current?.api?.refreshServerSideStore({
      purge: true,
    });
    articleDCSizeTableGridInstance.current?.api?.deselectAll();
    setSelectedArticleRows([]);
    setEditedCells({});
    setHasUnsavedChanges(false);
  };

  const onSelectionChanged = (event) => {
    let selectedRows = [];
    articleDCSizeTableGridInstance.current.api.forEachNode((node) => {
      node.selected && selectedRows.push({ ...node.data });
    });
    setSelectedArticleRows(selectedRows);
  };

  const onCellValueChanged = (params) => {
    const { colDef, node , newValue, oldValue} = params;

    const uniqueRowId = isToggleChecked
      ? TOGGLE_OPTIONS?.[1]?.value
      : TOGGLE_OPTIONS?.[0]?.value;

    if (colDef.column_name === "adjusted_delivery_date") {
      // Validate that adjusted_delivery_date is not greater than selectedArticle.demand_start_date
      if (newValue && props.selectedArticle?.demand_start_date) {
        const adjustedDate = moment(newValue);
        const demandStartDate = moment(props.selectedArticle.demand_start_date);

        if (adjustedDate.isAfter(demandStartDate, "day")) {
          node.data.adjusted_delivery_date = oldValue;
          displaySnackMessages(
            "Adjusted delivery date cannot be greater than demand start date",
            "error"
          );

          params.api.forEachNode((currentNode) => {
            if (currentNode.data[uniqueRowId] === node.data[uniqueRowId]) {
              params.api.refreshCells({
                force: true,
                suppressFlash: false,
                rowNodes: [currentNode],
                columns: ["adjusted_delivery_date"],
              });
            }
          });

          return;
        }
      }

      const columnValue = node?.data?.["adjusted_delivery_date"];
      node.data.isDateEdited = true;

      if (isToggleChecked) {
        node.data.status_obj?.forEach((item) => {
          item.isDateEdited = true;
          item.adjusted_delivery_date = columnValue;

          setEditedCells((prev) => {
            const updatedRows = {
              ...prev,
              [item.id]: { ...item },
            };
            return updatedRows;
          });
          setHasUnsavedChanges(true);
        });
      }
      // Refresh the cells to show the updated styling
      params.api.forEachNode((currentNode) => {
        if (currentNode.data[uniqueRowId] === node.data[uniqueRowId]) {
          params.api.refreshCells({
            force: true,
            suppressFlash: false,
            rowNodes: [currentNode],
            columns: ["adjusted_delivery_date"],
          });
        }
      });
    }
  };

  const openSetAllPopUp = () => {
    setOpenPopUp(true);
  };

  const handleSave = async () => {
    const currentEditedArticles = Object.values(editedCells).map(
      (item) => item
    );

    const appliedFilters = cloneDeep(props.deepDiveFilters || []);
    const appliedDateFilters = [];

    // Adding the OMS Date filters to the filters
    if (!isEmpty(props?.ropDate)) {
      appliedDateFilters.push(props?.ropDate);
    }
    if (!isEmpty(props?.recommRecieptDate)) {
      appliedDateFilters.push(props?.recommRecieptDate);
    }
    // Adding the Deep Dive Date filters to the filters
    if (props?.weekRange?.attribute_name) {
      appliedDateFilters.push(props?.weekRange);
    }

    let body = {
      draft_id: props.draftId,
      article: props.selectedArticle?.article || props.selectedArticle,
      filters: appliedFilters,
      modifications: currentEditedArticles.map((item) => {
        const editedValue = item?.order_quantity_cof || 0;
        let formattedDate = null;
        if (moment(item.adjusted_delivery_date, DATE_FORMAT, true).isValid()) {
          formattedDate = moment(
            item.adjusted_delivery_date,
            DATE_FORMAT
          ).format(TENANT_DATE_FORMAT);
        }

        return {
          id: item.id,
          ...(formattedDate && { adjusted_delivery_date: formattedDate }),
          order_quantity_cof: editedValue,
        };
      }),
    };

    // Add date_filter if appliedDateFilters is present
    if (appliedDateFilters.length > 0) {
      body.date_filter = appliedDateFilters;
    }

    try {
      props.setArticleDCSizeLevelTableDataLoader(true);

      let response = await props.getOffCycleDCSizeLevelUpdateData(body);
      if (response.data.status) {
        displaySnackMessages("Draft saved successfully", "success");
        setEditedCells({});
        setHasUnsavedChanges(false);
        // Refresh parent table
        if (props.refreshParentTableData) {
          props.refreshParentTableData();
        }
        // Notify parent to reload other components (Deep Dive, HighLevelAggregateView)
        if (props.onSaveSuccess) {
          props.onSaveSuccess();
        }
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    } catch {
      displaySnackMessages(ERROR_MESSAGE, "error");
    } finally {
      props.setArticleDCSizeLevelTableDataLoader(false);
      refreshTableData();
    }
  };

  const fetchColumnConfig = async () => {
    try {
      let columnsData;

      let columns = await props.getArticleDCSizeLevelColumnConfig(
        isToggleChecked
      );
      columnsData = columns?.data?.data;

      let formattedColumns = agGridColumnFormatter(
        columnsData,
        null,
        {},
        null,
        null,
        null,
        null,
        true
      );

      let updatedColumns = checkForEditability(formattedColumns);

      setArticleDCSizeTableColumns(updatedColumns);
    } catch (err) {
      displaySnackMessages(ERROR_MESSAGE, "error");
    } finally {
      setRender(true);
      props.setArticleDCSizeLevelTableConfigLoader(false);
    }
  };

  useEffect(() => {
    if (props.selectedArticle) {
      setRender(false);
      props.setArticleDCSizeLevelTableConfigLoader(true);
      fetchColumnConfig();
    }
  }, [props.selectedArticle, isToggleChecked]);

  const getTopLeftOptions = () => {
    let options = [];
    options.push(
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        {createTableHeader(
          DESCRIPTION_LABEL,
          props.selectedArticle[`${UNIQUE_KEY}`]
        )}
        {createTableHeader(
          `${DESCRIPTION_LABEL} Description`,
          props.selectedArticle[DESCRIPTION_KEY]
        )}
      </div>
    );

    return options;
  };

  const handleClose = () => {
    props.setSelectedArticle(null);
  };

  const getTopRightOptions = () => {
    let options = [];

    options.push(
      <Button
        key="save-btn"
        variant="primary"
        color="primary"
        className={classes.button}
        disabled={Object.keys(editedCells).length === 0}
        onClick={handleSave}
      >
        Save
      </Button>
    );

    if (selectedArticleRows.length > 0) {
      options.push(
        <Button
          key="set-all-btn"
          variant="tertiary"
          color="primary"
          className={classes.button}
          disabled={selectedArticleRows.length === 0}
          onClick={openSetAllPopUp}
        >
          Set All
        </Button>
      );
    }

    return options;
  };

  const getBottomLeftOptions = () => {
    return (
      <div style={{ display: "flex", alignItems: "center" }}>
        <div
          style={{
            width: "14px",
            height: "14px",
            backgroundColor: "#AF000033",
            border: "1px solid #AF0000",
            marginRight: "8px",
          }}
        ></div>
        <span style={{ fontSize: "12px", color: "#666" }}>MOQ Breach</span>
      </div>
    );
  };

  useEffect(() => {
    props?.setOffCycleOrderHasUnsavedChanges({
      ...props.offCycleOrderHasUnsavedChanges,
      articleDCSizeLevel: hasUnsavedChanges,
    });
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (props.reloadTrigger && props.selectedArticle) {
      refreshTableData();
    }
  }, [props.reloadTrigger]);

  // always keep ref in sync with props (for manualCallBack to use latest filters)
  useEffect(() => {
    currentDeepDiveFiltersRef.current = props.deepDiveFilters || [];
  }, [props.deepDiveFilters]);

  return (
    <div className={globalClasses.marginVertical1rem}>
      <div className={globalClasses.marginVertical1rem}>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: "1rem",
          }}
        >
          <ButtonGroup
            id="toggleSwitch"
            onChange={handleToggleOptionChange}
            selectedOption={selectedToggleOption}
            exclusive
            aria-label="toggle view"
            options={TOGGLE_OPTIONS}
          />
        </div>

        <Loader
          loader={
            props.articleDCSizeLevelTableConfigLoader ||
            props.articleDCSizeLevelTableDataLoader
          }
          minHeight={"260px"}
        >
          {render && (
            <AgGridComponent
              columns={articleDCSizeTableColumns}
              manualCallBack={(body, pageIndex, params) =>
                manualCallBack(body, pageIndex, params)
              }
              loadTableInstance={loadTableInstance}
              onSelectionChanged={onSelectionChanged}
              onCellValueChanged={onCellValueChanged}
              onBlur={onBlur}
              pagination={true}
              totalCount={1}
              cacheBlockSize={10}
              serverSideStoreType="partial"
              rowModelType="serverSide"
              rowSelection="multiple"
              selectAllHeaderComponent={true}
              hideSelectAllRecords={false}
              onRowSelected
              isRowSelectable={(rowNode) => {
                return rowNode.level === 0;
              }}
              uniqueRowId={
                isToggleChecked
                  ? TOGGLE_OPTIONS?.[1]?.value
                  : TOGGLE_OPTIONS?.[0]?.value
              }
              groupDisplayType={"custom"}
              treeData={true}
              childKey={"status_obj"}
              tableHeader={getTopLeftOptions()}
              topRightOptions={getTopRightOptions()}
              bottomLeftOptions={getBottomLeftOptions()}
              closeButton={true}
              handleCloseButtonClick={handleClose}
            />
          )}
          {openPopUp && (
            <OffCycleSetAllPopUp
              setShowSetAllModal={setOpenPopUp}
              refreshTableData={refreshTableData}
              agGridInstance={articleDCSizeTableGridInstance.current}
              draftId={props.draftId}
              getCheckConfigurationForProductDetails={
                getCheckConfigurationForArticleDCSize
              }
              STORE_SETALL_FIELDS={
                props?.OffCycleOrderScreenConfig?.off_cycle_orders
                  ?.store_set_all_fields_size_dc_details
              }
              deepDiveFilters={props.deepDiveFilters}
              onSaveSuccess={props.onSaveSuccess}
              selectedProductDetails={props.selectedArticle}
              weekRange={props.weekRange}
            />
          )}
        </Loader>
      </div>
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    articleDCSizeLevelTableConfigLoader:
      store.omsReducer.offCycleOrderService.articleDCSizeLevelTableConfigLoader,
    articleDCSizeLevelTableDataLoader:
      store.omsReducer.offCycleOrderService.articleDCSizeLevelTableDataLoader,
    OffCycleOrderScreenConfig:
      store.omsReducer.offCycleOrderService.offCycleOrderConfiguration
        ?.create_new_order,
    offCycleOrderHasUnsavedChanges:
      store.omsReducer.offCycleOrderService.offCycleOrderHasUnsavedChanges,
    recommRecieptDate:
      store.omsReducer.offCycleOrderService.offCycleOrderRecommRecieptDate,
    ropDate: store.omsReducer.offCycleOrderService.offCycleOrderRopDate,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setOffCycleOrderHasUnsavedChanges: (payload) =>
    dispatch(setOffCycleOrderHasUnsavedChanges(payload)),
  getArticleDCSizeLevelColumnConfig: (payload) =>
    dispatch(getArticleDCSizeLevelColumnConfig(payload)),
  getArticleDCSizeLevelTableData: (payload) =>
    dispatch(getArticleDCSizeLevelTableData(payload)),
  getOffCycleDCSizeLevelUpdateData: (payload) =>
    dispatch(getOffCycleDCSizeLevelUpdateData(payload)),
  setArticleDCSizeLevelTableConfigLoader: (payload) =>
    dispatch(setArticleDCSizeLevelTableConfigLoader(payload)),
  setArticleDCSizeLevelTableDataLoader: (payload) =>
    dispatch(setArticleDCSizeLevelTableDataLoader(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  closeSnack: (payload) => dispatch(closeSnack(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ArticleDCSizeLevelTable);
