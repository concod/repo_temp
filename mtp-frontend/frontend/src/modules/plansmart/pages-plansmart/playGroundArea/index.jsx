import React, { useState } from "react";
import Button from "@mui/material/Button";
import DeleteIcon from "@mui/icons-material/Delete";
import ArrowDropDownCircleIcon from "@mui/icons-material/ArrowDropDownCircle";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import { useHistory } from "react-router-dom";
import makeStyles from "@mui/styles/makeStyles";
import { StyledRadio, StyledCheckbox } from "core/Utils/selection/selection";
import StyledChip from "core/Utils/chip/StyledChip";
import StyledSlider from "core/Utils/slider/StyledSlider";
import FilterModal from "core/commonComponents/filterModal/FilterModal";
import {
  Tabs,
  Tab,
  IconButton,
  TextField,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
} from "@mui/material";
import { Stepper } from "impact-ui";
import HeaderBreadCrumbs from "../../../../core/Utils/HeaderBreadCrumbs";
import {
  PLAN_SMART_PRE_SEASON_DASHBOARD,
  PLAN_CREATE_NEW_PLAN,
} from "../../constants-plansmart/routesConstants";

export const useStyles = makeStyles((theme) => ({
  spacedElements: {
    display: "flex",
    justifyContent: "space-around",
    marginBottom: theme.spacing(2),
    alignItems: "center",
    gap: theme.spacing(2),
  },
  fixedWidth: {
    width: theme.typography.pxToRem(300),
    marginLeft: "auto",
    marginRight: "auto",
  },
}));

const TestArea = () => {
  const [value, setValue] = useState(2);
  const [toggleVal, setToggleVal] = useState();
  const [sliderValue, setSliderValue] = useState(100);
  const [expanded, setExpanded] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const history = useHistory();
  const classes = useStyles();

  const handleChange = (_event, newValue) => {
    setValue(newValue);
  };

  const handleAlignment = (event, toggleValue) => {
    if (toggleValue !== null) {
      setToggleVal(toggleValue);
    }
  };

  const handleSliderChange = (event, newSliderValue) => {
    setSliderValue(newSliderValue);
  };

  const valueLabelFormat = (value) => {
    return `${value} %`;
  };

  const steps = [
    {
      label: "Step 1",
      isEditable: false,
      isCompleted: false,
    },
    {
      label: "Step 2",
      isEditable: false,
      isCompleted: false,
    },
    {
      label: "Step 3",
      isEditable: false,
      isCompleted: false,
    },
  ];

  return (
    <>
      <HeaderBreadCrumbs
        options={[
          {
            label: "Dashboard",
            id: 1,
            action: () => {
              history.push(PLAN_SMART_PRE_SEASON_DASHBOARD);
            },
          },
          {
            label: "Create New Plan",
            id: 2,
            action: () => {
              history.push(PLAN_CREATE_NEW_PLAN);
            },
          },
        ]}
      ></HeaderBreadCrumbs>
      <Button
        variant="contained"
        color="primary"
        onClick={() => setOpenModal(true)}
      >
        Select Filters
      </Button>
      <FilterModal
        open={openModal}
        isModalFixedTop={true}
        closeOnOverlayClick={() => setOpenModal(false)}
      >
        {/** Insert Modal Content here. */}
        <Typography align="center">Modal Content here</Typography>
      </FilterModal>
      <div className={classes.spacedElements}>
        <Button variant="contained" color="primary">
          Primary
        </Button>
        <Button variant="contained" color="primary" startIcon={<DeleteIcon />}>
          Primary
        </Button>
        <Button variant="contained" color="primary" endIcon={<DeleteIcon />}>
          Primary
        </Button>
        <Button
          variant="contained"
          color="primary"
          startIcon={<DeleteIcon />}
          endIcon={<DeleteIcon />}
        >
          Primary
        </Button>
        <Button variant="contained" color="primary" size="small">
          Slim Contained
        </Button>
        <Button variant="outlined" color="primary">
          Primary Outlined
        </Button>
        <IconButton color="primary" size="large">
          <DeleteIcon fontSize="small" />
        </IconButton>
        <Button
          variant="outlined"
          color="primary"
          startIcon={<DeleteIcon />}
          endIcon={<DeleteIcon />}
        >
          Primary Outlined
        </Button>
        <Button variant="text" color="primary" disableRipple={true}>
          Primary Text
        </Button>
      </div>
      <div className={classes.spacedElements}>
        <Button variant="contained" color="primary" disabled={true}>
          Primary
        </Button>
        <Button
          variant="contained"
          color="primary"
          disabled={true}
          startIcon={<DeleteIcon />}
        >
          Primary
        </Button>
        <Button
          variant="contained"
          color="primary"
          endIcon={<DeleteIcon />}
          disabled={true}
        >
          Primary
        </Button>
        <Button
          variant="contained"
          color="primary"
          startIcon={<DeleteIcon />}
          endIcon={<DeleteIcon />}
          disabled={true}
        >
          Primary
        </Button>
        <Button
          variant="contained"
          color="primary"
          size="small"
          disabled={true}
        >
          Slim Contained
        </Button>
        <Button variant="outlined" color="primary" disabled={true}>
          Primary Outlined
        </Button>
        <Button
          variant="outlined"
          color="primary"
          disabled={true}
          startIcon={<DeleteIcon />}
          endIcon={<DeleteIcon />}
        >
          Primary Outlined
        </Button>
        <Button
          variant="text"
          color="primary"
          disabled={true}
          disableRipple={true}
        >
          Primary Text
        </Button>
      </div>
      <StyledRadio color="primary" defaultChecked={true} />
      <StyledRadio color="primary" defaultChecked={true} disabled />
      <StyledRadio color="primary" />
      <StyledRadio color="primary" disabled={true} />
      <StyledCheckbox color="primary" defaultChecked={true} size="small" />
      <StyledCheckbox color="primary" defaultChecked={true} disabled />
      <StyledCheckbox color="primary" />
      <StyledCheckbox color="primary" disabled={true} />
      <Tabs
        value={value}
        onChange={handleChange}
        aria-label="disabled tabs example"
        textColor="primary"
      >
        <Tab label="Tab1" />
        <Tab label="Tab2" />
        <Tab label="Tab3" />
      </Tabs>
      <Stepper steps={steps} activeIndex={1} />
      <div className={classes.spacedElements}>
        <TextField
          id="outlined-password-input"
          type="password"
          autoComplete="current-password"
          variant="outlined"
          size="small"
          placeholder="Something"
        />
        <TextField
          id="outlined-read-only-input"
          variant="outlined"
          size="small"
        />
        <TextField
          id="outlined-number"
          placeholder="Input Type"
          type="number"
          InputLabelProps={{
            shrink: true,
          }}
          variant="outlined"
          size="small"
          disabled
        />
      </div>
      <div className={classes.spacedElements}>
        <TextField
          id="outlined-password-input"
          type="password"
          autoComplete="current-password"
          variant="outlined"
          size="small"
          placeholder="Something"
          error={true}
        />
        <TextField
          id="outlined-read-only-input"
          variant="outlined"
          size="small"
          error={true}
        />
        <TextField
          id="outlined-number"
          placeholder="Input Type"
          type="number"
          InputLabelProps={{
            shrink: true,
          }}
          variant="outlined"
          size="small"
          disabled
          error={true}
        />
      </div>
      <div className={classes.spacedElements}>
        <ToggleButtonGroup
          value={toggleVal}
          size="small"
          onChange={handleAlignment}
          exclusive
          aria-label="text alignment"
        >
          <ToggleButton value="1" aria-label="left aligned">
            Toggle Switch One
          </ToggleButton>
          <ToggleButton value="2" aria-label="centered">
            Toggle Switch Two
          </ToggleButton>
          <ToggleButton value="3" aria-label="left aligned">
            Toggle Switch Three
          </ToggleButton>
          <ToggleButton value="4" aria-label="centered">
            Toggle Switch Four
          </ToggleButton>
        </ToggleButtonGroup>
      </div>
      <div className={classes.spacedElements}>
        <StyledChip color="success" label="Approved" />
        <StyledChip color="error" label="Rejected" />
        <StyledChip color="warning" label="Pending" />
        <StyledChip label="Primary" />
        <StyledChip color="secondary" label="Secondary" />
        <StyledChip color="primary" label="Dot" size="small" />
      </div>
      <div className={classes.spacedElements}>
        <StyledChip
          color="success"
          label="Approved"
          isiconvariant={true}
          icon={<FiberManualRecordIcon></FiberManualRecordIcon>}
        />
        <StyledChip
          color="error"
          label="Rejected"
          isiconvariant={true}
          icon={<FiberManualRecordIcon></FiberManualRecordIcon>}
        />
        <StyledChip
          color="warning"
          label="Pending"
          isiconvariant={true}
          icon={<FiberManualRecordIcon></FiberManualRecordIcon>}
        />
        <StyledChip
          label="Primary"
          isiconvariant={true}
          icon={<FiberManualRecordIcon></FiberManualRecordIcon>}
        />
        <StyledChip
          color="secondary"
          label="Secondary"
          isiconvariant={true}
          icon={<FiberManualRecordIcon></FiberManualRecordIcon>}
        />
        <StyledChip
          color="primary"
          label="Dot"
          size="small"
          isiconvariant={true}
          icon={<FiberManualRecordIcon></FiberManualRecordIcon>}
        />
      </div>
      <div className={classes.spacedElements}>
        <StyledChip
          color="success"
          label="Approved"
          isiconvariant={true}
          textonly={true}
          icon={<FiberManualRecordIcon></FiberManualRecordIcon>}
        />
        <StyledChip
          color="error"
          label="Rejected"
          isiconvariant={true}
          textonly={true}
          icon={<FiberManualRecordIcon></FiberManualRecordIcon>}
        />
        <StyledChip
          color="warning"
          label="Pending"
          isiconvariant={true}
          textonly={true}
          icon={<FiberManualRecordIcon></FiberManualRecordIcon>}
        />
        <StyledChip
          label="Primary"
          isiconvariant={true}
          textonly={true}
          icon={<FiberManualRecordIcon></FiberManualRecordIcon>}
        />
        <StyledChip
          color="secondary"
          label="Secondary"
          isiconvariant={true}
          textonly={true}
          icon={<FiberManualRecordIcon></FiberManualRecordIcon>}
        />
        <StyledChip
          color="primary"
          label="Dot"
          size="small"
          isiconvariant={true}
          textonly={true}
          icon={<FiberManualRecordIcon></FiberManualRecordIcon>}
        />
      </div>
      <div className={`${classes.spacedElements} ${classes.fixedWidth}`}>
        <StyledSlider
          value={sliderValue}
          onChange={handleSliderChange}
          aria-labelledby="continuous-slider"
          getAriaValueText={valueLabelFormat}
          valueLabelFormat={valueLabelFormat}
        />
      </div>
      <div className={`${classes.spacedElements} ${classes.fixedWidth}`}>
        <StyledSlider
          value={sliderValue}
          onChange={handleSliderChange}
          aria-labelledby="continuous-slider"
          disabled={true}
          getAriaValueText={valueLabelFormat}
          valueLabelFormat={valueLabelFormat}
        />
      </div>
      <div className={`${classes.spacedElements} ${classes.fixedWidth}`}>
        <StyledSlider
          value={sliderValue}
          onChange={handleSliderChange}
          aria-labelledby="continuous-slider"
          getAriaValueText={valueLabelFormat}
          valueLabelFormat={valueLabelFormat}
        />
        <TextField
          id="slide-value"
          placeholder="Value"
          type="number"
          value={sliderValue}
          InputProps={{
            readOnly: true,
          }}
          variant="outlined"
          size="small"
        />
      </div>
      <div className={`${classes.spacedElements} ${classes.fixedWidth}`}>
        <Accordion
          expanded={expanded}
          onChange={() => setExpanded(!expanded)}
          elevation={0}
        >
          <AccordionSummary
            expandIcon={<ArrowDropDownCircleIcon color="primary" />}
            aria-controls="panel4bh-content"
            id="accordion-example"
            edge="start"
          >
            <Typography variant="body2">Personal data</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography>
              Nunc vitae orci ultricies, auctor nunc in, volutpat nisl. Integer
              sit amet egestas eros, vitae egestas augue. Duis vel est augue.
            </Typography>
          </AccordionDetails>
        </Accordion>
      </div>
    </>
  );
};

export default TestArea;
