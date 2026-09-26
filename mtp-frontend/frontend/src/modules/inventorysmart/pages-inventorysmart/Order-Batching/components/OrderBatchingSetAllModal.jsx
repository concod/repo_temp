import { useMemo, useState } from "react";
import makeStyles from "@mui/styles/makeStyles";
import Loader from "core/Utils/Loader/loader";
import Form from "core/Utils/form";
import ConfirmPrompt from "core/commonComponents/confirmPrompt";
import { isEmpty } from "lodash";
import {
  DIALOG_APPLY_BTN_TEXT,
  DIALOG_CANCEL_BTN_TEXT,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";

const useStyles = makeStyles(() => ({
  root: {
    "& .MuiDialog-paperWidthSm": {
      maxWidth: "80rem",
      borderRadius: "0.6rem",
    },
  },
  contentBody: {
    minHeight: "20rem",
  },
}));

const OrderBatchingSetAllModal = ({
  showSetAllModal,
  orderTypeOptions,
  setShowSetAllModal,
  agGridInstance,
}) => {
  const [formData, setFormData] = useState({});
  const [flagEdit, setFlagEdit] = useState(false);
  const [setAllLoader, setSetAllLoader] = useState(false);
  const classes = useStyles();

  const ORDER_BATCHING_SET_ALL_FIELDS = useMemo(
    () => [
      {
        label: "Delivery Date",
        is_disabled: false,
        accessor: "delivery_dt",
        field_type: "DateTimeField",
        disablePast: true,
        isMulti: false,
      },
      {
        label: "Order Type",
        is_disabled: false,
        accessor: "order_type",
        field_type: "dropdown",
        options: orderTypeOptions,
        isMulti: false,
      },
    ],
    []
  );

  const handleChange = (data) => {
    // this has to be handled in form/index.js in future
    setFormData(data);
    if (!flagEdit) {
      setFlagEdit(true);
    }
  };

  const onApply = async () => {
    setSetAllLoader(true);
    let newDeliveryDate = !isEmpty(formData.delivery_dt);
    let newOrderType = !isEmpty(formData.order_type);

    let shouldSetAll = newDeliveryDate || newOrderType;
    let itemsToUpdate = [];

    let selections = agGridInstance.api.getSelectedNodes();

    if (shouldSetAll) {
      selections.forEach((row) => {
        const selected = row.data;

        newDeliveryDate && (selected.delivery_dt = formData.delivery_dt);
        newOrderType &&
          (selected.order_type = {
            label: formData.order_type,
            value: formData.order_type,
          });

        itemsToUpdate.push(selected);
      });

      await agGridInstance.api.refreshCells({ update: itemsToUpdate });
    }
    setSetAllLoader(true);
    setShowSetAllModal(false);
  };

  return (
    <>
      <ConfirmPrompt
        showModal={showSetAllModal}
        title="Set All"
        message=""
        ariaLabeledBy="confirm-delete-dialog-set-all"
        primaryBtnText={DIALOG_APPLY_BTN_TEXT}
        secondaryBtnText={DIALOG_CANCEL_BTN_TEXT}
        showCloseIcon={true}
        setConfirm={setShowSetAllModal}
        size={"md"}
        confirmCallback={(val) => {
          if (val) {
            onApply();
          }
        }}
      >
        <Loader loader={setAllLoader}>
          <div className={classes.contentBody}>
            <Form
              maxFieldsInRow={3}
              layout={"vertical"}
              handleChange={handleChange}
              fields={ORDER_BATCHING_SET_ALL_FIELDS}
              updateDefaultValue={true}
              defaultValues={{}}
            ></Form>
          </div>
        </Loader>
      </ConfirmPrompt>
    </>
  );
};

export default OrderBatchingSetAllModal;
