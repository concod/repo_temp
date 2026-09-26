import { Prompt } from "impact-ui-v3";

const DeleteConfirmModal = (props) => {
  const { open, onConfirm, onCancel } = props;

  return (
    <Prompt
      isOpen={open}
      handleClose={onCancel}
      onPrimaryButtonClick={onConfirm}
      onSecondaryButtonClick={onCancel}
      variant="error"
      title="Delete chat"
      primaryButtonLabel="Delete"
      secondaryButtonLabel="Cancel"
      primaryButtonProps={{ type: "destructive" }}
    >
      Are you sure you want to delete this chat? This action cannot be undone.
    </Prompt>
  );
};

export default DeleteConfirmModal;
