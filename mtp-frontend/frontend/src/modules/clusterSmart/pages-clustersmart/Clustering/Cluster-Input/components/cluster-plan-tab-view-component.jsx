import { useState } from "react";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import { makeStyles } from "@mui/styles";

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`full-width-tabpanel-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          <Typography>{children}</Typography>
        </Box>
      )}
    </div>
  );
}

const useStyles = makeStyles((theme) => ({
  tab_options_container: {
    width: "fit-content",
  },
  active_tab: {
    color: theme.palette.common.white,
    backgroundColor: theme.palette.primary.main,
  },
  tab: {
    border: `1px solid ${theme.palette.grey[500]}`,
    padding: "0.4rem 0.5rem",
    fontSize: "0.8rem",
    "&:not(:last-child)": {
      borderRight: 0,
    },
    "&:first-child": {
      borderTopLeftRadius: "3px",
      borderBottomLeftRadius: "3px",
    },
    "&:last-child": {
      borderTopRightRadius: "3px",
      borderBottomRightRadius: "3px",
    },
  },
  content_head: {
    paddingBottom: theme.spacing(0.5),
    fontWeight: theme.typography.fontWeightMedium,
  },
  content_body: {
    paddingBottom: theme.spacing(0.5),
    fontSize: "0.7rem",
  },
  tab_container: {
    margin: 0,
    padding: 0,
    border: 0,
    "& .MuiTabs-flexContainer": {
      borderBottom: "none",
      paddingLeft: 0,
      marginTop: theme.spacing(0.5),
    },
  },
  tabPanel: {
    "& .MuiBox-root": {
      paddingLeft: 0,
    },
  },
  tab_value: {
    paddingLeft: 0,
  },
}));

export default function ClusterPlanTabViewComponent(props) {
  const [tabValue, setTabValue] = useState(props.selectedClusterTab || 0);
  const classes = useStyles();

  const handleChange = (event, newValue) => {
    setTabValue(newValue);
    props.onChangeTab(newValue);
  };

  return (
    <>
      <Box className={classes.tab_options_container}>
        <div>
          <p className={classes.content_head}>
            Please select clustering method
          </p>
          <p className={classes.content_body}>
            Select one of the methods for creating new cluster plan
          </p>
        </div>
        <Tabs
          value={tabValue}
          onChange={handleChange}
          indicatorColor="none"
          textColor="inherit"
          className={classes.tab_container}
        >
          {Object.keys(props.clusterMethodTabValues).map((key, index) => (
            <Tab
              label={key}
              id={`full-width-tab-${index}`}
              className={`${classes.tab} ${
                tabValue === index && classes.active_tab
              }`}
            />
          ))}
        </Tabs>
      </Box>
      {Object.values(props.clusterMethodTabValues).map((value, index) => (
        <TabPanel value={tabValue} index={index} className={classes.tab_value}>
          {value()}
        </TabPanel>
      ))}
    </>
  );
}
