import { useState } from "react";
import { connect } from "react-redux";
import {
  deletePlans,
  setInventorysmartDeletePlanLoader,
} from "modules/inventorysmart/services-inventorysmart/Decision-Dashboard/decision-dashboard-services";
import { resetOrderRepositoryState } from "modules/inventorysmart/services-inventorysmart/Order-Repository/order-repository-service";
import { addSnack } from "core/actions/snackbarActions";
import OrderRepositoryApprovedTable from "./OrderRepositoryApprovedTable";

const ApprovedOrders = function (props) {
  const [selectedPlanIds, setSelectedPlanIds] = useState([]);
  const [renderAgGrid, setRenderAgGrid] = useState(false);
  const [selectedSkuCount, setSelectedSkuCount] = useState(0);

  const confirmDeletePlans = () => {
    const callDelete = async () => {
      props.setInventorysmartDeletePlanLoader(true);
      try {
        let body = {
          plan_codes: [...selectedPlanIds],
        };
        await props.deletePlans(body);
        displaySnackMessages("Successfully deleted plans", "success");
        props.setInventorysmartDeletePlanLoader(false);
      } catch (err) {
        props.setInventorysmartDeletePlanLoader(false);
        displaySnackMessages("Something went wrong on delete", "error");
      }
    };
    callDelete();
  };

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  return (
    props.data && (
      <div style={{ paddingLeft: "0.5rem" }}>
        <OrderRepositoryApprovedTable
          data={props?.data}
          setSelectedPlanIds={setSelectedPlanIds}
          confirmDeletePlans={confirmDeletePlans}
          renderAgGrid={renderAgGrid}
          setRenderAgGrid={setRenderAgGrid}
          pagination={false}
          setSelectedSkuCount={setSelectedSkuCount}
          startEndDate={props.startEndDate}
          setReloadKpi={props.setReloadKpi}
          isRedirectedFromDifferentPage={props?.isRedirectedFromDifferentPage}
        />
      </div>
    )
  );
};

const mapStateToProps = (store) => {
  return {
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
  };
};

const mapDispatchToProps = (dispatch) => ({
  deletePlans: (payload) => dispatch(deletePlans(payload)),
  setInventorysmartDeletePlanLoader: (payload) =>
    dispatch(setInventorysmartDeletePlanLoader(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  resetOrderRepositoryState: (payload) =>
    dispatch(resetOrderRepositoryState(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(ApprovedOrders);
