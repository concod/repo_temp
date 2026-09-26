import React from "react";
import { useStyles } from "../styles";
import ModuleMatrixMngmnt from "assets/ModuleAccessManagement/ModuleMatrixMngmnt.svg";
import ModulesIcon from "assets/ModuleAccessManagement/Modules.svg";
import AddUserIcon from "assets/ModuleAccessManagement/AddUser.svg";

const SummaryBanner = ({ roles, modules }) => {
  const classes = useStyles();

  const totalModules = modules.length;
  const editableModules = modules.filter((m) => m.editAccess).length;
  const viewOnlyModules = totalModules - editableModules;

  const totalRoles = roles.length;
  const defaultRoles = roles.filter((r) => r.isDefault).length;
  const userCreatedRoles = totalRoles - defaultRoles;

  return (
    <div className={classes.summaryBanner}>
      <div className={classes.bannerSectionFirst}>
        <div className={classes.bannerIconWrapper}>
          <ModuleMatrixMngmnt />
        </div>
        <div>
          <p className={classes.bannerTitle}>Module Access Management</p>
        </div>
      </div>

      <div className={classes.bannerSection}>
        <div>
          <div className={classes.bannerIconRow}>
            <ModulesIcon className={classes.bannerStatIcon} />
            <p className={classes.bannerTitle}>{totalModules} Modules</p>
          </div>
          <p className={classes.bannerSubtitle}>
            {editableModules} Editable &nbsp;|&nbsp; {viewOnlyModules} View Only
          </p>
        </div>
      </div>

      <div className={classes.bannerSection}>
        <div>
          <div className={classes.bannerIconRow}>
            <AddUserIcon className={classes.bannerStatIcon} />
            <p className={classes.bannerTitle}>{totalRoles} Roles</p>
          </div>
          <p className={classes.bannerSubtitle}>
            {defaultRoles} Default &nbsp;|&nbsp; {userCreatedRoles} User Created
          </p>
        </div>
      </div>
    </div>
  );
};

export default SummaryBanner;
