import { useEffect, useMemo, useState } from "react";
import moment from "moment";
import Form from "core/Utils/form";
import EditModal from "./EditModal";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";

function SetAllForPriorityCode(props) {
  const { currentChannel } = props;
  const classes = useStyles();

  const getDefault = () => {
    const defaultCode =
      props.inventorysmartScreenConfig.priority_code_options?.default[
        currentChannel
      ];
    return defaultCode;
  };

  const [formData, setFormData] = useState({
    priority_code: getDefault(),
    shipping_date: moment(),
  });

  const getPrioRityCodeOptions = (config) => {
    return config?.options[currentChannel];
  };

  const PRODUCT_DETAILS_SET_ALL_FIELDS = useMemo(
    () => [
      {
        label: "Priority Code",
        accessor: "priority_code",
        field_type: "list",
        options: getPrioRityCodeOptions(
          props.inventorysmartScreenConfig.priority_code_options
        ),
      },
      {
        label: "InStore Date",
        accessor: "shipping_date",
        field_type: "DateTimeField",
        disablePast: true,
        value: moment(),
      },
    ],
    currentChannel
  );

  const onSaveHandler = () => {
    props.handleSave(formData);
  };

  const onCancel = () => {
    props.setShowSetAllPopUp(false);
  };

  const handleChange = (data) => {
    setFormData(data);
  };

  return (
    <>
      <EditModal
        onSaveHandler={onSaveHandler}
        onCancel={onCancel}
        saveButtonLabel={"Save"}
        heading="Set All"
      >
        <div className={classes.contentBody}>
          <Form
            maxFieldsInRow={3}
            layout={"vertical"}
            handleChange={handleChange}
            fields={PRODUCT_DETAILS_SET_ALL_FIELDS}
            updateDefaultValue={true}
            defaultValues={formData}
          ></Form>
        </div>
      </EditModal>
    </>
  );
}

export default SetAllForPriorityCode;
