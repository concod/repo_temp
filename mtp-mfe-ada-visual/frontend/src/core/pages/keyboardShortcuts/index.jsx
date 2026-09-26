import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Box from "@mui/material/Box";
import KeyboardShortcutHeading from "./components/KeyboardShortcutHeading";
import KeyboardShortcutGrid from "./components/KeyboardShortcutGridView";
import Table from "./components/viewTable";
import makeStyles from "@mui/styles/makeStyles";
import { pxToRem } from "core/Utils/functions/utils";
import {
  Typography,
  Dialog,
  DialogContent,
  DialogTitle,
  Button,
  IconButton,
} from "@mui/material";
import { Close } from "@mui/icons-material";
import {
  TABS_DATA,
  windowKeyMapping,
  macKeyMapping,
  componentMapping,
} from "./components/Constant";
import theme from "core/Styles/theme";
import { getKeyboardShortcut } from "core/actions/tenantConfigActions";

const useStyles = makeStyles(() => ({
  feedback: {
    marginBottom: pxToRem(12),
    float: "right",
    color: theme.palette.primary.main,
  },
  feedbackArea: {
    borderTop: `${pxToRem(1)} solid #D4D4D4`,
    padding: `${pxToRem(12)} 0 0 0`,
  },
  feedbackPlaceholder: {
    height: pxToRem(92),
    width: pxToRem(566),
    borderRadius: pxToRem(4),
    border: `${pxToRem(1)} solid #D4D4D4`,
    paddingLeft: pxToRem(16),
    paddingBottom: pxToRem(55),
    resize: "none",
  },
  styleDiv: {
    paddingLeft: pxToRem(16),
    paddingRight: pxToRem(32),
  },
  styleBox: {
    paddingBottom: pxToRem(24),
  },
  characterCount: {
    paddingLeft: pxToRem(440),
  },
  buttonContainer: {
    display: "flex",
    justifyContent: "flex-end",
    marginTop: pxToRem(16),
  },
  submitButton: {
    marginLeft: pxToRem(16),
  },
  textColor: {
    color: theme.palette.textColours.slateGrayLight,
  },
  closeButton: {
    position: "absolute",
    right: pxToRem(10),
    top: pxToRem(10),
  },
  clearAll: {
    color: theme.palette.primary.main,
  },
}));

function CustomTabPanel(props) {
  const { children, value, index, ...other } = props;
  const classes = useStyles();
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box className={classes.styleBox}>
          <Typography>{children}</Typography>
        </Box>
      )}
    </div>
  );
}

CustomTabPanel.propTypes = {
  children: PropTypes.node,
  index: PropTypes.number.isRequired,
  value: PropTypes.number.isRequired,
};

function a11yProps(index) {
  return {
    id: `simple-tab-${index}`,
    "aria-controls": `simple-tabpanel-${index}`,
  };
}

function BasicTabs(props) {
  const [value, setValue] = useState(0);
  const [filteredRow, setFilteredRow] = useState([]);
  const [generalNavigationRow, setGeneralNavigationRow] = useState([]);
  const [tableNavigationRow, setTableNavigationRow] = useState([]);
  const [sidebarNavigation, setSidebarNavigation] = useState([]);
  const [showGrid, setShowGrid] = useState(false);
  const [remainingCharacters, setRemainingCharacters] = useState(200);
  const [openFeedbackDialog, setOpenFeedbackDialog] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [isWindow, setIsWindow] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [rowConfig, setRowConfig] = useState([]);
  const classes = useStyles();

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  const handleFeedbackChange = (event) => {
    const input = event.target.value;
    setRemainingCharacters(200 - input.length);
    setFeedbackText(input);
  };

  const handleFeedbackClick = () => {
    setOpenFeedbackDialog(true);
  };

  const handleCloseFeedbackDialog = () => {
    setFeedbackText("");
    setRemainingCharacters(200);
    setOpenFeedbackDialog(false);
  };

  const handleClearFeedback = () => {
    setFeedbackText("");
    setRemainingCharacters(200);
  };

  const handleSubmitFeedback = () => {
    displaySnackMessages("Feedback Recieved Successfully", "success");
    handleCloseFeedbackDialog();
  };

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const keyboardPayload = {
          meta: {
            limit: {
              limit: 1000,
              page: 1,
              offset: 0,
            },
          },
        };
        const data = await getKeyboardShortcut(keyboardPayload);
        const transformedData = data.map((row) => ({
          ...row,
          mac_keys: row.mac_keys?.map((key) => macKeyMapping[key] || key),
          windows_keys: row.windows_keys?.map(
            (key) => windowKeyMapping[key] || key
          ),
          components:
            componentMapping[row.components] ||
            row.components?.charAt(0).toUpperCase() + row.components?.slice(1),
        }));
        setRowConfig(transformedData);
      } catch (error) {
        displaySnackMessages("Something went wrong", "error");
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const componentFilters = [
      { key: "Filters", setState: setFilteredRow },
      { key: "General Navigation", setState: setGeneralNavigationRow },
      { key: "Table Navigation", setState: setTableNavigationRow },
      { key: "Sidebar Navigation", setState: setSidebarNavigation },
    ];
    componentFilters.forEach(({ key, setState }) => {
      setState(rowConfig.filter((row) => row.components === key));
    });
  }, [rowConfig]);

  const toggleComponent = () => {
    setShowGrid((prevShowGrid) => !prevShowGrid);
  };

  const toggleButtonState = (isWindow) => {
    setIsWindow(isWindow);
  };

  const handleTableSearch = (searchQuery) => {
    setSearchQuery(searchQuery);
  };
  const rowDataArray = [
    rowConfig,
    filteredRow,
    generalNavigationRow,
    tableNavigationRow,
    sidebarNavigation,
  ];

  return (
    <div className={classes.styleDiv}>
      <KeyboardShortcutHeading
        toggleComponent={toggleComponent}
        showToggleButton={showGrid}
        toggleButtonState={toggleButtonState}
        handleTableSearch={handleTableSearch}
      />
      <Box sx={{ width: "100%" }} className={classes.box}>
        <Box>
          <Tabs
            value={value}
            onChange={handleChange}
            aria-label="basic tabs example"
          >
            {TABS_DATA?.map((label, idx) => (
              <Tab key={`tab-${idx}`} {...a11yProps(idx)} label={label} />
            ))}
          </Tabs>
        </Box>
        {rowDataArray.map((tabData, index) => (
          <CustomTabPanel key={`panel-${index}`} value={value} index={index}>
            {showGrid ? (
              <KeyboardShortcutGrid
                rowItem={tabData}
                isWindow={isWindow}
                searchQuery={searchQuery}
              />
            ) : (
              <Table rowItem={tabData} searchQuery={searchQuery} />
            )}
          </CustomTabPanel>
        ))}
      </Box>
      <div className={classes.feedbackArea}>
        <div className={classes.feedback}>
          <Typography variant="h6" component="div">
            <span style={{ cursor: "pointer" }} onClick={handleFeedbackClick}>
              Please provide your valuable Feedback
            </span>
          </Typography>
        </div>
      </div>

      <Dialog open={openFeedbackDialog} onClose={handleCloseFeedbackDialog}>
        <DialogTitle>Feedback</DialogTitle>
        <IconButton
          className={classes.closeButton}
          onClick={handleCloseFeedbackDialog}
        >
          <Close />
        </IconButton>
        <DialogContent>
          <textarea
            className={classes.feedbackPlaceholder}
            placeholder="Add your feedback here"
            onChange={handleFeedbackChange}
            value={feedbackText}
            maxLength={200}
            autoFocus
          />
          <div className={classes.characterCount}>
            <Typography
              variant="body2"
              component="span"
              className={classes.textColor}
            >
              {remainingCharacters} characters left
            </Typography>
          </div>
          <div className={classes.buttonContainer}>
            <Button onClick={handleClearFeedback} className={classes.clearAll}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitFeedback}
              variant="contained"
              className={classes.submitButton}
              disabled={feedbackText.length === 0}
            >
              Submit
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default BasicTabs;
