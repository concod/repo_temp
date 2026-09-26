import { Modal as ImpactModal } from "impact-ui";

const Modal = (props) => {
  const {
    size,
    heading,
    isOpen,
    onClose,
    primaryButtonProps,
    tertiaryButtonProps,
    children,
    ...otherProps
  } = props;
  return (
    <ImpactModal
      size={size}
      heading={heading}
      isOpen={isOpen}
      onClose={onClose}
      primaryButtonProps={primaryButtonProps}
      tertiaryButtonProps={tertiaryButtonProps}
      {...otherProps}
    >
      {children}
    </ImpactModal>
  );
};

export default Modal;
