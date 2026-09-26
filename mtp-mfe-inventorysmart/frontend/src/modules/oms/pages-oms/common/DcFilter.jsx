import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { FormControl } from "@mui/material";
import { Select } from "impact-ui-v3";
import { cloneDeep } from "lodash";
import {
  setSelectedDcs,
  setSelectedFilters as setOrderManagementSelectedFilters,
  getDistributionCentres,
  setDcOptions,
  setDcOptionsLoader,
} from "modules/oms/services-oms/Order-Management/order-management-service";
import {
  getCreateNewOrderDistributionCentres,
  setCreateNewOrderDcOptions,
  setCreateNewOrderDcOptionsLoading,
  setCreateNewOrderSelectedDcs,
  setSelectedFilters as setCreateNewOrderSelectedFilters,
} from "modules/oms/services-oms/Create-New-Order/create-new-order-service";
import {
  getOrderRepositoryDistributionCentres,
  setOrderRepositoryDcOptions,
  setOrderRepositoryDcOptionsLoading,
  setOrderRepositorySelectedDcs,
  setSelectedFilters as setOrderRepositorySelectedFilters,
} from "modules/oms/services-oms/Order-Repository/order-repository-service";
import { getOrderingDecisionDashboardDistributionCentres } from "modules/oms/services-oms/Decision-Dashboard/ordering-alerts-service";
import {
  setOrderingDashboardDcOptions,
  setOrderingDashboardDcOptionsLoading,
  setOrderingDashboardSelectedDcs,
  setSelectedFilters as setOrderingDashboardSelectedFilters,
} from "modules/oms/services-oms/Decision-Dashboard/ordering-decision-dashboard-service";
import { getAppliedOmsFiltersForDistributionCentres } from "modules/oms/utils-oms/oms-utility";

function getDcFilterVariantConfig(variant) {
  if (variant === "create_new_order") {
    return {
      selectDcOptions: (store) =>
        store.omsReducer.createNewOrderService.createNewOrderDcOptions,
      selectDcOptionsLoading: (store) =>
        store.omsReducer.createNewOrderService.createNewOrderDcOptionsLoading,
      selectSelectedDcs: (store) =>
        store.omsReducer.createNewOrderService.createNewOrderSelectedDcs,
      selectSelectedFilters: (store) =>
        store.omsReducer.createNewOrderService.selectedFilters,
      setDcOptionsAction: setCreateNewOrderDcOptions,
      setDcOptionsLoadingAction: setCreateNewOrderDcOptionsLoading,
      setSelectedDcsAction: setCreateNewOrderSelectedDcs,
      setSelectedFiltersAction: setCreateNewOrderSelectedFilters,
      fetchDistributionCentres: getCreateNewOrderDistributionCentres,
      selectElementId: "createNewOrderDcSelection",
    };
  }
  if (variant === "order_repository") {
    return {
      selectDcOptions: (store) =>
        store.omsReducer.orderRepositoryService.orderRepositoryDcOptions,
      selectDcOptionsLoading: (store) =>
        store.omsReducer.orderRepositoryService.orderRepositoryDcOptionsLoading,
      selectSelectedDcs: (store) =>
        store.omsReducer.orderRepositoryService.orderRepositorySelectedDcs,
      selectSelectedFilters: (store) =>
        store.omsReducer.orderRepositoryService.selectedFilters,
      setDcOptionsAction: setOrderRepositoryDcOptions,
      setDcOptionsLoadingAction: setOrderRepositoryDcOptionsLoading,
      setSelectedDcsAction: setOrderRepositorySelectedDcs,
      setSelectedFiltersAction: setOrderRepositorySelectedFilters,
      fetchDistributionCentres: getOrderRepositoryDistributionCentres,
      selectElementId: "orderRepositoryDcSelection",
    };
  }
  if (variant === "ordering_decision_dashboard") {
    return {
      selectDcOptions: (store) =>
        store.omsReducer.orderingDashboardService.orderingDashboardDcOptions,
      selectDcOptionsLoading: (store) =>
        store.omsReducer.orderingDashboardService
          .orderingDashboardDcOptionsLoading,
      selectSelectedDcs: (store) =>
        store.omsReducer.orderingDashboardService.orderingDashboardSelectedDcs,
      selectSelectedFilters: (store) =>
        store.omsReducer.orderingDashboardService.selectedFilters,
      setDcOptionsAction: setOrderingDashboardDcOptions,
      setDcOptionsLoadingAction: setOrderingDashboardDcOptionsLoading,
      setSelectedDcsAction: setOrderingDashboardSelectedDcs,
      setSelectedFiltersAction: setOrderingDashboardSelectedFilters,
      fetchDistributionCentres:
        getOrderingDecisionDashboardDistributionCentres,
      selectElementId: "orderingDecisionDashboardDcSelection",
    };
  }
  return {
    selectDcOptions: (store) =>
      store.omsReducer.orderManagementService.dcOptions,
    selectDcOptionsLoading: (store) =>
      store.omsReducer.orderManagementService.dcOptionsLoader,
    selectSelectedDcs: (store) =>
      store.omsReducer.orderManagementService.selectedDcs,
    selectSelectedFilters: (store) =>
      store.omsReducer.orderManagementService.selectedFilters,
    setDcOptionsAction: setDcOptions,
    setDcOptionsLoadingAction: setDcOptionsLoader,
    setSelectedDcsAction: setSelectedDcs,
    setSelectedFiltersAction: setOrderManagementSelectedFilters,
    fetchDistributionCentres: getDistributionCentres,
    selectElementId: "dcSelection",
  };
}

/**
 * Shared OMS DC filter (`pages-oms/common`). POST
 * `/inventory-smart/oms/get-distribution-centres` with `{ filters }` (non-DC
 * applied filters). Hidden until at least one applies.
 *
 * @param {object} props
 * @param {"order_management"|"create_new_order"|"order_repository"|"ordering_decision_dashboard"} [props.variant="order_management"] Redux slice + actions.
 */
const DcFilter = ({
  variant = "order_management",
  dashboardApiFlags,
} = {}) => {
  const dispatch = useDispatch();
  const cfg = useMemo(() => getDcFilterVariantConfig(variant), [variant]);

  const dcOptions = useSelector(cfg.selectDcOptions);
  const dcOptionsLoading = useSelector(cfg.selectDcOptionsLoading);
  const selectedDcs = useSelector(cfg.selectSelectedDcs);
  const selectedFilters = useSelector(cfg.selectSelectedFilters);
  const orderRepositoryDcDistributionStatus = useSelector((store) =>
    variant === "order_repository"
      ? store.omsReducer.orderRepositoryService.orderRepositoryDcDistributionStatus
      : null
  );
  const orderingScreensConfig = useSelector(
    (store) => store.omsReducer.orderingCommonService.orderingScreensConfig
  );

  const filtersForDcPost = useMemo(
    () => getAppliedOmsFiltersForDistributionCentres(selectedFilters),
    [selectedFilters]
  );
  const filtersKey = useMemo(
    () => JSON.stringify(filtersForDcPost),
    [filtersForDcPost]
  );
  /** Order Repository: include tab `status` so DC list refetches when the tab changes. */
  const dcFetchContextKey = useMemo(() => {
    if (variant === "order_repository") {
      return `${filtersKey}|${JSON.stringify(orderRepositoryDcDistributionStatus ?? null)}`;
    }
    return filtersKey;
  }, [variant, filtersKey, orderRepositoryDcDistributionStatus]);

  const [currentDcOptions, setCurrentDcOptions] = useState([]);
  const [isOpenDcDropdown, setIsOpenDcDropdown] = useState(false);
  const [isSelectAllDcs, setIsSelectAllDcs] = useState(false);
  const [previousSelectedDcs, setPreviousSelectedDcs] = useState([]);
  const prevDcFiltersKeyRef = useRef(undefined);
  const didSeedPreviousSelectedDcs = useRef(false);

  const isDcFilterEnabled =
    orderingScreensConfig?.oms_dashboard?.is_dc_filter_enabled || false;

  const showDcFilter =
    isDcFilterEnabled && filtersForDcPost.length > 0;

  const preserveCnoDcReduxWhenHidingOrRefetching =
    variant === "create_new_order";

  // After navigation, Redux may already have `selectedDcs`; seed snapshot once
  // the DC filter is shown so closing the dropdown without edits does not
  // treat persisted selection as a change.
  useLayoutEffect(() => {
    if (!showDcFilter || didSeedPreviousSelectedDcs.current) {
      return;
    }
    setPreviousSelectedDcs(selectedDcs || []);
    didSeedPreviousSelectedDcs.current = true;
  }, [showDcFilter, selectedDcs]);

  useEffect(() => {
    if (!isDcFilterEnabled) {
      return;
    }

    if (filtersForDcPost.length === 0) {
      prevDcFiltersKeyRef.current = undefined;
      didSeedPreviousSelectedDcs.current = false;
      dispatch(cfg.setDcOptionsLoadingAction(false));
      if (dcOptions?.length) {
        dispatch(cfg.setDcOptionsAction([]));
      }
      if (!preserveCnoDcReduxWhenHidingOrRefetching) {
        if (selectedDcs?.length) {
          dispatch(cfg.setSelectedDcsAction([]));
        }
        if (
          (selectedFilters || []).some(
            (f) => String(f?.dimension || "").toLowerCase() === "dc"
          )
        ) {
          const withoutDc = (selectedFilters || []).filter(
            (f) => String(f?.dimension || "").toLowerCase() !== "dc"
          );
          dispatch(cfg.setSelectedFiltersAction(withoutDc));
        }
      }
      return;
    }

    const previousKey = prevDcFiltersKeyRef.current;
    const fetchContextKeyChanged =
      previousKey !== undefined && previousKey !== dcFetchContextKey;

    // Same applied (non-DC) filters as last run and options already loaded:
    // keep `selectedDcs` / merged `dc` filter and skip a redundant POST (e.g.
    // High Level Summary -> Matrix Summary -> Product Details).
    if (!fetchContextKeyChanged && (dcOptions?.length ?? 0) > 0) {
      prevDcFiltersKeyRef.current = dcFetchContextKey;
      return;
    }

    let cancelled = false;
    dispatch(cfg.setDcOptionsLoadingAction(true));

    if (fetchContextKeyChanged) {
      if (preserveCnoDcReduxWhenHidingOrRefetching) {
        setPreviousSelectedDcs(selectedDcs || []);
      } else {
        if (selectedDcs?.length) {
          dispatch(cfg.setSelectedDcsAction([]));
        }
        setPreviousSelectedDcs([]);
        if (
          (selectedFilters || []).some(
            (f) => String(f?.dimension || "").toLowerCase() === "dc"
          )
        ) {
          const withoutDc = (selectedFilters || []).filter(
            (f) => String(f?.dimension || "").toLowerCase() !== "dc"
          );
          dispatch(cfg.setSelectedFiltersAction(withoutDc));
        }
      }
    }

    const distributionCentresBody = {
      filters: cloneDeep(filtersForDcPost),
      ...(variant === "order_repository"
        ? {
            screen: "order_repo",
            ...(Array.isArray(orderRepositoryDcDistributionStatus) &&
            orderRepositoryDcDistributionStatus.length > 0
              ? { status: [...orderRepositoryDcDistributionStatus] }
              : {}),
          }
        : {}),
      ...(variant === "ordering_decision_dashboard"
        ? { screen: "decision_dashboard" }
        : {}),
    };

    dispatch(
      cfg.fetchDistributionCentres(
        distributionCentresBody,
        variant === "ordering_decision_dashboard"
          ? dashboardApiFlags
          : undefined
      )
    )
      .then((response) => {
        if (cancelled) return;
        if (response?.data?.data) {
          const formattedOptions = response.data.data.map((dc) => ({
            label: dc.name,
            value: dc.linked_store_code,
          }));
          dispatch(cfg.setDcOptionsAction(formattedOptions));
        } else {
          dispatch(cfg.setDcOptionsAction([]));
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error("Error fetching DC options:", error);
          dispatch(cfg.setDcOptionsAction([]));
        }
      })
      .finally(() => {
        if (!cancelled) {
          dispatch(cfg.setDcOptionsLoadingAction(false));
          prevDcFiltersKeyRef.current = dcFetchContextKey;
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isDcFilterEnabled,
    dcFetchContextKey,
    dashboardApiFlags?.useV3Api,
    dashboardApiFlags?.isV3Schema,
    dispatch,
    cfg,
    variant,
    orderRepositoryDcDistributionStatus,
  ]);

  useEffect(() => {
    setCurrentDcOptions(dcOptions || []);
  }, [dcOptions]);

  useEffect(() => {
    const totalOptions = dcOptions?.length || 0;
    const totalSelected = selectedDcs?.length || 0;
    setIsSelectAllDcs(totalOptions > 0 && totalOptions === totalSelected);
  }, [dcOptions, selectedDcs]);

  const handleDcChange = (selectedOptions) => {
    dispatch(cfg.setSelectedDcsAction(selectedOptions || []));

    if (dcOptions?.length > 0) {
      setIsSelectAllDcs(selectedOptions?.length === dcOptions.length);
    }
  };

  const onDCDropdownClose = () => {
    const hasSelectionChanged =
      JSON.stringify(selectedDcs?.map((dc) => dc.value).sort()) !==
      JSON.stringify(previousSelectedDcs?.map((dc) => dc.value).sort());

    if (!hasSelectionChanged) {
      return;
    }

    setPreviousSelectedDcs(selectedDcs);

    const currentFilters = [...(selectedFilters || [])];
    const filtersWithoutDc = currentFilters.filter(
      (filter) => String(filter?.dimension || "").toLowerCase() !== "dc"
    );

    if (selectedDcs && selectedDcs.length > 0) {
      const dcFilter = {
        filter_type: "non-cascaded",
        attribute_name: "linked_store_codes",
        operator: "in",
        dimension: "dc",
        values: selectedDcs.map((dc) => dc.value),
      };

      dispatch(
        cfg.setSelectedFiltersAction([...filtersWithoutDc, dcFilter])
      );
    } else {
      dispatch(cfg.setSelectedFiltersAction(filtersWithoutDc));
    }
  };

  if (!showDcFilter) {
    return null;
  }

  return (
    <FormControl
      size="small"
      sx={{
        justifySelf: "end",
      }}
    >
      <Select
        id={cfg.selectElementId}
        currentOptions={currentDcOptions}
        setCurrentOptions={setCurrentDcOptions}
        initialOptions={dcOptions}
        selectedOptions={selectedDcs}
        handleChange={handleDcChange}
        setSelectedOptions={handleDcChange}
        isLoading={dcOptionsLoading}
        isOpen={isOpenDcDropdown}
        setIsOpen={setIsOpenDcDropdown}
        isMulti={true}
        isSelectAll={isSelectAllDcs}
        setIsSelectAll={setIsSelectAllDcs}
        label="Select DC"
        labelOrientation="left"
        toggleSelectAll={true}
        onDropdownClose={onDCDropdownClose}
      />
    </FormControl>
  );
};

export default DcFilter;
