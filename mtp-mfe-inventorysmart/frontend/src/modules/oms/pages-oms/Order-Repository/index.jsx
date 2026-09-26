import React, { useEffect, useMemo, useRef, useState } from "react";
import { connect } from "react-redux";
import { useNavigate } from "react-router-dom-v5-compat";
import { isEqual } from "lodash";
import globalStyles from "core/Styles/globalStyles";
import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import { ORDER_REPOSITORY } from "modules/oms/constants-oms/routeConstants";
import { mergeOmsDcIntoFilters } from "modules/oms/utils-oms/oms-utility";
import { setSelectedFilters } from "modules/oms/services-oms/Order-Repository/order-repository-service";
import VendorStore from "./VendorStore";
import VendorDC from "./Vendor-DC";

const OrderRepository = (props) => {
  const globalClasses = globalStyles();
  const orderRepositoryBreadCrumbRef = useRef(null);

  const navigate = useNavigate();

  const [selectedGroup, setSelectedGroup] = useState("vendor_dc");
  const [groupOptions, setGroupOptions] = useState(null);

  useEffect(() => {
    const groupButtons = props.vendorToStoreScreenConfig?.headers_tab;
    setGroupOptions(groupButtons);
  }, [props.vendorToStoreScreenConfig]);

  const handleGroupChange = (event, newValue) => {
    setSelectedGroup(newValue);
  };

  const breadCrumbOptions = useMemo(
    () => [
      {
        label: "Home",
        to: "/home",
      },
      {
        label: "Order Repository",
        id: 1,
        action: () => {
          navigate(ORDER_REPOSITORY);
        },
      },
    ],
    [navigate]
  );

  const orderRepositoryBreadcrumbsOnly = (
    <HeaderBreadCrumbs
      options={breadCrumbOptions}
      breadCrumbRef={orderRepositoryBreadCrumbRef}
    />
  );

  // Re-merge DC after filter-dashboard apply (same pattern as Create New Order).
  useEffect(() => {
    const merged = mergeOmsDcIntoFilters(
      props.orderRepositorySelectedFilters,
      props.orderRepositorySelectedDcs
    );
    if (!isEqual(merged, props.orderRepositorySelectedFilters || [])) {
      props.setOrderRepositorySelectedFilters(merged);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally not depending on selectedDcs; see Create New Order
  }, [
    props.orderRepositorySelectedFilters,
    props.setOrderRepositorySelectedFilters,
  ]);

  useEffect(() => {
    const isCalledFromVendorStore =
      JSON.parse(localStorage.getItem("isRedirectedFromVendorStore")) === true;
    if (isCalledFromVendorStore) {
      setSelectedGroup("vendor_store");
    }
    return () => {
      localStorage.removeItem("isRedirectedFromVendorStore");
      localStorage.removeItem("selectedFiltersDependency");
    };
  }, []);

  return (
    <div className={globalClasses.paddingAround}>
      {selectedGroup === "vendor_dc" ? (
        <VendorDC
          screenName={props.screenName}
          orderRepositoryBreadcrumbsOnly={orderRepositoryBreadcrumbsOnly}
          groupOptions={groupOptions}
          selectedGroup={selectedGroup}
          onOrderRepositoryGroupChange={handleGroupChange}
        />
      ) : (
        <VendorStore
          screenName={props.screenName}
          orderRepositoryBreadcrumbsOnly={orderRepositoryBreadcrumbsOnly}
          groupOptions={groupOptions}
          selectedGroup={selectedGroup}
          onOrderRepositoryGroupChange={handleGroupChange}
        />
      )}
    </div>
  );
};

const mapStateToProps = (store) => ({
  vendorToStoreScreenConfig:
    store.omsReducer.orderingCommonService.orderingVendorToStoreConfig
      ?.order_repository,
  orderRepositorySelectedFilters:
    store.omsReducer.orderRepositoryService.selectedFilters,
  orderRepositorySelectedDcs:
    store.omsReducer.orderRepositoryService.orderRepositorySelectedDcs,
});

const mapDispatchToProps = (dispatch) => ({
  setOrderRepositorySelectedFilters: (payload) =>
    dispatch(setSelectedFilters(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(OrderRepository);
