import React from "react";
import { useEffect, useState } from "react";
import { connect } from "react-redux";
import { useNavigate } from "react-router-dom-v5-compat";
import globalStyles from "core/Styles/globalStyles";
import { ButtonGroup } from "impact-ui-v3";
import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import { ORDER_REPOSITORY } from "modules/oms/constants-oms/routeConstants";
import VendorStore from "./VendorStore";
import VendorDC from "./Vendor-DC";

const OrderRepository = (props) => {
  const globalClasses = globalStyles();

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

  const breadCrumbOptions = [
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
  ];

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
      <div className={globalClasses.marginBottom}>
        <HeaderBreadCrumbs options={breadCrumbOptions} />
      </div>
      {groupOptions && (
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

      {selectedGroup === "vendor_dc" ? (
        <VendorDC screenName={props.screenName} />
      ) : (
        <VendorStore screenName={props.screenName} />
      )}
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    vendorToStoreScreenConfig:
      store.omsReducer.orderingCommonService.orderingVendorToStoreConfig
        ?.order_repository,
  };
};

export default connect(mapStateToProps, null)(OrderRepository);
