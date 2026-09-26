import React from "react";
import { Modal } from "impact-ui";
import { connect } from "react-redux";
import {
  budgetTableRowDataSelector,
  eohBohSyncSelector,
  isBohSyncRequiredSelector,
  openEohBohConfirmModalSelector,
  setOpenEohBohConfirmModal,
  syncEohBohLoaderSelector
} from "../../slice/planningScreen.slice";
import { CircularProgress } from "@mui/material";
import { syncEohBoh } from "../../apis/eohBohSync.api";

function EohBohSyncConfirmModal({
  isOpen,
  syncEohBohLoader,
  syncEohBohReq,
  setOpenEohBohModal
}) {
  const handleApplyButton = () => {
    syncEohBohReq();
  };
  const handleCancelButton = () => {
    if (!syncEohBohLoader) {
      setOpenEohBohModal(false);
    }
  };
  return (
    <Modal
      isOpen={isOpen}
      heading="Confirmation"
      primaryButtonProps={{
        children: syncEohBohLoader ? (
          <CircularProgress size={"1rem"} />
        ) : (
          "Apply"
        ),
        onClick: handleApplyButton,
        disabled: syncEohBohLoader
      }}
      tertiaryButtonProps={{
        children: "Cancel",
        onClick: handleCancelButton
      }}
      onClose={handleCancelButton}
    >
      EOH got changed, would you like to replace?
    </Modal>
  );
}

const mapState = (state) => {
  const syncEohBohLoader = syncEohBohLoaderSelector(state);
  const openEohBohConfirmModal = openEohBohConfirmModalSelector(state);
  const syncEnabled = eohBohSyncSelector(state);
  const isBohSyncRequired = isBohSyncRequiredSelector(state);
  const planRowData = budgetTableRowDataSelector(state);
  return {
    syncEohBohLoader,
    isOpen:
      openEohBohConfirmModal &&
      syncEnabled &&
      isBohSyncRequired &&
      planRowData?.length > 0
  };
};

const mapDispatch = (dispatch) => {
  return {
    syncEohBohReq: () => dispatch(syncEohBoh()),
    setOpenEohBohModal: (payload) =>
      dispatch(setOpenEohBohConfirmModal(payload))
  };
};

export default connect(mapState, mapDispatch)(EohBohSyncConfirmModal);
