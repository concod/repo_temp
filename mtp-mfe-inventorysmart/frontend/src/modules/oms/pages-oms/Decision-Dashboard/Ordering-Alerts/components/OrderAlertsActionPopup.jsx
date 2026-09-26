import React, { useEffect, useMemo, useRef } from "react";
import { connect, useSelector } from "react-redux";
import { debounce } from "lodash";
import AgGridComponent from "core/Utils/agGrid";
import Loader from "core/Utils/Loader/loader";
import { BottomSheet } from "impact-ui-v3";

const OrderAlertsActionPopup = (props) => {
  const tableGridInstance = useRef(null);
  const sortListenerAttachedRef = useRef(false);
  const lastRequestedSortRef = useRef(null);

  useEffect(() => {
    lastRequestedSortRef.current = null;
  }, [props.active, props.tableData, props.tableConfig]);

  const COLUMNS_SORT_ON_API = useSelector(
    (store) =>
      store?.omsReducer?.orderingCommonService?.orderingPackOrderConfig
        ?.columns_sort_on_api || []
  );

  const isApiSortEnabled =
    props.enableApiSort !== false && typeof props.onApiSort === "function";

  const getSortMetaFromGridSortModel = (sortModel) => {
    if (Array.isArray(sortModel) && sortModel.length > 0) {
      return [
        {
          column: sortModel[0]?.colId,
          order: sortModel[0]?.sort,
        },
      ];
    }
    return [];
  };

  const getSortModelFromColumnState = (columnState) => {
    if (!Array.isArray(columnState) || columnState.length === 0) return [];
    return columnState
      .filter((c) => c?.sort)
      .sort((a, b) => (a?.sortIndex ?? 0) - (b?.sortIndex ?? 0))
      .map((c) => ({
        colId: c?.colId,
        sort: c?.sort,
      }));
  };

  const getSortModelFromColumnDefs = (colDefs) => {
    const result = [];
    const walk = (defs) => {
      for (const def of defs || []) {
        if (def?.children?.length) {
          walk(def.children);
          continue;
        }
        if (def?.sub_headers?.length) {
          walk(def.sub_headers);
          continue;
        }
        if (def?.sort) {
          const id =
            def?.colId || def?.field || def?.accessor || def?.column_name;
          if (id) {
            result.push({ colId: id, sort: def.sort });
          }
        }
      }
    };
    walk(colDefs);
    return result;
  };

  const isApiSortedColId = (api, colId) => {
    if (!isApiSortEnabled) return false;
    if (!colId) return false;
    if (!Array.isArray(COLUMNS_SORT_ON_API) || COLUMNS_SORT_ON_API.length === 0)
      return false;

    if (COLUMNS_SORT_ON_API.includes(colId)) return true;

    const colDefs = api?.getColumnDefs ? api.getColumnDefs() : [];
    const findDef = (defs) => {
      for (const def of defs || []) {
        if (def?.children?.length) {
          const found = findDef(def.children);
          if (found) return found;
        }
        if (def?.sub_headers?.length) {
          const found = findDef(def.sub_headers);
          if (found) return found;
        }
        const defId =
          def?.colId || def?.field || def?.accessor || def?.column_name;
        if (defId === colId) return def;
      }
      return null;
    };

    const def = findDef(colDefs);
    const resolvedId =
      def?.accessor || def?.column_name || def?.field || def?.colId;
    return Boolean(resolvedId && COLUMNS_SORT_ON_API.includes(resolvedId));
  };

  const columnsWithApiSortOverrides = useMemo(() => {
    const cols = props.tableConfig;
    if (!Array.isArray(cols)) return cols;
    if (!isApiSortEnabled) return cols;
    if (!Array.isArray(COLUMNS_SORT_ON_API) || COLUMNS_SORT_ON_API.length === 0)
      return cols;

    return cols.map((obj) => {
      const colId =
        obj?.accessor || obj?.column_name || obj?.field || obj?.colId;
      if (colId && COLUMNS_SORT_ON_API.includes(colId)) {
        return {
          ...obj,
          sortable: true,
          comparator: () => 0,
        };
      }
      return obj;
    });
  }, [props.tableConfig, COLUMNS_SORT_ON_API, isApiSortEnabled]);

  const onGridSortChanged = useRef(
    debounce((api) => {
      let sortModel = api?.getSortModel ? api.getSortModel() : [];
      if (!Array.isArray(sortModel) || sortModel.length === 0) {
        const colState = api?.getColumnState ? api.getColumnState() : [];
        sortModel = getSortModelFromColumnState(colState);
      }
      if (!Array.isArray(sortModel) || sortModel.length === 0) {
        const colDefs = api?.getColumnDefs ? api.getColumnDefs() : [];
        sortModel = getSortModelFromColumnDefs(colDefs);
      }

      const sortMeta = getSortMetaFromGridSortModel(sortModel);
      const sortKey = JSON.stringify(sortMeta);
      if (lastRequestedSortRef.current === sortKey) return;

      const sortedColId = sortMeta?.[0]?.column;
      if (!isApiSortedColId(api, sortedColId)) {
        lastRequestedSortRef.current = null;
        return;
      }

      lastRequestedSortRef.current = sortKey;
      props.onApiSort({ sortMeta, api });
    }, 50)
  );

  const loadTableInstance = (params) => {
    const prevApi = tableGridInstance.current?.api;
    tableGridInstance.current = params;

    if (prevApi && prevApi !== params?.api) {
      sortListenerAttachedRef.current = false;
      lastRequestedSortRef.current = null;
    }

    if (!sortListenerAttachedRef.current && params?.api?.addEventListener) {
      sortListenerAttachedRef.current = true;
      params.api.addEventListener("sortChanged", () => {
        onGridSortChanged.current(params.api);
      });
    }
  };

  return (
    <>
      <BottomSheet
        label="Default"
        id="orderDecisionDashboardDialog"
        aria-labelledby="order-dialog"
        title="Review Recommendation"
        open={props.active}
        onClose={(_event, reason) => {
          if (reason === "backdropClick") {
            return;
          }
          props.closeModal();
        }}
        footerOptions={[
          {
            label: "Cancel",
            onClick: () => {
              props.closeModal();
            },
            variant: "url",
          },
        ]}
        secondaryButtonLabel="Cancel"
        onSecondaryButtonClick={() => {
          props.closeModal();
        }}
      >
        <div>
          <Loader
            loader={
              props.orderAlertsPopUpTableConfigLoader ||
              props.orderAlertsPopUpTableDataLoader
            }
            minHeight={"350px"}
          >
            {
              <AgGridComponent
                columns={columnsWithApiSortOverrides}
                rowdata={props.tableData}
                selectAllHeaderComponent={false}
                uniqueRowId={"unique_id"}
                loadTableInstance={loadTableInstance}
              />
            }
          </Loader>
        </div>
      </BottomSheet>
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    alertsActionPopupConfigLoader:
      store.omsReducer.omsAlertsActionsService.alertsActionPopupConfigLoader,
    selectedFilters: store.omsReducer.orderingDashboardService.selectedFilters,
    filterDashboardConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        "decisionDashboardFilterConfiguration"
      ],
    orderAlertsPopUpTableConfigLoader:
      store.omsReducer.omsOrderingAlertsService
        .orderAlertsPopUpTableConfigLoader,
    orderAlertsPopUpTableDataLoader:
      store.omsReducer.omsOrderingAlertsService.orderAlertsPopUpTableDataLoader,
  };
};
const mapDispatchToProps = (dispatch) => ({});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(OrderAlertsActionPopup);
