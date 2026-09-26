// Edit Icon cell renderer
import Edit from "@mui/icons-material/Edit";
import { Button } from "impact-ui-v3";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";

const EditCell = (props) => {
  const classes = useStyles();
  return (
    <Button
      variant="tertiary"
      onClick={() => {
        props.onEditClick(props);
      }}
      title="Edit"
      disabled={
        props.isEditDisabled && props.isEditDisabled(props) ? true : false
      }
      icon={<Edit fontSize="small" />}
    ></Button>
  );
};

export default EditCell;
