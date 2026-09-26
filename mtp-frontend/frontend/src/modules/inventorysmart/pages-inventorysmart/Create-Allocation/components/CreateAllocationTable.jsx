import Paper from "@mui/material/Paper";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import globalStyles from "core/Styles/globalStyles";
import { withRouter } from "react-router-dom";
import LoadingOverlay from "core/Utils/Loader/loader";
import ArticlesTable from "./ArticlesTable";

const CreateAllocationTable = function (props) {
  const classes = useStyles();
  const globalClasses = globalStyles();

  return (
    <LoadingOverlay loader={props.plansmartDashboardLoader}>
      <Paper elevation={6} className={globalClasses.paperWrapper}>
        <div className={classes.autoOverflowWrapper}>
          <ArticlesTable />
        </div>
      </Paper>
    </LoadingOverlay>
  );
};

export default withRouter(CreateAllocationTable);
