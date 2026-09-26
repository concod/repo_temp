// Delete Icon cell renderer
import Delete from "@mui/icons-material/Delete";
import { Button } from "impact-ui-v3";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";

const DeleteCell = (props) => {
  const classes = useStyles();
  return (
    <Button
      variant="tertiary"
      onClick={() => {
        props.onDeleteClick(props);
      }}
      title="Delete"
      disabled={
        props.isDeleteDisabled && props.isDeleteDisabled(props) ? true : false
      }
      icon={<Delete fontSize="small" />}
    ></Button>
  );
};

export default DeleteCell;
