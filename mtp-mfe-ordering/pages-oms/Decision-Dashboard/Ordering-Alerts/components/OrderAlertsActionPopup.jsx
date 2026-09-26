import React from "react";
import { connect } from "react-redux";
import AgGridComponent from "core/Utils/agGrid";
import Loader from "core/Utils/Loader/loader";
import { BottomSheet } from "impact-ui-v3";

const OrderAlertsActionPopup = (props) => {
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
                columns={props.tableConfig}
                rowdata={props.tableData}
                selectAllHeaderComponent={false}
                uniqueRowId={"unique_id"}
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
