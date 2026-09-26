import { Prompt } from "impact-ui";

const CreateTicket = (props) => {
  return (
    <>
      <Prompt
        isOpen={true}
        title={props.title ? props.title : "Unsaved Changes"}
        subHeading={
          props.text
            ? props.text
            : "All input data will be lost. Do you really want to leave without saving"
        }
        infoList={[]}
        primaryButtonProps={{
          children: "Confirm", onClick: () => {
            props.onConfirm();
            props.onClose()
          }
        }}
        tertiaryButtonProps={{
          children: "< Go Back",
          onClick: () => props.onClose(),
        }}
        variant="warning"
      />
    </>
  );
};

export default CreateTicket;
