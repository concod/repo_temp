import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { connect } from "react-redux";
import { isEqual } from "lodash";
import { useNavigate } from "react-router-dom-v5-compat";
import moment from "moment";
import globalStyles from "core/Styles/globalStyles";
import React from "react";
import { ButtonGroup } from "impact-ui-v3";
import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import { addSnack } from "core/actions/snackbarActions";
import { CREATE_NEW_ORDER } from "modules/oms/constants-oms/routeConstants";
import { ERROR_MESSAGE } from "modules/oms/constants-oms/stringConstants";
import CreateNewOrderForVendorDC from "./components/CreateNewOrderForVendorDC";
import CreateNewOrderForVendorStore from "./components/CreateNewOrderForVendorStore";
import { getOmsCoreFiscalCalendar } from "modules/oms/services-oms/common/common-services";
import { useStyles as omsUseStyles } from "modules/oms/styles-oms/orderingCustomStyles";
import DcFilter from "../common/DcFilter";
import { mergeOmsDcIntoFilters } from "modules/oms/utils-oms/oms-utility";
import { setSelectedFilters } from "modules/oms/services-oms/Create-New-Order/create-new-order-service";

const CreateNewOrder = (props) => {
  const globalClasses = globalStyles();
  const createNewOrderBreadCrumbRef = useRef(null);
  const omsClasses = omsUseStyles();

  const navigate = useNavigate();

  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupOptions, setGroupOptions] = useState(null);
  const [vendorDcCoreShellActive, setVendorDcCoreShellActive] = useState(false);

  const [fiscalCalendarDetails, setFiscalCalendarDetails] = useState([]);
  const [pageLoader, setPageLoader] = useState(false);
  const [showOffCycleOrder, setShowOffCycleOrder] = useState(false);

  useEffect(() => {
    const isCalledFromVendorStore =
      JSON.parse(localStorage.getItem("isRedirectedFromVendorStore")) === true;
    if (isCalledFromVendorStore) {
      setSelectedGroup("vendor_store");
    } else {
      setSelectedGroup("vendor_dc");
    }
    return () => {
      localStorage.removeItem("isRedirectedFromVendorStore");
    };
  }, []);

  useEffect(() => {
    const groupButtons = props.vendorToStoreScreenConfig?.headers_tab;
    setGroupOptions(groupButtons);
  }, [props.vendorToStoreScreenConfig]);

  const handleGroupChange = (event, newValue) => {
    setSelectedGroup(newValue);
    setShowOffCycleOrder(false);
  };

  const onVendorDcCoreShellActiveChange = useCallback((active) => {
    setVendorDcCoreShellActive(Boolean(active));
  }, []);

  useEffect(() => {
    if (selectedGroup !== "vendor_dc") {
      setVendorDcCoreShellActive(false);
    }
  }, [selectedGroup]);

  // Re-merge DC into `selectedFilters` when the filter list changes (e.g. filter
  // dashboard apply). Omit `selectedDcs` from deps so we match HLS: DC is only
  // written to filters on dropdown close (`DcFilter` CNO variant), not on
  // every in-dropdown selection — avoids extra API work while the user is
  // still picking DCs.
  useEffect(() => {
    const dcRow = (props.createNewOrderSelectedFilters || []).find(
      (f) => String(f?.dimension || "").toLowerCase() === "dc"
    );
    const dcsFromExistingFilter = (dcRow?.values || []).map((v) =>
      typeof v === "object" && v != null
        ? { label: v.label ?? String(v.value ?? v), value: v.value ?? v.label }
        : { label: String(v), value: v }
    );
    const selectedDcsForMerge =
      props.selectedDcs?.length > 0
        ? props.selectedDcs
        : dcsFromExistingFilter.length > 0
        ? dcsFromExistingFilter
        : [];

    const merged = mergeOmsDcIntoFilters(
      props.createNewOrderSelectedFilters,
      selectedDcsForMerge
    );
    const willWrite = !isEqual(
      merged,
      props.createNewOrderSelectedFilters || []
    );
    if (willWrite) {
      props.setCreateNewOrderSelectedFilters(merged);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally not depending on selectedDcs; see comment above
  }, [
    props.createNewOrderSelectedFilters,
    props.setCreateNewOrderSelectedFilters,
  ]);

  const breadCrumbOptions = useMemo(
    () => [
      {
        label: "Home",
        to: "/home",
      },
      {
        label: showOffCycleOrder
          ? "Create new off cycle order"
          : "Create New Order",
        id: 1,
        action: () => {
          navigate(CREATE_NEW_ORDER);
        },
      },
    ],
    [showOffCycleOrder, navigate]
  );

  const createNewOrderBreadcrumbsOnly = (
    <HeaderBreadCrumbs
      options={breadCrumbOptions}
      breadCrumbRef={createNewOrderBreadCrumbRef}
    />
  );

  const createNewOrderBreadcrumbAndDcTopRow = (
    <div
      className={`${globalClasses.flexRow} ${globalClasses.layoutAlignBetweenCenter}`}
      style={{ flexWrap: "wrap", gap: "16px" }}
    >
      {createNewOrderBreadcrumbsOnly}
      <DcFilter variant="create_new_order" />
    </div>
  );

  const hideOuterChromeForCreateNewOrder =
    selectedGroup === "vendor_store" ||
    (selectedGroup === "vendor_dc" && vendorDcCoreShellActive);

  useEffect(() => {
    const fetchFiscalCalendar = async () => {
      try {
        setPageLoader(false);
        let startYear = moment().year();
        let endYear = moment().year() + 2;
        let queryParams = `?start_fiscal_year=${startYear}&end_fiscal_year=${endYear}`;
        const getFinancialCalendarData = await getOmsCoreFiscalCalendar(
          queryParams
        );
        moment.updateLocale("en", {
          week: {
            dow: getFinancialCalendarData?.data?.data?.week_start_day || 0,
          },
        });
        setFiscalCalendarDetails(getFinancialCalendarData?.data?.data?.data);
      } catch (error) {
        setPageLoader(true);
        props.addSnack({
          message: ERROR_MESSAGE,
          options: {
            variant: "error",
          },
        });
      }
    };
    fetchFiscalCalendar();
  }, []);

  const renderGroupOptions = () => {
    return (
      <>
        {!hideOuterChromeForCreateNewOrder && !showOffCycleOrder && (
          <div className={globalClasses.marginBottom}>
            {createNewOrderBreadcrumbAndDcTopRow}
          </div>
        )}
        {groupOptions && !hideOuterChromeForCreateNewOrder && (
          <div
            className={`${globalClasses.centerAlign} ${globalClasses.marginBottom}`}
          >
            <ButtonGroup
              onChange={handleGroupChange}
              options={groupOptions}
              selectedOption={selectedGroup}
            />
          </div>
        )}
      </>
    );
  };

  return (
    <div className={omsClasses.paddingLayout}>
      {selectedGroup === "vendor_dc" ? (
        <CreateNewOrderForVendorDC
          screenName={props.screenName}
          pageLoader={pageLoader}
          setPageLoader={setPageLoader}
          fiscalCalendarDetails={fiscalCalendarDetails}
          onOffCycleOrderVisibilityChange={setShowOffCycleOrder}
          createNewOrderBreadcrumbsOnly={createNewOrderBreadcrumbsOnly}
          groupOptions={groupOptions}
          selectedGroup={selectedGroup}
          onCreateNewOrderGroupChange={handleGroupChange}
          onVendorDcCoreShellActiveChange={onVendorDcCoreShellActiveChange}
          renderGroupOptions={renderGroupOptions}
          headerBreadCrumb={<HeaderBreadCrumbs options={breadCrumbOptions} />}
        />
      ) : (
        <CreateNewOrderForVendorStore
          screenName={props.screenName}
          fiscalCalendarDetails={fiscalCalendarDetails}
          createNewOrderBreadcrumbsOnly={createNewOrderBreadcrumbsOnly}
          groupOptions={groupOptions}
          selectedGroup={selectedGroup}
          onCreateNewOrderGroupChange={handleGroupChange}
          renderGroupOptions={renderGroupOptions}
          headerBreadCrumb={<HeaderBreadCrumbs options={breadCrumbOptions} />}
        />
      )}
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    vendorToStoreScreenConfig:
      store.omsReducer.orderingCommonService.orderingVendorToStoreConfig
        ?.create_new_order,
    createNewOrderSelectedFilters:
      store.omsReducer.createNewOrderService.selectedFilters,
    selectedDcs:
      store.omsReducer.createNewOrderService.createNewOrderSelectedDcs,
  };
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (payload) => dispatch(addSnack(payload)),
  setCreateNewOrderSelectedFilters: (payload) =>
    dispatch(setSelectedFilters(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(CreateNewOrder);
