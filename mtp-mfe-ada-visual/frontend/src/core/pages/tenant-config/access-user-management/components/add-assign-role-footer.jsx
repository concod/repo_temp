import { makeStyles } from "@mui/styles";
import colours from "core/Styles/colours";
import { pxToRem } from "core/Utils/functions/utils";
import { Button } from "impact-ui-v3";
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import { useNavigate } from "react-router-dom-v5-compat";
import { userManagementRoutes } from "config/routes";

const useStyles = makeStyles((theme) => ({
  footerContainer: {
    display: "flex",
    position: "fixed",
    bottom: 0,
    padding: `${pxToRem(16)} ${pxToRem(24)}`,
    justifyContent: "space-between",
    width: "-webkit-fill-available",
    borderTop: `${pxToRem(1)} solid ${colours.separaterColor}`,
    background: colours.white,
    zIndex:1
  },
  leftSection: {
    "& .ia-styles.ia-btn.ia-btn-link": {
      borderRadius: pxToRem(8),
      border: `${pxToRem(1)} solid ${colours.borderDarkGray}`,
      fontWeight: 500,
      color: colours.lightNeutrals,
    },
  },
  rightSection: {
    display: "flex",
    gap: pxToRem(12),
    alignItems: "center",
  },
  nextButton: {
    "& .ia-btn-icon": {
      marginBottom: pxToRem(2),
    },
  },
  previousButton: {
    "& .ia-btn-icon": {
      marginBottom: pxToRem(1),
    },
  },
}));

const AddAssignRoleFooter = (props) => {
  const classes = useStyles();
  const navigate = useNavigate();
  const {
    setEditUserRoleMappingData,
    setEditMode,
    setNewUsersList,
    createNewUser,
    activeStep,
    submitRoleMappings,
    loadAddUserColumns,
    newUnmappedList,
    newMappedList,
    role,
    filterLoader,
  } = props;

  const checkDisabledForSave = () => {
    try {
      if (activeStep === 0) {
        return loadAddUserColumns;
      } else {
        return (
          !(
            Boolean(newUnmappedList.length) ||
            Boolean(newMappedList.length) ||
            role
          ) || filterLoader
        );
      }
    } catch (error) {
      console.error("checkDisabledForSave error: ", error);
    }
  };

  const checkDisabledForSaveAndAssignLater = () => {
    try {
      if (activeStep === 0) {
        return props.loadAddUserColumns;
      } else {
        return props.filterLoader;
      }
    } catch (error) {
      console.error("checkDisabledForSaveAndAssignLater error: ", error);
    }
  };

  return (
    <div className={classes.footerContainer}>
      <div className={classes.leftSection}>
        <Button
          variant="tertiary"
          icon={<NavigateBeforeIcon />}
          iconPlacement="left"
          onClick={() => {
            setEditUserRoleMappingData({});
            setEditMode(false);
            setNewUsersList([]);
            navigate(userManagementRoutes.user);
          }}
          className={classes.previousButton}
        >
          Back to list
        </Button>
      </div>
      <div className={classes.rightSection}>
       {activeStep === 0 && <Button
          variant="text"
          onClick={() => createNewUser.current()}
          disabled={checkDisabledForSaveAndAssignLater()}
        >
          Save and assign role later
        </Button>}
        <Button
          variant="primary"
          onClick={() => {
            if (activeStep === 0) {
              createNewUser.current(true);
            } else {
              submitRoleMappings.current();
            }
          }}
          disabled={checkDisabledForSave()}
          icon={<NavigateNextIcon />}
          iconPlacement="right"
          className={classes.nextButton}
        >
          {activeStep === 0 ? "Next" : "Save"}
        </Button>
      </div>
    </div>
  );
};

export default AddAssignRoleFooter;
