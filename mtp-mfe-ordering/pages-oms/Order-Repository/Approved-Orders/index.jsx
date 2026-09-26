import React, { useState } from "react";
import { connect } from "react-redux";
import OrderRepositoryApprovedTable from "./OrderRepositoryApprovedTable";

const ApprovedOrders = function (props) {
  const [renderAgGrid, setRenderAgGrid] = useState(false);

  return (
    props.data && (
      <div style={{ paddingTop: "0.5rem" }}>
        <OrderRepositoryApprovedTable
          data={props?.data}
          renderAgGrid={renderAgGrid}
          setRenderAgGrid={setRenderAgGrid}
          pagination={false}
          startEndDate={props.startEndDate}
          setReloadKpi={props.setReloadKpi}
          isRedirectedFromDifferentPage={props?.isRedirectedFromDifferentPage}
          isCalledFromVendorStore={props?.isCalledFromVendorStore}
        />
      </div>
    )
  );
};

export default connect(null, null)(ApprovedOrders);
