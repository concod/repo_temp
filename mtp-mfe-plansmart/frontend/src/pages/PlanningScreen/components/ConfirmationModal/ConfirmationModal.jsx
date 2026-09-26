import PropTypes from "prop-types";
import { Prompt } from "impact-ui";
const UpdatePlanConfirmationModal = ({
  showUpdatePlanAlert,
  onSubmit,
  onClose
}) => {
  return (
    <Prompt
      isOpen={showUpdatePlanAlert}
      title="Confirmation"
      subHeading={`Want to save the changes before continuing the action?`}
      variant="warning"
      primaryButtonProps={{
        children: "Yes",
        onClick: onSubmit
      }}
      tertiaryButtonProps={{
        children: "No",
        onClick: onClose
      }}
    />
  );
};

UpdatePlanConfirmationModal.propTypes = {
  onClose: PropTypes.func,
  onSubmit: PropTypes.func,
  showUpdatePlanAlert: PropTypes.bool
};

export default UpdatePlanConfirmationModal;
