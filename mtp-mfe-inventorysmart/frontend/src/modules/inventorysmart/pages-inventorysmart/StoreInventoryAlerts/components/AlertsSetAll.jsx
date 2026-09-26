import React from "react";

import {
  DialogContent,
} from "@mui/material";
import {Modal} from "impact-ui-v3"

import Form from "core/Utils/form";

import { UPDATE_MODAL_STOCK } from "../../../constants-inventorysmart/stringConstants";

const AlertsSetAll = (props) => {

  return (
    <Modal
      title = "Set All"
      size = "small"
      onClose={props.closeSetAllModal}
      aria-labelledby="customized-dialog-title"
      open={props?.showSetAllModal}
      fullWidth={true}
      disableEscapeKeyDown={true}
      disableBackdropClick={false}
      primaryButtonLabel = "Apply"
      primaryButtonProps = {{onClick:props.onApply}}
    >
      <DialogContent>
        <div>
          <Form
            maxFieldsInRow={1}
            layout={"horizontal"}
            handleChange={props.handleChange}
            fields={UPDATE_MODAL_STOCK}
            updateDefaultValue={false}
            defaultValues={props.modelStockData}
          ></Form>
        </div>
      </DialogContent>
    </Modal>
  );
};

export default AlertsSetAll;
