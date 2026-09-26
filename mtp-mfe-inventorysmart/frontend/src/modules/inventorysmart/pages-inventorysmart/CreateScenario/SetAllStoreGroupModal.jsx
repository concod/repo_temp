import { Modal, Input } from "impact-ui-v3";
import makeStyles from "@mui/styles/makeStyles";
import { useState } from "react";
import { fetchDynamicConfigFromTenantReducer } from "core/Utils/DynamicLabels";

const useStyles = makeStyles({
  setAllModalContent: {
    display: "flex",
    gap: "1rem",
  },
});

export function SetAllStoreGroupModal({
  showSetAllModal,
  setShowSetAllModal,
  handleSetAllApply,
}) {
  const classes = useStyles();
  const wosLabel =
    fetchDynamicConfigFromTenantReducer("inventorysmart", "dynamicLabels")
      ?.wos || "WOS";
  const [modalFormData, setModalFormData] = useState({
    min: "",
    max: "",
    wos: "",
  });

  const handleCloseModal = () => {
    setShowSetAllModal(false);
  };

  const handleApplySetAll = () => {
    handleSetAllApply(modalFormData);
  };

  const handleInputChange = (e) => {
    var value =
      e.target.value === ""
        ? ""
        : isNaN(parseInt(e.target.value))
        ? ""
        : parseInt(e.target.value);
    setModalFormData({
      ...modalFormData,
      [e.target.name]: value,
    });
  };

  return (
    <Modal
      open={showSetAllModal}
      onClose={handleCloseModal}
      size="medium"
      title="Set All"
      disableEscapeKeyDown={true}
      disableBackdropClick={false}
      primaryButtonLabel={"Apply"}
      primaryButtonProps={{
        onClick: handleApplySetAll,
        disabled:
          modalFormData.min === "" &&
          modalFormData.max === "" &&
          modalFormData.wos === "",
      }}
      secondaryButtonLabel={"Cancel"}
      secondaryButtonProps={{ onClick: handleCloseModal }}
    >
      <div className={classes.setAllModalContent}>
        <Input
          label="Avg. Min"
          name="min"
          type="number"
          value={modalFormData.min}
          onChange={handleInputChange}
          placeholder="Enter value"
        />
        <Input
          label="Avg. Max"
          name="max"
          type="number"
          value={modalFormData.max}
          onChange={handleInputChange}
          placeholder="Enter value"
        />
        <Input
          label={`Avg. ${wosLabel}`}
          name="wos"
          type="number"
          value={modalFormData.wos}
          onChange={handleInputChange}
          placeholder="Enter value"
        />
      </div>
    </Modal>
  );
}
