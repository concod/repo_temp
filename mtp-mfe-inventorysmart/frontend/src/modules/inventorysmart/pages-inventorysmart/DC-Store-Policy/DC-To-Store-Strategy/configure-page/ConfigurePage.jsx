import React, { memo, useState } from 'react';
import { useLocation } from 'react-router-dom-v5-compat';
import { useHistory } from 'react-router-dom';
import HeaderBreadCrumbs from 'core/Utils/HeaderBreadCrumbs';
import { Button } from 'impact-ui-v3';
import Tabs from 'core/commonComponents/tabs';
import ConfigureContent from './ConfigureContent';
import { makeStyles } from '@mui/styles';
import globalStyles from 'core/Styles/globalStyles';

const TAB_NAMES = [
  { key: "set_all", label: "Set All" },
  { key: "partial_set_all", label: "Partial Set All" }
];

const useStyles = makeStyles(() => ({
  container: {
    // padding: '16px',
    minHeight: '100vh',
  },
  breadCrumbs: {
    padding: '12px 24px',
  },
  tabsContainer: {
    padding: '16px',
    borderRadius: '8px',
    backgroundColor: '#FFF',
  },
  headerCard: {
    display: 'flex',
    padding: '12px 16px',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    gap: '12px',
    borderRadius: '8px',
    background: '#FFF',
    marginBottom: '16px',
  },
  headerLabel: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#0D152C',
  },
  panelLabel: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#60697D',
  },
  divider: {
    width: '1px',
    height: '16px',
    backgroundColor: '#D9DDE7',
  },
}));

const ConfigurePage = () => {
  const globalClasses = globalStyles();
  const classes = useStyles();
  const location = useLocation();
  const history = useHistory();
  const { selectedRules, filterDependencies, mode } = location.state || {};
  const [activeTab, setActiveTab] = useState(0);
  

  const tabsData = TAB_NAMES.map((tab, index) => {
    const TabPanel = (
      <div key={`set-all-tab-${tab.key}`}>
        <ConfigureContent
          filterDependencies={filterDependencies}
          selectedRules={selectedRules}
          mode={mode}
          isPartialSetAll={tab.key === "partial_set_all"}
          isSetAll={tab.key === "set_all"}
        />
      </div>
    );

    return {
      label: tab.label,
      id: index,
      level: "0",
      TabPanel,
    };
  });

  const renderContent = () => {
    if (mode === "set_all")
      return <>
          <div className={classes.breadCrumbs}>
            <HeaderBreadCrumbs
              options={[
                {
                  label: "Home",
                  to: "/home",
                },
                {
                  label: "Configuration",
                  to: "/inventory-smart/configuration",
                },
                {
                  label: "Set All Configure",
                  id: 2,
                },
              ]}
            />
          </div>
        <Tabs
          tabPannelStyle={{ padding: "0px" }}
          tabsData={tabsData}
          customSelectedtab={activeTab}
          handleChange={(newVal) => { setActiveTab(newVal); return true; }}
        />
      </>
    if (mode === "default")
      return <>
        <div className={classes.breadCrumbs}>
          <HeaderBreadCrumbs
            options={[
              {
                label: "Home",
                to: "/home",
              },
              {
                label: "Configuration",
                to: "/inventory-smart/configuration",
              },
              {
                label: "Configure",
                id: 2,
              },
            ]}
          />
        </div>
        <ConfigureContent 
        mode={mode}
        />
      </>
  }

  return (
    <div className={`${classes.container}`}>
      {renderContent()}
    </div>
  );
};

export default memo(ConfigurePage);