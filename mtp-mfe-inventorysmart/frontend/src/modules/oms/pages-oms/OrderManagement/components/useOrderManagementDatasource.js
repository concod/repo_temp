import { useCallback, useEffect, useRef } from "react";
import {
  // fetchOrderManagementGrandTotal, // TODO: park Grand Total — restore when re-enabled
  fetchOrderManagementRows,
} from "../api/orderManagementDatasource.api.js";
import { buildDrilldownRowsPayload } from "../utils/drilldownMatrixPayload.util.js";
import { mapDrilldownRowsToSsrmShape } from "../utils/orderManagementRow.util.js";
// import { deferGridApiCall } from "../utils/deferGridApi.util.js"; // TODO: park Grand Total
import { resolveSsrmTotalCount } from "../utils/resolveSsrmTotalCount.util.js";
import { DEFAULT_SSRM_CACHE_BLOCK_SIZE } from "../constants.js";

/**
 * Tree SSRM datasource for Order Management.
 *
 * Pagination (row_offset / row_limit) applies at **every hierarchy depth** — root
 * load and each expanded parent (getSubRowsRequest) send AG Grid block bounds.
 * dynamic_hierarchy + group_by_columns identify the route; offset is per route.
 */
export function useOrderManagementTreeDatasource({
  screenId,
  pivotOrder,
  selectedFilters,
  selectedRoqDateTab,
  hlsDateFilter,
  selectedDateRange,
  selectedIds,
  appliedViewDetails,
  pivotPayloadKpis,
  stampRows,
  onGrandTotal,
  viewEditedOnlyRef,
}) {
  const screenIdRef = useRef(screenId);
  const pivotOrderRef = useRef(pivotOrder);
  const filtersRef = useRef(selectedFilters);
  const roqDateTabRef = useRef(selectedRoqDateTab);
  const hlsDateFilterRef = useRef(hlsDateFilter);
  const dateRangeRef = useRef(selectedDateRange);
  const selectedIdsRef = useRef(selectedIds);
  const appliedViewDetailsRef = useRef(appliedViewDetails);
  const pivotPayloadKpisRef = useRef(pivotPayloadKpis);
  const stampRowsRef = useRef(stampRows);
  const onGrandTotalRef = useRef(onGrandTotal);
  const viewEditedOnlyRefHolder = useRef(viewEditedOnlyRef);

  useEffect(() => {
    screenIdRef.current = screenId;
    pivotOrderRef.current = pivotOrder;
    filtersRef.current = selectedFilters;
    roqDateTabRef.current = selectedRoqDateTab;
    hlsDateFilterRef.current = hlsDateFilter;
    dateRangeRef.current = selectedDateRange;
    selectedIdsRef.current = selectedIds;
    appliedViewDetailsRef.current = appliedViewDetails;
    pivotPayloadKpisRef.current = pivotPayloadKpis;
    stampRowsRef.current = stampRows;
    onGrandTotalRef.current = onGrandTotal;
    viewEditedOnlyRefHolder.current = viewEditedOnlyRef;
  }, [
    screenId,
    pivotOrder,
    selectedFilters,
    selectedRoqDateTab,
    hlsDateFilter,
    selectedDateRange,
    selectedIds,
    appliedViewDetails,
    pivotPayloadKpis,
    stampRows,
    onGrandTotal,
    viewEditedOnlyRef,
  ]);

  const buildRequest = useCallback((groupKeys, pagination = {}, isPackEnabled = false) => {
    const activeRange = dateRangeRef.current?.[roqDateTabRef.current] || null;
    const rowOffset = pagination.rowOffset ?? 0;
    const rowLimit =
      pagination.rowLimit ?? DEFAULT_SSRM_CACHE_BLOCK_SIZE;
    return buildDrilldownRowsPayload({
      screenId: screenIdRef.current,
      pivotOrder: pivotOrderRef.current || [],
      groupKeys: Array.isArray(groupKeys) ? groupKeys : [],
      kpis: pivotPayloadKpisRef.current,
      selectedIds: selectedIdsRef.current,
      selectedFilters: filtersRef.current || [],
      hlsDateFilter: hlsDateFilterRef.current,
      dateRange: activeRange,
      selectedRoqDateTab: roqDateTabRef.current,
      viewDetails: appliedViewDetailsRef.current,
      rowOffset,
      rowLimit,
      isPackEnabled,
      // Parent sets this ref synchronously before purge-refresh.
      viewEditedOnly: Boolean(viewEditedOnlyRefHolder.current?.current),
    });
  }, []);

  const inflightRootRequestsRef = useRef(new Map());

  const runFetch = useCallback(
    async (groupKeys, params, filterBody, isPackEnabled = false) => {
      const startRow = params?.request?.startRow ?? 0;
      const endRow =
        params?.request?.endRow ??
        startRow + DEFAULT_SSRM_CACHE_BLOCK_SIZE;
      const rowLimit = Math.max(endRow - startRow, 1);
      const request = buildRequest(groupKeys, {
        rowOffset: startRow,
        rowLimit,
      }, isPackEnabled);
      const requestKey = JSON.stringify(request);

      const executeFetch = async () => {
        try {
          // TODO: park Grand Total — feature parked; restore parallel fetch when re-enabled.
          // Grand Total can't change just because the user scrolled to a
          // later page of the same root list — only fetch it on that list's
          // very first block (startRow 0). Every later root block (page 2,
          // 3, ...) reused `isRootFetch` alone and re-fired this on *every*
          // scroll, hammering the endpoint for a value that was already in
          // hand.
          // const isRootFetch =
          //   (!Array.isArray(groupKeys) || groupKeys.length === 0) &&
          //   startRow === 0;
          // const grandTotalPromise = isRootFetch
          //   ? fetchOrderManagementGrandTotal(request).catch((error) => {
          //       console.error(
          //         "order-management: grand-total fetch failed",
          //         error
          //       );
          //       return null;
          //     })
          //   : null;

          const payload = await fetchOrderManagementRows(request);
          const rows = payload?.rows ?? [];
          const hasMore = payload?.hasMore;
          let data = mapDrilldownRowsToSsrmShape(rows, {
            pivotOrder: pivotOrderRef.current || [],
            parentPath: groupKeys,
          });

          const stamp = stampRowsRef.current;
          if (stamp && data.length) {
            data = stamp(data, {
              parentPath: groupKeys,
              pivotOrder: pivotOrderRef.current,
            });
          }

          // TODO: park Grand Total — restore onGrandTotal apply when re-enabled.
          // if (grandTotalPromise) {
          //   const grandTotalData = await grandTotalPromise;
          //   if (grandTotalData && Object.keys(grandTotalData).length > 0) {
          //     const gridApi = params?.api;
          //     deferGridApiCall(gridApi, () => {
          //       onGrandTotalRef.current?.({
          //         ...grandTotalData,
          //         meta: { __isGrandTotal: true },
          //       });
          //     });
          //   }
          // }

          return {
            data,
            totalCount: resolveSsrmTotalCount({
              rows: data,
              startRow,
              endRow,
              hasMore,
              rowLimit,
            }),
          };
        } catch (error) {
          console.error("order-management: tree datasource fetch failed", error);
          return { data: [], totalCount: 0 };
        }
      };

      const inflight = inflightRootRequestsRef.current;
      const existing = inflight.get(requestKey);
      if (existing) {
        return existing;
      }
      const promise = executeFetch().finally(() => {
        inflight.delete(requestKey);
      });
      inflight.set(requestKey, promise);
      return promise;
    },
    [buildRequest]
  );

  const manualCallBack = useCallback(
    (metaBody, _pageIndex, params) => runFetch([], params, metaBody),
    [runFetch]
  );

  /**
   * Standalone Grand Total refetch — used after a successful edit/undo/redo
   * so Grand Total always reflects BE's authoritative rollup instead of a
   * FE-derived delta (see `applyEditDelta.util.js`'s old `computeNextGrandTotal`,
   * now removed). Root-level request, same shape as the initial row fetch.
   *
   * TODO: park Grand Total — network call disabled; keep export so callers
   * (edit/undo/reset) need no structural rewrite.
   */
  const fetchGrandTotal = useCallback(async () => {
    // const request = buildRequest([], {
    //   rowOffset: 0,
    //   rowLimit: DEFAULT_SSRM_CACHE_BLOCK_SIZE,
    // });
    // try {
    //   const grandTotalData = await fetchOrderManagementGrandTotal(request);
    //   return grandTotalData && Object.keys(grandTotalData).length > 0
    //     ? grandTotalData
    //     : null;
    // } catch (error) {
    //   console.error("order-management: grand-total refetch failed", error);
    //   return null;
    // }
    return null;
  }, []);

  const getSubRowsRequest = useCallback(
    (params) => {
      const parentData = params?.parentNode?.data || {};
      const groupKeys = Array.isArray(parentData.dimensionPath)
        ? parentData.dimensionPath
        : [];
      const isPackEnabled = parentData?.is_pack_enabled === true;
      const filterBody =
        params?.api?.gridOptionsWrapper?.gridOptions?.filterBody || null;
      return runFetch(groupKeys, params, filterBody, isPackEnabled);
    },
    [runFetch]
  );

  return { manualCallBack, getSubRowsRequest, fetchGrandTotal };
}
