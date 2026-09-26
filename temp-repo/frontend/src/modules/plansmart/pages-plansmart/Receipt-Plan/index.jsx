import React from "react";
import { connect } from "react-redux";
import EditReceiptPlan from "./edit-receipt-plan";
import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";

const ReceiptPlan = () => {
  return (
    <>
     <HeaderBreadCrumbs
        options={[
          {
            label: "Receipt Plan",
            id: 1,
          },
        ]}
      />
      <EditReceiptPlan />
    </>
  );
};

export default ReceiptPlan;
