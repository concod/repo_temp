import Form from "core/Utils/form";
import { useEffect, useMemo, useRef, useState } from "react";
import { isEmpty } from "lodash";
import { Modal } from "impact-ui-v3";
import { FILL_MANDATORY_FIELDS } from "modules/oms/constants-oms/stringConstants";

const SETALL_MAPPING = {
  scheduler: "scheduler",
};

const OrderPolicySetAllModal = ({
  setShowSetAllModal,
  rowsData,
  setAll,
  setCheckAllSetAllRequest,
  agGridInstance,
  scheduler,
  keyField = "article",
  displaySnackMessages,
  openLinkData
}) => {
  const [formData, setFormData] = useState({});
  const [flagEdit, setFlagEdit] = useState(false);
  const [schedulerOption, setSchedulerOption] = useState([]);
  var orderPolicySetAllPayload = useRef([]);

  useEffect(() => {
    if(openLinkData === "shipment_scheduler")
    {
      let shipmentScheduler = scheduler[rowsData[0].shipment_scheduler];
      let options = shipmentScheduler?.map((item) => ({
        label: item,
        value: item,
        id: item,
      }));
      setSchedulerOption(options);
    }
    else{
    let options = scheduler?.map((item) => ({
      label: item,
      value: item,
      id: item,
    }));
    setSchedulerOption(options);
  }
  }, [scheduler]);

  const STORE_SETALL_FIELDS = useMemo(
    () => [
      {
        label: "Scheduler",
        accessor: "scheduler",
        field_type: "list",
        options: schedulerOption,
        required: true,
      },
    ],
    [schedulerOption]
  );

  const getcheckAllSetAllReq = (p_data, p_mapping) => {
    let req = {};
    for (let i in p_mapping) {
      !isEmpty(p_data?.[i]) && (req[p_mapping[i]] = p_data[i]);
    }
    return req;
  };

  const handleChange = (data) => {
    setFormData(data);
    if (!flagEdit) {
      setFlagEdit(true);
    }

    const newSchedulerValue = data?.scheduler;
    const currentPayload = [];

    rowsData?.forEach((rowFromGrid) => {
      if(openLinkData === "shipment_scheduler")
      {
        const payloadEntry = {
          id: rowFromGrid.id,
          [keyField]: rowFromGrid[keyField],
          shipment_scheduler: newSchedulerValue,
        };
        currentPayload.push(payloadEntry);
      }
      else{
      const payloadEntry = {
        id: rowFromGrid.id,
        [keyField]: rowFromGrid[keyField],
        scheduler: newSchedulerValue,
      };  
      currentPayload.push(payloadEntry);
    }
    });

    orderPolicySetAllPayload.current = currentPayload;
  };

  const onCancel = () => {
    setShowSetAllModal(false);
  };

  const onApply = async () => {
    if (flagEdit) {
      let l_checkAllSetAllRequest = {
        searchColumns: agGridInstance.api.getFilterModel(),
        ...getcheckAllSetAllReq(formData, SETALL_MAPPING),
      };
      let data;
      if (
        agGridInstance.api.checkConfiguration[
          agGridInstance.api.checkConfiguration.length - 2
        ]
      ) {
        setCheckAllSetAllRequest((old) => {
          if (!isEmpty(old)) {
            data = [...old, l_checkAllSetAllRequest];
            return [...old, l_checkAllSetAllRequest];
          } else {
            data = [l_checkAllSetAllRequest];
            return [l_checkAllSetAllRequest];
          }
        });
      }
      let response = setAll(orderPolicySetAllPayload.current, data);
      if (response) {
        setShowSetAllModal(false);
        orderPolicySetAllPayload.current = [];
      }
    } else {
      displaySnackMessages(FILL_MANDATORY_FIELDS, "error");
    }
  };

  return (
    <Modal
      onClose={() => onCancel()}
      aria-labelledby="vendor-dc-set-scheduler"
      open={true}
      disableEscapeKeyDown={true}
      title="Set Scheduler"
      size="medium"
      height={openLinkData === "shipment_scheduler" ? "549px" : "360px"}
      width="600px"
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
      onPrimaryButtonClick={() => {
        onApply();
      }}
      onSecondaryButtonClick={() => {
        onCancel();
      }}
    >
      <div>
        <Form
          maxFieldsInRow={2}
          layout={"vertical"}
          handleChange={handleChange}
          fields={STORE_SETALL_FIELDS}
          updateDefaultValue={true}
          defaultValues={{}}
        ></Form>
      </div>
    </Modal>
  );
};

export default OrderPolicySetAllModal;
