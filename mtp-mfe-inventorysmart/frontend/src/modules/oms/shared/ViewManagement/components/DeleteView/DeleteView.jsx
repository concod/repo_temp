import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { Prompt } from "impact-ui-v3";
import { useDispatch } from "react-redux";
import { DELETE_VIEW } from "./deleteView.constant";
import { deleteViewApi } from "../../api/deleteView.api";

const DeleteView = ({
  isDeleteModalOpen,
  setIsDeleteModalOpen,
  viewId,
  screenId
}) => {
  const dispatch = useDispatch();
  const [isDeleting, setIsDeleting] = useState(false);

  // Reset the in-flight guard whenever the modal is closed/reopened so the
  // button is enabled for the next deletion.
  useEffect(() => {
    if (!isDeleteModalOpen) {
      setIsDeleting(false);
    }
  }, [isDeleteModalOpen]);

  const handleDelete = () => {
    if (isDeleting) return;
    setIsDeleting(true);
    dispatch(deleteViewApi(viewId, setIsDeleteModalOpen, screenId));
  };

  const handleClose = () => {
    if (isDeleting) return;
    setIsDeleteModalOpen(false);
  };

  return (
    <Prompt
      isOpen={isDeleteModalOpen}
      title={DELETE_VIEW.TITLE}
      variant={DELETE_VIEW.VARIANT}
      primaryButtonLabel={DELETE_VIEW.PRIMARY_BUTTON_LABEL}
      secondaryButtonLabel={DELETE_VIEW.SECONDARY_BUTTON_LABEL}
      onPrimaryButtonClick={handleDelete}
      onSecondaryButtonClick={handleClose}
      handleClose={handleClose}
      primaryButtonProps={{ disabled: isDeleting }}
      secondaryButtonProps={{ disabled: isDeleting }}
    >
      {DELETE_VIEW.CONTENT}
    </Prompt>
  );
};

DeleteView.propTypes = {
  isDeleteModalOpen: PropTypes.bool.isRequired,
  setIsDeleteModalOpen: PropTypes.func.isRequired,
  viewId: PropTypes.number,
  screenId: PropTypes.number
};

export default DeleteView;
