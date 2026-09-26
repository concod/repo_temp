import React from 'react';
import deleteIcon from "../../assets/images/delete-modal.svg";
import { PrimaryLargeButton, TertiaryLargeButton } from '../Button';
interface DeleteModalProps {
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  itemName?: string;
  itemType?: string;
  isDeleting?: boolean;
}

const DeleteModal: React.FC<DeleteModalProps> = ({ 
  onClose, 
  onConfirm, 
  title = "Delete, Are you sure?",
  itemName,
  itemType = "tool",
  isDeleting = false
}) => {
  const handleConfirm = () => {
    onConfirm();
  };

  const handleCancel = () => {
    onClose();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="delete-modal-overlay" onClick={handleOverlayClick}>
      <div className="delete-modal">
        {/* Close button */}
        <div className="delete-modal__close" onClick={onClose}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6L18 18" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        {/* Icon */}
        <div className="delete-modal__icon">
          <img src={deleteIcon} alt="delete" />
        </div>

        {/* Content */}
        <div className="delete-modal__content">
          <h2 className="delete-modal__title">{title}</h2>
          <p className="delete-modal__subtitle">
            Are you sure you want to delete the {itemName ? `"${itemName}"` : `the ${itemType}`}?
          </p>
          <p className="delete-modal__warning">
            It will be deleted permanently
          </p>
        </div>

        {/* Actions */}
        <div className="delete-modal__actions">
          <TertiaryLargeButton onClick={handleCancel} disabled={isDeleting} >Cancel</TertiaryLargeButton>
          <PrimaryLargeButton onClick={handleConfirm} disabled={isDeleting} >Delete</PrimaryLargeButton>
        </div>
      </div>
    </div>
  );
};

export default DeleteModal;
