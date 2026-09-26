import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
} from "@mui/material";
import { Button } from "impact-ui-v3";
import { makeStyles } from "@mui/styles";
import React, { forwardRef, useState } from "react";
import CloseIcon from "@mui/icons-material/Close";
import Form from "core/Utils/form";
import { useDispatch } from "react-redux";
import { addSnack } from "core/actions/snackbarActions";

const DiallogUpdateValue = (props, ref) => {
  const {
    showDialog,
    onClose,
    currentWeek,
    selected,
    onDriverForecastValueChange,
    setShowDialog,
  } = props;

  const { allDriverForecastRef } = ref;
  const classes = useStyles();
  const [value, setValue] = useState("");
  const dispatch = useDispatch();

  const handleChange = (updatedFormData) => {
    setValue(updatedFormData.value);
  };

  const onApply = async () => {
    if (!value) {
      return dispatch(
        addSnack({
          message: `Please enter a value`,
          options: {
            variant: "info",
          },
        })
      );
    }
    setShowDialog({ isOpen: false, currentWeek: null, selected: null });

    await onDriverForecastValueChange(+value, currentWeek, selected);
    onClose(true, currentWeek);
    setValue("");
  };

  const handleMaxAllowed = () => {
    let minRowData = allDriverForecastRef.current.api.getRowNode("price_point")
      ?.data?.min_price;

    if (currentWeek !== "overall_value") {
      let minColData = minRowData?.[currentWeek];
      return minColData;
    } else {
      let minPP = Number.POSITIVE_INFINITY;
      for (let [_, value] of Object.entries(minRowData || {})) {
        if (minPP > value) {
          minPP = value;
        }
      }
      return minPP;
    }
  };

  return (
    <Dialog
      className={classes.root}
      aria-labelledby="customized-dialog-title"
      open={showDialog}
      disableEscapeKeyDown={true}
    >
      <DialogTitle id="customized-dialog-title">
        <Grid
          container
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <p style={{ opacity: selected?.label ? 1 : 0 }}>
            {selected?.label ? `Enter value for ${selected?.label}` : " "}
          </p>
          <IconButton aria-label="close" onClick={() => onClose()} size="large">
            <CloseIcon />
          </IconButton>
        </Grid>
      </DialogTitle>
      <DialogContent>
        <Form
          layout={"vertical"}
          updateDefaultValue={true}
          maxFieldsInRow={3}
          handleChange={handleChange}
          fields={[
            {
              label: "Enter value",
              field_type: "TextField",
              required: true,
              accessor: "value",
              is_clearable: true,
            },
          ]}
          defaultValues={{}}
        />
        {selected?.value === "price_point" && (
          <p className={classes.minAllowedValue}>
            Maximum Allowed Value : {handleMaxAllowed()}
          </p>
        )}
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => {
            onClose();
          }}
          id="createStoreCancelBtn"
          variant="primary"
        >
          Cancel
        </Button>
        <Button variant="primary" id="createStoreApplyBtn" onClick={onApply}>
          Apply
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default forwardRef(DiallogUpdateValue);

const useStyles = makeStyles((theme) => ({
  root: {
    "& .MuiDialog-paperWidthSm": {
      width: "21rem",
      borderRadius: "0.6rem",
    },
  },
  minAllowedValue: {
    marginTop: "0.3rem",
    fontSize: "0.85rem",
  },
}));
