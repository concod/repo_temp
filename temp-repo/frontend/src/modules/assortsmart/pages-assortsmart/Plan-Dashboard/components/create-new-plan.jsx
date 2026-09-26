import { Button, Paper } from "@mui/material";
import { Add } from "@mui/icons-material";
import PlanModal from "./create-or-copy-plan-modal";
import { useState } from "react";
import GlobalStyles from "core/Styles/globalStyles";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import clsx from "clsx";

const CreateNew = (props) => {
  const classes = useStyles();
  const globalClasses = GlobalStyles();
  const [openCreateModal, setopenCreateModal] = useState(false);
  const openCreatePlanFunc = () => {
    setopenCreateModal(true);
  };
  const closeCreatePlanFunc = () => {
    setopenCreateModal(false);
  };
  const createNewCard = clsx(classes.paperStyleCreate, globalClasses.paper);
  return (
    <>
      <Paper elevation={3} className={createNewCard}>
        <div>
          <Button
            onClick={openCreatePlanFunc}
            className={classes.createBtn}
            variant="contained"
            color="primary"
            id="assortCreatePlanBtn"
            //disabled={props.accessData["create"] ? false : true}
          >
            <Add />
          </Button>
        </div>
        <label className={classes.createLabel}>Create New</label>
        {openCreateModal && (
          <PlanModal
            {...props}
            open={openCreateModal}
            handleClose={closeCreatePlanFunc}
          />
        )}
      </Paper>
    </>
  );
};

export default CreateNew;
