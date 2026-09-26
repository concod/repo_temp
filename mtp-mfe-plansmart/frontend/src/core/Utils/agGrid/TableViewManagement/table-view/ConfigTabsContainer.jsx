import { Box } from '@mui/material';

function ConfigTabsContainer ({ additionalTabConfig, columnActionSelected, viewSelected, selectedViewData }) {
  
    return (
      <>
        {additionalTabConfig?.map((tab, index) => (
          <TabPanel key={index} value={columnActionSelected} index={index}>
            <tab.component
              viewSelected={viewSelected}
              selectedViewData={selectedViewData}
            />
          </TabPanel>
        ))}
      </>
    );
  }

  function TabPanel(props) {
    const { children, value, index, ...other } = props;
  
    return (
      <div
        role="tabpanel"
        hidden={value !== index}
        id={`simple-tabpanel-${index}`}
        aria-labelledby={`simple-tab-${index}`}
        {...other}
      >
        {<Box>{children}</Box>}
      </div>
    );
  }
  

export default ConfigTabsContainer;