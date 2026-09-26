import React, { useState, useEffect } from 'react';
import { TextInput } from '../Input';
import { PrimaryLargeButton, TertiaryLargeButton } from '../Button';
import { Dropdown } from '../Dropdown';
import type { DropdownOption } from '../Dropdown/Dropdown';

export interface UserData {
  name: string;
  email: string;
  role: 'user' | 'admin';
}

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: UserData) => void;
  onCancel: () => void;
  initialData?: Partial<UserData>;
  isLoading?: boolean;
  isEditing?: boolean;
}

const UserModal: React.FC<UserModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onCancel,
  initialData,
  isLoading = false,
  isEditing = false
}) => {
  // Form state
  const [formData, setFormData] = useState<UserData>({
    name: initialData?.name || '',
    email: initialData?.email || '',
    role: initialData?.role || 'user',
  });

  // Role options for dropdown
  const roleOptions: DropdownOption[] = [
    { value: 'user', label: 'User' },
    { value: 'admin', label: 'Admin' }
  ];

  // Reinitialize form data when initialData changes
  useEffect(() => {
    setFormData({
      name: initialData?.name || '',
      email: initialData?.email || '',
      role: initialData?.role || 'user',
    });
  }, [initialData]);

  // Reset form to initial state
  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      role: 'user',
    });
  };

  // Handle form field changes
  const handleFieldChange = (field: keyof UserData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle role dropdown change
  const handleRoleChange = (value: string | number) => {
    setFormData(prev => ({
      ...prev,
      role: value as 'user' | 'admin'
    }));
  };

  // Validation function
  const isFormValid = (): boolean => {
    return !!(
      formData.name?.trim() &&
      formData.email?.trim() &&
      formData.role &&
      isValidEmail(formData.email)
    );
  };

  // Email validation helper
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Handle save
  const handleSave = () => {
    if (!isFormValid()) {
      console.log('Form validation failed - cannot submit');
      return;
    }

    const dataToSave: UserData = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      role: formData.role,
    };

    console.log('Sending user data:', dataToSave);
    onSave(dataToSave);
    
    // Clear form after save
    resetForm();
  };

  // Handle overlay click to close
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      resetForm();
      onClose();
    }
  };

  // Handle close button click
  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Handle cancel button click
  const handleCancel = () => {
    resetForm();
    onCancel();
  };

  if (!isOpen) return null;

  return (
    <div className="data-connector-modal-overlay" onClick={handleOverlayClick}>
      <div className="data-connector-modal">
        {/* Header */}
        <div className="data-connector-modal__header">
          <div className="data-connector-modal__title">
            <span className="headline-5">
              {isEditing ? 'Edit User' : 'Invite User'}
            </span>
          </div>
          <button className="data-connector-modal__close" onClick={handleClose}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6L18 18" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Form Content */}
        <div className="data-connector-modal__content">
          <div className="data-connector-modal__form">
            {/* Row 1: Name (full width) */}
            <div className="form-row single-field">
              <div className="form-field">
                <TextInput
                  label="Name"
                  placeholder="Enter user's full name"
                  value={formData.name}
                  onChange={(value) => handleFieldChange('name', value)}
                  required
                />
              </div>
            </div>

            {/* Row 2: Email (full width) */}
            <div className="form-row single-field">
              <div className="form-field">
                <TextInput
                  label="Email"
                  type="email"
                  placeholder="Enter user's email address"
                  value={formData.email}
                  onChange={(value) => handleFieldChange('email', value)}
                  required
                />
              </div>
            </div>

            {/* Row 3: Role (full width) */}
            <div className="form-row single-field">
              <div className="form-field">
                <Dropdown
                  label="Role"
                  placeholder="Select user role"
                  value={formData.role}
                  options={roleOptions}
                  onChange={handleRoleChange}
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="data-connector-modal__footer">
          <div className="footer-left">
            <TertiaryLargeButton onClick={handleCancel} disabled={isLoading}>
              Cancel
            </TertiaryLargeButton>
          </div>
          <div className="footer-right">
            <PrimaryLargeButton 
              onClick={handleSave} 
              disabled={isLoading || !isFormValid()}
            >
              {isLoading ? 'Saving...' : (isEditing ? 'Save Changes' : 'Send Invitation')}
            </PrimaryLargeButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserModal;
