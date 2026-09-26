import React, { memo } from 'react';
import { Tabs, Button } from 'impact-ui-v3';
import ConfigurableTab from './ConfigurableTab';
import CloseIcon from '@mui/icons-material/Close';
import { makeStyles } from '@mui/styles';

import globalStyles from 'core/Styles/globalStyles';
import { CONFIGURATION_TABS } from '../utils';

const useStyles = makeStyles(() => ({
  headerRow: {
    padding: '0.75rem 0',
  },
  headerTitleSlot: {
    alignItems: 'center',
    display: 'flex',
    minHeight: '32px',
  },
  tabHeaderShadow: {
    '& .ia-styles.ia-tabList': {
      boxShadow: '0 0 4px 0 rgba(0, 0, 0, 0.12) !important',
      width: 'calc(100% - 140px)',
    },
  },
}));

const ConfigurationTabs = ({ activeTab, onTabChange, ruleCode, filterDependencies, preselectedItem, onSelectionChange, onClose, isManageRclFlow }) => {
  const globalClasses = globalStyles();
  const classes = useStyles();

  const tabNames = CONFIGURATION_TABS.map(({ tabKey, label }) => ({
    label,
    value: tabKey,
  }));

  const tabPanels = CONFIGURATION_TABS.map(({ tabKey, label }) => (
    <ConfigurableTab
      key={`${preselectedItem?.parentData?.id}-${activeTab}`}
      tabKey={tabKey}
      tabName={label}
      ruleCode={ruleCode}
      filterDependencies={filterDependencies}
      preselectedItem={preselectedItem}
      onSelectionChange={onSelectionChange}
      isManageRclFlow={isManageRclFlow}
    />
  ));

  return (
    <>
      {/* Header row with close button */}
      <div
        className={`${globalClasses.flexRow} ${globalClasses.layoutAlignBetweenCenter} ${classes.headerRow}`}
        style={{ marginBottom: '-48px' }}
      >
        <div className={classes.headerTitleSlot}></div>
        <Button
          variant={'text'}
          icon={<CloseIcon />}
          iconPlacement={'right'}
          onClick={onClose}
        >Close</Button>
      </div>

      {/* Tabs component */}
      <div className={classes.tabHeaderShadow}>
        <Tabs
          tabPanelStyle={{ paddingTop: "16px" }}
          tabNames={tabNames}
          tabPanels={tabPanels}
          value={activeTab}
          onChange={(_, newVal) => onTabChange(newVal)}
        />
      </div>
    </>
  );
};

export default memo(ConfigurationTabs);
