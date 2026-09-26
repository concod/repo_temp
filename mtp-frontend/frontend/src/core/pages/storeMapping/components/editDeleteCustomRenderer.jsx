/**
 * Imports
 */
import { Grid, Modal, Box } from "@mui/material";
import { useState, useEffect } from "react";
import makeStyles from "@mui/styles/makeStyles";
import Form from "core/Utils/form";
import { connect } from "react-redux";
import { addSnack } from "core/actions/snackbarActions";
import { DEFAULT_DATE_FORMAT, END_DATE } from "config/constants";
import moment from "moment";
import { changeDateStringToOtherFormat } from "core/Utils/functions/utils";

const useStyles = makeStyles((theme) => ({
  modalStyle: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "27rem",
    background: theme.palette.common.white,
    padding: "1rem",
    borderRadius: theme.shape.borderRadius,

    "& .dropdown-label-padding": {
      flexGrow: 1,
      maxWidth: "unset",
    },
  },
}));
/**
 *
 * @param {any} props
 * @returns UI component for Edit, Delete and date picker component
 */
const TimeRangeRenderer = (props) => {
  const time_period_split_array = props.value.split("-");
  const [modalOpen, setModalOpen] = useState(false);
  const [startDate, setstartDate] = useState(
    time_period_split_array[0].trim() === "Invalid date"
      ? null
      : moment(props.value.split("-")[0], DEFAULT_DATE_FORMAT)
  );
  const [endDate, setendDate] = useState(
    time_period_split_array[1].trim() === "Invalid date"
      ? null
      : moment(props.value.split("-")[1], DEFAULT_DATE_FORMAT)
  );
  const [editDeleteFields, seteditDeleteFields] = useState([]);
  const classes = useStyles();

  useEffect(() => {
    seteditDeleteFields([
      {
        label: "",
        hideLabel: true,
        field_type: "rangePicker",
        accessor: "date_select",
        disableType: "disableOnlyPast",
        isDisabled: !props?.data?.isRowEditingEnabled,
      },
    ]);
    setModalOpen(Boolean(props?.data?.isRowEditingEnabled));
  }, [props?.data?.isRowEditingEnabled]);

  /**
   * @func
   * @desc Update component state on change of prop.value
   */
  useEffect(() => {
    setDates();
  }, [props.values]);

  const setDates = () => {
    const time_period = props.value.split("-");
    const startDateObj =
      time_period[0].trim() === "Invalid date"
        ? null
        : moment(props.value.split("-")[0], DEFAULT_DATE_FORMAT);
    const endDateObj =
      time_period[1].trim() === "Invalid date"
        ? null
        : moment(props.value.split("-")[1], DEFAULT_DATE_FORMAT);
    setstartDate(startDateObj);
    setendDate(endDateObj);
    return { startDate: startDateObj, endDate: endDateObj };
  };

  const onClose = (params) => {
    let updatedstartDate = params.startDate;
    let updatedendDate = params.endDate || endDate;
    if (updatedstartDate === null || !updatedstartDate?.isValid()) {
      props.addSnack({
        message: "start Date can't be empty",
        options: {
          variant: "error",
        },
      });
      return;
    }
    updatedstartDate = params.startDate.format(DEFAULT_DATE_FORMAT);
    if (updatedendDate === null || !params.endDate?.isValid()) {
      updatedendDate = changeDateStringToOtherFormat(
        END_DATE,
        "YYYY-MM-DD",
        DEFAULT_DATE_FORMAT
      );
    } else {
      updatedendDate = params.endDate.format(DEFAULT_DATE_FORMAT);
    }
    if (
      !moment(updatedstartDate).diff(moment(updatedendDate), "days")
    ) {
      props.addSnack({
        message: "Please select dates with atleast a day difference",
        options: {
          variant: "error",
        },
      });
      return;
    }
    props.node.data.isRowEditingEnabled = false;
    props.api.applyTransaction({
      update: [props.node.data],
    });
    props.node.setDataValue(
      "time_period",
      `${updatedstartDate} - ${updatedendDate}`
    );
    setModalOpen(false);
  };

  /**
   * @func
   * @desc Handle Modal Close
   */
  const handleModalClose = () => {
    if (!startDate && !endDate) {
      const oldDates = setDates();
      onClose(oldDates);
    } else {
      onClose({ startDate, endDate });
    }
  };

  /**
   * @func
   * @desc Handle Date Change and set State
   * @param {Object} param0
   */
  const handleDateChange = ({ date_select }) => {
    setstartDate(date_select[0]);
    setendDate(date_select[1]);
  };

  return (
    <>
      <Grid container>
        <Grid item xs={12} zeroMinWidth>
          {!props.node.data.isRowEditingEnabled && (
            <Form
              maxFieldsInRow={1}
              handleChange={() => null}
              fields={editDeleteFields}
              updateDefaultValue={true}
              defaultValues={{ date_select: [startDate, endDate] }}
              noPortal={false}
            />
          )}
          {props.node.data.isRowEditingEnabled && (
            <Modal
              open={modalOpen}
              aria-labelledby="modal-modal-title"
              aria-describedby="modal-modal-description"
              onClose={handleModalClose}
            >
              <Box className={classes.modalStyle}>
                <Form
                  maxFieldsInRow={1}
                  handleChange={handleDateChange}
                  fields={editDeleteFields}
                  updateDefaultValue={true}
                  defaultValues={{ date_select: [startDate, endDate] }}
                  // onClose={onClose}
                  noPortal={true}
                />
              </Box>
            </Modal>
          )}
        </Grid>
      </Grid>
    </>
  );
};
const EditDeleteCustomRenderer = (props) => {
  if (props.node.level === 0) {
    return props.value;
  }
  return <TimeRangeRenderer {...props} />;
};
const mapActionsToProps = {
  addSnack,
};
export default connect(null, mapActionsToProps)(EditDeleteCustomRenderer);
