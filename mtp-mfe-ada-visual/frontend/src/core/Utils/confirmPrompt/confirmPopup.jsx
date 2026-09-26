import { Prompt } from "impact-ui-v3";

const CreateTicket = (props) => {
  return (
    <>
      <Prompt
        isOpen={true}
        title={props.title ? props.title : "Unsaved Changes"}
        children={
          props.text
            ? props.text
            : "All input data will be lost. Do you really want to leave without saving"
        }
        infoList={[]}
        primaryButtonLabel="Confirm"
        secondaryButtonLabel="< Go Back"
        onPrimaryButtonClick={() => {
          props.onConfirm();
          props.onClose();
        }}
        onSecondaryButtonClick={() => props.onClose()}
        variant="warning"
      />
    </>
  );
};

export default CreateTicket;
