import React, { useState } from "react";
import { connect } from "react-redux";
import {
  Box,
  Button,
  FormControlLabel,
  Menu,
  Radio,
  RadioGroup,
  TextField,
} from "@mui/material";
import { reportRadioList } from "modules/plansmart/constants-plansmart/stringConstants";
import { planSmartSavePivotViewLoaderSelector } from "modules/plansmart/services-plansmart/BudgetPlanTable/budget-plan-table-service";

function SavePivotMenu({ onSave, showSnackMessage, savePivotLoader }) {
  const [saveViewEl, setSaveViewEl] = useState(null);
  const openSaveView = Boolean(saveViewEl);
  const [viewName, setViewName] = useState("");
  const [viewType, setViewType] = useState("");
  const handleSaveViewClick = (event) => {
    setSaveViewEl(event.currentTarget);
  };
  const handleSaveViewClose = () => {
    setSaveViewEl(null);
  };
  const handleSave = () => {
    if (!viewName) {
      showSnackMessage("View name is required", "error");
      return;
    }
    if (!viewType) {
      showSnackMessage("Please select a template", "error");
      return;
    }
    if (onSave) onSave(viewName, viewType);
  };
  return (
    <div>
      <Button
        variant="contained"
        id="plansmartSaveViewBtn"
        aria-controls={openSaveView ? "saveViewMenu" : undefined}
        aria-haspopup="true"
        aria-expanded={openSaveView ? "true" : undefined}
        onClick={handleSaveViewClick}
        sx={{ marginLeft: "10px", marginRight: "10px" }}
      >
        Save View
      </Button>
      <Menu
        id="saveViewMenu"
        aria-labelledby="plansmartSaveViewBtn"
        anchorEl={saveViewEl}
        open={openSaveView}
        onClose={handleSaveViewClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
      >
        <Box px={2} py={1}>
          <Box display="flex" alignItems="center">
            <div>Please enter View Name</div>
            <Box
              ml={4}
              component={TextField}
              variant="outlined"
              size="small"
              placeholder="Enter Name"
              value={viewName}
              onChange={(event) => setViewName(event.target.value)}
            />
          </Box>
          <Box
            component={RadioGroup}
            justifyContent="center"
            row
            onChange={(e) => setViewType(e.target.value)}
          >
            {reportRadioList.map((radio, inx) => (
              <FormControlLabel
                value={radio.value}
                control={<Box component={Radio} ml={inx !== 0 ? 4 : 0} />}
                label={radio.label}
              />
            ))}
          </Box>
          <Box width="100%" display="flex" justifyContent="center" mt={2}>
            <Button
              variant="contained"
              size="small"
              onClick={handleSave}
              disabled={savePivotLoader}
            >
              Save
            </Button>
          </Box>
        </Box>
      </Menu>
    </div>
  );
}

const mapState = (state) => ({
  savePivotLoader: planSmartSavePivotViewLoaderSelector(state),
});

export default connect(mapState)(SavePivotMenu);
