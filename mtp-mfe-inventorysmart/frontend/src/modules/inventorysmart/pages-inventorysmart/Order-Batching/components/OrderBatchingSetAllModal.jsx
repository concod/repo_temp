import { useMemo, useState } from "react";
import makeStyles from "@mui/styles/makeStyles";
import { Modal } from "impact-ui-v3";
import Loader from "core/Utils/Loader/loader";
import Form from "core/Utils/form";
import { DialogContent } from "@mui/material";
import { isEmpty } from "lodash";
import {
  DIALOG_APPLY_BTN_TEXT,
  DIALOG_CANCEL_BTN_TEXT,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";

const useStyles = makeStyles(() => ({
  contentBody: {
    minHeight: "20rem",
  },
}));

const OrderBatchingSetAllModal = ({
  showSetAllModal,
  orderTypeOptions,
  setShowSetAllModal,
  agGridInstance,
  setUpdatedRowEdits,
  applySetAll,
  upatedRowEditInstance,
  setAllFields,
  setAllFieldsLabels
}) => {
  const [formData, setFormData] = useState({});
  const [flagEdit, setFlagEdit] = useState(false);
  const [setAllLoader, setSetAllLoader] = useState(false);
  const DELIVERY_DATE_LABEL = "Delivery Date";
  const START_SHIP_DATE = "Start Ship Date";
  const ORDER_TYPE_LABEL = "Order Type";
  const ORDER_PRIORITY_LABEL = "Order Priority";
  const classes = useStyles();

  const ORDER_BATCHING_SET_ALL_FIELDS = useMemo(() => {
    let allFields = [
      {
        label: setAllFieldsLabels ? setAllFieldsLabels["delivery_dt"]  : START_SHIP_DATE,
        is_disabled: false,
        accessor: "delivery_dt",
        field_type: "DateTimeField",
        disablePast: true,
        isMulti: false,
      },
      {
        label: setAllFieldsLabels ? setAllFieldsLabels["order_priority"]  :ORDER_PRIORITY_LABEL,
        is_disabled: false,
        accessor: "order_priority",
        field_type: "dropdown",
        options: orderTypeOptions,
        isMulti: false,
      },
    ];
    if (setAllFields?.length) {
      allFields = allFields.filter((field) =>
        setAllFields.includes(field.accessor)
      );
    }
    return allFields;
  }, [setAllFields]);

  const handleChange = (data) => {
    // this has to be handled in form/index.js in future
    setFormData(data);
    if (!flagEdit) {
      setFlagEdit(true);
    }
  };

  const onApply = async () => {
    // if the user has done row edits and then clicks on set all, discard row edits and disable the save edits button
    setUpdatedRowEdits([]);
    upatedRowEditInstance.current = [];
    setSetAllLoader(true);
    let newDeliveryDate = !isEmpty(formData.delivery_dt);
    let newOrderType = !isEmpty(formData.order_priority);

    let shouldSetAll = newDeliveryDate || newOrderType;
    if (shouldSetAll) {
      try {
        let savedSucess = await applySetAll(formData);
        if (savedSucess) {
          setShowSetAllModal(false);
          setSetAllLoader(false);
        } else {
          setSetAllLoader(false);
        }
      } catch (err) {
        setSetAllLoader(false);
      }
    }
  };

  const onClose = () => {
    setShowSetAllModal(false);
    setSetAllLoader(false);
  };

  return (
    <>
      <Modal
        title="Set All"
        size="medium"
        onClose={onClose}
        aria-labelledby="customized-dialog-title"
        open={showSetAllModal}
        fullWidth={true}
        disableEscapeKeyDown={true}
        disableBackdropClick={false}
        primaryButtonLabel={DIALOG_APPLY_BTN_TEXT}
        primaryButtonProps={{ onClick: onApply, disabled:isEmpty(formData) }}
        secondaryButtonLabel={DIALOG_CANCEL_BTN_TEXT}
        secondaryButtonProps={{ onClick: onClose }}
      >
        <DialogContent>
          <Loader loader={setAllLoader}>
            <div className={classes.contentBody}>
              <Form
                maxFieldsInRow={3}
                layout={"vertical"}
                handleChange={handleChange}
                fields={ORDER_BATCHING_SET_ALL_FIELDS}
                updateDefaultValue={true}
                defaultValues={{}}
                withPortal={true}
              ></Form>
            </div>
          </Loader>
        </DialogContent>
      </Modal>
    </>
  );
};

export default OrderBatchingSetAllModal;
