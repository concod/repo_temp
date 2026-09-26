import React, { useState } from "react";
import { connect } from "react-redux";
import { Modal } from "impact-ui-v3";
import Form from "core/Utils/form";
import { addSnack } from "core/actions/snackbarActions";
import { UPDATED_MESSAGE, ERROR_MESSAGE } from "modules/oms/constants-oms/stringConstants";
import { postOffCycleSetAllInfo } from "modules/oms/services-oms/Create-New-Order/off-cycle-order-service";
import { isEmpty } from "lodash";


const OffCycleSetAllPopUp = (props) => {
  const [formData, setFormData] = useState({
    roq_selection_type: "roq_source",
    distribute_values: "copy_all",
    set_all_on: null,
    roq_value: null,
    user_adjusted_delivery_date: null,
  });
  const [isLoading, setIsLoading] = useState(false);

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
    // Get selected nodes from AG Grid
    let l_selectedNodes = props.agGridInstance.api.getSelectedNodes();
    let selections = l_selectedNodes?.filter((val) => val.displayed);

    // Check if any products are selected
    if (selections.length === 0) {
      displaySnackMessages("Please select at least one product", "error");
      return;
    }

    // Validate based on ROQ selection type
    const roqType = formData.roq_selection_type || "roq_source";
    
    if (roqType === "roq_source") {
      if (!formData.set_all_on) {
        displaySnackMessages("Please select a ROQ source", "error");
        return;
      }
    } else if (roqType === "enter_roq_value") {
      if (!formData.roq_value || formData.roq_value <= 0) {
        displaySnackMessages("Please enter a valid ROQ value", "error");
        return;
      }
      if (!formData.distribute_values) {
        displaySnackMessages("Please select a distribution method", "error");
        return;
      }
    }

    let selected_articles = [];
    selections.forEach((row) => {
      const selected = row.data;
      selected_articles.push(selected);
    });

    const checkConfig = props.getCheckConfigurationForProductDetails
      ? props.getCheckConfigurationForProductDetails()
      : {};

    const appliedFilters = props.deepDiveFilters || [];
    const appliedDateFilters = [];
    
    // Adding the OMS Date filters to the filters
    if (!isEmpty(props?.ropDate)) {
      appliedDateFilters.push(props?.ropDate);
    }
    if (!isEmpty(props?.recommRecieptDate)) {
      appliedDateFilters.push(props?.recommRecieptDate);
    }
    // Adding the Deep Dive Date filters to the filters
    if (props?.weekRange?.attribute_name) {
      appliedDateFilters.push(props?.weekRange);
    }

    let payload = {
      draft_id: props.draftId,
      filters: appliedFilters,
      roq_selection_type: roqType,
      selected_articles: selected_articles,
      ...checkConfig,
    };
    
    // Add date_filter if appliedDateFilters is present
    if (appliedDateFilters.length > 0) {
      payload.date_filter = appliedDateFilters;
    }
    
    // passing article clicked in product details table in dc size level set all
    if(props?.selectedProductDetails) {
      payload.selected_product_details = props?.selectedProductDetails;
    }
    // Add optional fields
    if (formData.user_adjusted_delivery_date) {
      payload.user_adjusted_delivery_date = formData.user_adjusted_delivery_date;
    }

    // Add fields based on selection type
    if (roqType === "roq_source") {
      payload.set_all_on = formData.set_all_on;
    } else if (roqType === "enter_roq_value") {
      payload.roq_value = formData.roq_value;
      payload.distribute_values = formData.distribute_values || "copy_all";
    }

    try {
      setIsLoading(true);
      const response = await props.postOffCycleSetAllInfo(payload);

      if (response.data.status) {
        displaySnackMessages(UPDATED_MESSAGE, "success");
        props.refreshTableData();
        props.setShowSetAllModal(false);
        // Notify parent to reload other components
        if (props.onSaveSuccess) {
          props.onSaveSuccess();
        }
      } else {
        displaySnackMessages(response.data.message || ERROR_MESSAGE, "error");
      }
    } catch (error) {
      console.error("Error in Set All operation:", error);
      displaySnackMessages(ERROR_MESSAGE, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (data) => {
    setFormData(data);
  };

  const findFieldByAccessor = (accessor) => {
    return props.STORE_SETALL_FIELDS?.find(field => field.accessor === accessor);
  };

  /**
   * Build fields array dynamically based on what's available
   * This handles both Product Details (with date) and Article DC/Size (without date)
   */
  const buildFieldsArray = () => {
    const fields = [];

    // 1. Date field (optional - only in product details)
    const dateField = findFieldByAccessor("user_adjusted_delivery_date");
    if (dateField) {
      fields.push(dateField);
    }

    // 2. Radio buttons for ROQ selection type (always present)
    const roqSelectionTypeField = findFieldByAccessor("roq_selection_type");
    if (roqSelectionTypeField) {
      fields.push(roqSelectionTypeField);
    }

    // 3. Conditional fields based on radio selection
    if (formData.roq_selection_type === "roq_source") {
      const setAllOnField = findFieldByAccessor("set_all_on");
      if (setAllOnField) {
        fields.push(setAllOnField);
      }
    } else {
      const roqValueField = findFieldByAccessor("roq_value");
      const distributeValuesField = findFieldByAccessor("distribute_values");
      
      if (roqValueField) {
        fields.push(roqValueField);
      }
      if (distributeValuesField) {
        fields.push(distributeValuesField);
      }
    }

    return fields;
  };

  return (
    <Modal
      title="Set All"
      size="medium"
      height="500px"
      width="500px"
      aria-labelledby="off-cycle-setall-dialog"
      open={true}
      onClose={() => onCancel()}
      footerButtons={[
        {
          label: "Cancel",
          onClick: () => {
            onCancel();
          },
          variant: "url",
          disabled: isLoading,
        },
        {
          label: "Apply",
          onClick: () => {
            onApply();
          },
          variant: "primary",
          disabled: isLoading,
        },
      ]}
      primaryButtonLabel="Apply"
      secondaryButtonLabel="Cancel"
      primaryButtonProps={{
        disabled: isLoading,
      }}
      secondaryButtonProps={{
        disabled: isLoading,
      }}
      onPrimaryButtonClick={() => {
        if (!isLoading) {
          onApply();
        }
      }}
      onSecondaryButtonClick={() => {
        onCancel();
      }}
    >
      <div>
        <Form
          maxFieldsInRow={1}
          layout={"vertical"}
          fields={buildFieldsArray()}
          handleChange={handleChange}
          updateDefaultValue={true}
          defaultValues={{
            roq_selection_type: "roq_source",
            distribute_values: "copy_all",
          }}
          noPortal={false}
        ></Form>
      </div>
    </Modal>
  );
};

const mapStateToProps = (store) => {
  return {
    recommRecieptDate:
      store.omsReducer.offCycleOrderService.offCycleOrderRecommRecieptDate,
    ropDate: store.omsReducer.offCycleOrderService.offCycleOrderRopDate,
  };
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (payload) => dispatch(addSnack(payload)),
  postOffCycleSetAllInfo: (payload) => dispatch(postOffCycleSetAllInfo(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(OffCycleSetAllPopUp);

