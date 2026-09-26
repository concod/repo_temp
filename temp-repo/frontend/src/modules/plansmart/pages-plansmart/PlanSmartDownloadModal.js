import React, { useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  Radio,
  RadioGroup,
  CircularProgress,
  Checkbox,
} from "@mui/material";
import { styled } from "@mui/styles";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CircleOutlinedIcon from "@mui/icons-material/CircleOutlined";

const StyledFormControlLabel = styled(FormControlLabel)((props) => ({
  borderRadius: "10rem",
  margin: "0px",
  padding: "0px 30px",
  border: "1px solid currentColor",
  "& span": {
    paddingLeft: "0px",
  },
  "&:has(span.Mui-checked)": {
    background: props.theme.palette.primary.main + "1f",
    borderColor: props.theme.palette.primary.main,
  },
}));

function PlanSmartDownloadModal(props) {
  const {
    onClose,
    onDownload,
    downloadLoader,
    open,
    hierarchyList,
    downloadOptions,
  } = props;
  const [downloadOption, setDownloadOption] = useState(downloadOptions[0]);
  const [selectedHierarchyLevel, setSelectedHierarchyLevel] = useState([]);
  const handleOption = (event) => {
    setSelectedHierarchyLevel([]);
    const [selectedOption] = downloadOptions.filter(
      (option) => option.value === event.target.value
    );
    setDownloadOption(selectedOption);
  };
  const handleCheckbox = (e) => {
    const value = e.target.value;
    if (selectedHierarchyLevel.indexOf(value) > -1) {
      const updateLevel = selectedHierarchyLevel.filter(
        (level) => level !== value
      );
      setSelectedHierarchyLevel(updateLevel);
    } else {
      setSelectedHierarchyLevel([...selectedHierarchyLevel, value]);
    }
  };

  const handleSelectAll = () => {
    if (selectedHierarchyLevel.length === hierarchyList.length) {
      setSelectedHierarchyLevel([]);
    } else {
      const levelKeys = hierarchyList.map((hierarchy) => hierarchy.value);
      setSelectedHierarchyLevel(levelKeys);
    }
  };
  return (
    <Dialog maxWidth="sm" fullWidth open={open}>
      <DialogTitle>Download</DialogTitle>
      <DialogContent>
        <RadioGroup value={downloadOption?.value} onChange={handleOption}>
          <Grid container gap={3}>
            {downloadOptions.map((option) => (
              <Grid item>
                <FormControlLabel
                  value={option.value}
                  control={<Radio />}
                  label={option.label}
                />
              </Grid>
            ))}
          </Grid>
        </RadioGroup>
        {downloadOption.value === "entire_plan" && (
          <>
            <Grid container gap={3} mt={2}>
              {hierarchyList.map((hierarchy) => (
                <Grid item xs={5}>
                  <StyledFormControlLabel
                    value={hierarchy.value}
                    control={
                      <Checkbox
                        icon={<CircleOutlinedIcon />}
                        checkedIcon={<CheckCircleIcon />}
                        checked={
                          selectedHierarchyLevel.indexOf(hierarchy.value) > -1
                        }
                        onChange={handleCheckbox}
                      />
                    }
                    color="secondary"
                    label={hierarchy.label}
                  />
                </Grid>
              ))}
            </Grid>
            <FormControlLabel
              control={
                <Checkbox
                  checked={
                    selectedHierarchyLevel.length === hierarchyList.length
                  }
                  onChange={handleSelectAll}
                />
              }
              label="Select all"
            />
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={() => onDownload(downloadOption, { selectedHierarchyLevel })}
          disabled={
            downloadLoader ||
            (downloadOption.value === "entire_plan" &&
              selectedHierarchyLevel.length === 0)
          }
          startIcon={downloadLoader ? <CircularProgress size="1rem" /> : null}
        >
          Download
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default PlanSmartDownloadModal;
