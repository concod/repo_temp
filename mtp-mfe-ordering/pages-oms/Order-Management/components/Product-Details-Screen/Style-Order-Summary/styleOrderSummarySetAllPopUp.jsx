import { Panel } from "impact-ui-v3";
import Form from "core/Utils/form";
import { useState } from "react";
import globalStyles from "core/Styles/globalStyles";
import { addSnack } from "core/actions/snackbarActions";
import { connect } from "react-redux";
import { UPDATED_MESSAGE } from "modules/oms/constants-oms/stringConstants";
import { postSetAllInfo } from "modules/oms/services-oms/Order-Management/order-management-service";
import { ERROR_MESSAGE } from "modules/oms/constants-oms/stringConstants";

const styleOrderSummarySetAllPopUp = (props) => {
  const globalClasses = globalStyles();

  const [formData, setFormData] = useState({});

  const onCancel = () => {
    props.setShowSetAllModal(false);
  };

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const onApply = async () => {
    let l_selectedNodes = props.agGridInstance.api.getSelectedNodes();
    let selections = l_selectedNodes?.filter((val) => val.displayed);
    let selected_order_group_ids = [];

    let error = false;

    selections.forEach((row) => {
      const selected = row.data;
      if (formData.set_all_on?.length > 0) {
        selected_order_group_ids.push(selected.order_group_id);
      } else {
        error = true;
      }
    });

    if (error) {
      displaySnackMessages("Select valid values", "error");
      return;
    }

    let payload = {
      set_all_on: formData?.set_all_on,
      orders_list: selected_order_group_ids,
    };

    try {
      const response = await props.postSetAllInfo(payload);

      if (response.data.status) {
        displaySnackMessages(UPDATED_MESSAGE, "success");
        // Explicitly clear any existing selections before refreshing
        props.agGridInstance?.api?.deselectAll();
        // Also clear any persisted selection config so next page isn't auto-selected
        props.agGridInstance?.api?.setCheckConfiguration([]);
        if (props.agGridInstance?.api) {
          props.agGridInstance.api.isSelectAllRecords = false;
        }
        props.refreshTableData();
        props.setShowSetAllModal(false);
      }
    } catch (error) {
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };

  const handleChange = (data) => {
    setFormData(data);
  };

  return (
    <Panel
      title="Set All"
      width="600"
      aria-labelledby="customized-dialog-title"
      open={props.showSetAllModal}
      onClose={() => onCancel()}
      primaryButtonLabel="Apply"
      onPrimaryButtonClick={() => {
        onApply();
      }}
      secondaryButtonProps={{
        variant: "url",
      }}
      secondaryButtonLabel="Cancel"
      onSecondaryButtonClick={() => {
        onCancel();
      }}
    >
      <div>
        <Form
          maxFieldsInRow={2}
          layout={"vertical"}
          fields={props?.STORE_SETALL_FIELDS}
          handleChange={handleChange}
          updateDefaultValue={true}
          defaultValues={{}}
          labelWidthSpan={2}
          fieldTypeWidthSpan={2}
          noPortal={false}
        ></Form>
      </div>
    </Panel>
  );
};

const mapStateToProps = (store) => {
  return {};
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (payload) => dispatch(addSnack(payload)),
  postSetAllInfo: (payload) => dispatch(postSetAllInfo(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(styleOrderSummarySetAllPopUp);
