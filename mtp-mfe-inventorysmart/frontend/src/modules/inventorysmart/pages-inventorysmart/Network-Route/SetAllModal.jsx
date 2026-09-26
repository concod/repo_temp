import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { Modal } from "impact-ui-v3";
import Form from "core/Utils/form";
import { useEffect, useMemo, useState } from "react";
import makeStyles from "@mui/styles/makeStyles";
import { isEmpty } from "lodash";
import Loader from "core/Utils/Loader/loader";

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

const SetAllModal = ({ ...props }) => {
  const [formData, setFormData] = useState({});
  const [setAllLoader, setSetAllLoader] = useState(false);
  const [articleSetAllFields, setArticleSetAllFields] = useState([]);
  const classes = useStyles();

  useEffect(() => {
    let ARTICLE_SETALL_FIELDS = [
      {
        label: "Lead Time",
        is_disabled: true,
        accessor: "lead_time",
        field_type: "IntegerField",
      },
    ];

    setArticleSetAllFields(ARTICLE_SETALL_FIELDS);
  }, []);
  const handleChange = (data) => {
    setFormData(data);
  };
  const onCancel = () => {
    props.onCancel();
  };

  const onApply = async () => {
    let l_newStoreGroup = !isEmpty(formData.store_groups_options);
    let selectedRows = props.tableGridInstance.current.api
      .getSelectedRows()
      .map((item) => item.unique_id);
    let totalRows = props.tableGridInstance.current.api
      .getRenderedNodes()
      .map((item) => {
        return item.data;
      });
    try {
      totalRows = totalRows.map((item) => {
        if (selectedRows.indexOf(item.unique_id) > -1) {
          item.lead_time = Number(formData.lead_time);
        }
        return item;
      });
      props.tableGridInstance.current.api.setRowData([...totalRows]);
      props.tableGridInstance.current.api.refreshCells({
        columns: ["priority", "is_primary", "lead_time"],
      });
      props.displaySnackMessages(
        "Successfully applied the updated values",
        "success"
      );
      props.onCancel();
    } catch (e) {}
  };
  return (
    <Modal
      title="Set All"
      size="medium"
      onClose={onCancel}
      aria-labelledby="customized-dialog-title"
      open={true}
      fullWidth={true}
      disableEscapeKeyDown={true}
      disableBackdropClick={false}
      primaryButtonLabel={"Apply"}
      primaryButtonProps={{ onClick: onApply }}
      secondaryButtonLabel={"Cancel"}
      secondaryButtonProps={{ onClick: onCancel }}
    >
      <Loader loader={setAllLoader}>
        <DialogContent>
          <div className={classes.contentBody}>
            <Form
              maxFieldsInRow={1}
              layout={"vertical"}
              handleChange={handleChange}
              fields={articleSetAllFields}
              updateDefaultValue={true}
              defaultValues={{}}
            ></Form>
          </div>
        </DialogContent>
      </Loader>
    </Modal>
  );
};

export default SetAllModal;
