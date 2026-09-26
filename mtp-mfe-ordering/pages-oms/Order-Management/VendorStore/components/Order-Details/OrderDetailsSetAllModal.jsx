import React, { useMemo, useState } from "react";
import { Modal } from "impact-ui-v3";
import Form from "core/Utils/form";

const OrderDetailsSetAllModal = ({
  setShowSetAllModal,
  selectedRows,
  fieldsData,
  SetAllData,
  displaySnackMessages,
  vendorToStoreScreenConfig,
}) => {
  const [formData, setFormData] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  
  // Check if ROQ Source is selected to enable/disable Apply button
  const isApplyEnabled = formData.roq_source && formData.roq_source.trim() !== "" && !isLoading;

  // Get ROQ Source options from config or use fallback
  const roqSourceOptions = useMemo(() => {
    return vendorToStoreScreenConfig?.order_details?.set_all_roq_source || [
      {
        "label": "Base ROQ",
        "value": "raw_roq"
      },
      {
        "label": "Vendor MOQ Optimized ROQ",
        "value": "roq_unconstrained"
      },
      {
        "label": "Constrained ROQ",
        "value": "roq_constrained"
      }
    ]
  }, [vendorToStoreScreenConfig?.order_details?.set_all_roq_source]);

  // Set All fields configuration
  const ORDER_DETAILS_SETALL_FIELDS = useMemo(
    () => [
      {
        accessor: "roq_source",
        field_type: "list",
        options: roqSourceOptions,
        required: true,
        label: "ROQ Source",
      },
    ],
    [roqSourceOptions]
  );

  const handleChange = (data) => {

    setFormData(data);
  };

  const onCancel = () => {
    setShowSetAllModal(false);
  };

  const onApply = async () => {
    if (!formData.roq_source) {
      return displaySnackMessages(
        "Please select a ROQ Source!",
        "info"
      );
    }
    setIsLoading(true);

    // Extract order group IDs from selected rows
    const selectedOrderGroupIds = selectedRows.map((row) => row.order_group_id);

    // Create form data structure similar to leadTime.jsx setAllData format
    let setAllFormData = {
      roq_source: formData?.roq_source,
      order_group_ids: selectedOrderGroupIds,
    };

    try {
      let response = await SetAllData(setAllFormData);
      if (response) {
        setShowSetAllModal(false);
      }
    } catch (error) {
      console.error("Set All operation failed:", error);
      displaySnackMessages("Set All operation failed", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      onClose={() => onCancel()}
      title="Set All"
      size="medium"
      height="420px"
      width="600px"
      aria-labelledby="order-details-roq-set-all"
      open={true}
      footerButtons={[
        {
          label: "Cancel",
          onClick: () => {
            onCancel();
          },
          variant: "url",
        },
        {
          label: "Apply",
          onClick: () => {
            onApply();
          },
          variant: "contained",
        },
      ]}
      primaryButtonLabel="Apply"
      secondaryButtonLabel="Cancel"
      primaryButtonProps={{
        disabled: !isApplyEnabled,
      }}
      onPrimaryButtonClick={() => {
        if (isApplyEnabled) {
          onApply();
        }
      }}
      onSecondaryButtonClick={() => {
        onCancel();
      }}
    >
      <div style={{ padding: "20px 0" }}>
        <Form
          maxFieldsInRow={1}
          layout={"vertical"}
          handleChange={handleChange}
          fields={ORDER_DETAILS_SETALL_FIELDS}
          updateDefaultValue={true}
          defaultValues={{}}
        />
      </div>
    </Modal>
  );
};

export default OrderDetailsSetAllModal;
