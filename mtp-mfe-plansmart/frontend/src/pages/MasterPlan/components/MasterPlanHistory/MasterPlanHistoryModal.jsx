import { Modal } from "impact-ui-v3";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import LoadingOverlay from "core/Utils/Loader/loader";
import MasterPlanHistoryTable from "./MasterPlanHistoryTable";

import * as actions from "../../masterPlan.slice";
import { MASTER_PLAN_HISTORY } from "../../masterplan.constant";

const MasterPlanHistoryModal = ({
  historyColDefLoader,
  historyColDef,
  historyDataLoader,
  historyData,
  showHistoryModal,
  setShowHistoryModal
}) => {
  return (
    <Modal
      size="small"
      title="History"
      open={showHistoryModal}
      className="master-plan-history-modal"
      onClose={() => setShowHistoryModal(false)}
      primaryButtonLabel={MASTER_PLAN_HISTORY.BUTTON_CLOSE}
      onPrimaryButtonClick={() => setShowHistoryModal(false)}
    >
      <LoadingOverlay loader={historyColDefLoader || historyDataLoader}>
        <MasterPlanHistoryTable
          historyColDef={historyColDef}
          historyData={historyData}
        />
      </LoadingOverlay>
    </Modal>
  );
};

const mapStateToProps = (state) => ({
  historyColDefLoader: actions.masterPlanHistoryColDefLoaderSelector(state),
  historyColDef: actions.masterPlanHistoryColDefSelector(state),
  historyDataLoader: actions.masterPlanHistoryDataLoaderSelector(state),
  historyData: actions.masterPlanHistoryDataSelector(state)
});

MasterPlanHistoryModal.propTypes = {
  historyColDefLoader: PropTypes.bool,
  historyColDef: PropTypes.any,
  historyDataLoader: PropTypes.bool,
  historyData: PropTypes.any,
  showHistoryModal: PropTypes.bool,
  setShowHistoryModal: PropTypes.func
};

export default connect(mapStateToProps)(MasterPlanHistoryModal);
