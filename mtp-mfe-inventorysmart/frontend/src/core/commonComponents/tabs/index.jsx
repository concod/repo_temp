import { useState, useEffect } from "react";

import { ButtonGroup, Tabs } from "impact-ui-v3";
import { isUndefined } from "lodash";
import globalStyles from "core/Styles/globalStyles";

const TabsComponent = (props) => {
  const globalClasses = globalStyles();
  // For alert on tab change & to handle onChange of Tab,
  // lifting the state up using parentControlledVal & setParentControlledVal
  const {
    tabsData,
    parentControlledVal,
    setParentControlledVal,
    remountOnTabChange = true,
  } = props;

  const newTabsData = tabsData?.map((tab) => ({ ...tab, value: tab.id }));
  const newTabsPanelData = tabsData?.map((tab) => tab.TabPanel);

  // adding this condition here to make the sku-mapping tab active when navigated from inventory alerts
  let initVal = 0;
  const [value, setValue] = useState(initVal);
  useEffect(() => {
    if (props.customSelectedtab) {
      setValue(props.customSelectedtab);
    }
  }, [props.customSelectedtab]);

  const handleChange = (_, newValue) => {
    let changeTab = true;
    if (props.handleChange) {
      changeTab = props.handleChange(newValue);
    }
    changeTab && setValue(newValue);
  };

  const handleTabChange = (_, val) => {
    let selectedIndex = -1;
    newTabsData.filter((tab, index) => {
      if (tab.value === val) {
        selectedIndex = index;
        return tab;
      }
    });
    if (setParentControlledVal) {
      setParentControlledVal(_, selectedIndex);
    } else {
      handleChange(_, selectedIndex);
    }
  };

  // it should be donw becase we have tabs shown as Index with hardcoded value
  // that's why not changing the Previous functionality
  const selectedOption = newTabsData[parentControlledVal || value]?.value;

  const isLevel0 = newTabsData[0]?.level === "0";
  const renderLevel0Content = () => {
    let indexOfSelectedOption = -1;
    newTabsData.forEach((thisItem, idx) => {
      if (thisItem.value === selectedOption) {
        indexOfSelectedOption = idx;
      }
    });
    return <div>{newTabsPanelData[indexOfSelectedOption]}</div>;
  };
  let selectedTabObject = newTabsData.find((thisTab)=>{
    return thisTab?.id === selectedOption
  })
  return (
    <div>
      {!isLevel0 && (
        <Tabs
          sx = {selectedTabObject?.leaveSpaceForCore === true ? props?.sx : {}}
          value={selectedOption}
          onChange={handleTabChange}
          tabNames={newTabsData}
          tabPanels={newTabsPanelData}
          remountOnTabChange={remountOnTabChange}
          isBlueBg={isUndefined(props.isBlueBg) ? true : props.isBlueBg}
          tabPanelStyle={props.tabPannelStyle}
        />
      )}
      {isLevel0 && (
        <div
          className={`${globalClasses.centerAlign} ${globalClasses.marginBottom}`}
        >
          <ButtonGroup
            onChange={handleTabChange}
            options={newTabsData}
            selectedOption={selectedOption}
          />
        </div>
      )}
      {isLevel0 && renderLevel0Content()}
    </div>
  );
};

export default TabsComponent;
