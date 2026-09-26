import React, { useState, useEffect } from "react";
import { useStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";
import CustomAccordion from "core/commonComponents/Custom-Accordian";
import globalStyles from "core/Styles/globalStyles";
import { Select, Tabs } from "impact-ui-v3";
import { isEmpty, uniq, cloneDeep } from "lodash";
import InventoryPositionTabPanel from "./InventoryPositionTabPanel";

const StoreInventoryPositions = (props) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [storeOptions, setStoreOptions] = useState([]);
  const [selectedStores, setSelectedStores] = useState([]);
  const [tabPanels, setTabPanels] = useState([]);
  const [tabValue, setTabValue] = useState("stockout");
  const [tabNames, setTabNames] = useState([]);
  const [details, setDetails] = useState([]);
  const [isSelectAll, setIsSelectAll] = useState(true);
  const [currentOptions, setCurrentOptions] = useState([]);

  const classes = useStyles();
  const globalClasses = globalStyles();

  const tabs = [
    { label: "Stockout", value: "stockout" },
    { label: "Shortfall", value: "shortfall" },
    { label: "Normal", value: "normal" },
    { label: "Excess", value: "excess" },
  ];

  useEffect(() => {
    if (!isEmpty(props.articleDetails)) {
      let options = [];
      props.articleDetails?.map((item) => {
        options.push({
          label: item.store_code,
          value: item.store_code,
        });
      });
      options = uniq(options);
      setStoreOptions(options);
      setCurrentOptions(options);
      setSelectedStores(options);
    }
  }, [props.articleDetails]);

  useEffect(() => {
    let countData = {};
    tabs.map((item) => {
      countData[item.value] = 0;
    });
    details.map((item) => {
      countData[item.product_tag?.toLowerCase()]++;
    });
    tabs.map((item) => {
      item.label = `${item.label}(${countData[item.value]})`;
    });
    setTabNames(tabs);
  }, [details]);

  useEffect(() => {
    if (!isEmpty(tabNames)) {
      let panels = [];
      tabNames.map((item, idx) => {
        panels.push(
          <InventoryPositionTabPanel
            key={idx}
            tab={item.value}
            details={details}
            side_panel_labels={props.side_panel_labels}
          />
        );
      });
      setTabPanels(panels);
    }
  }, [tabNames, details]);

  useEffect(() => {
    if (!isEmpty(selectedStores)) {
      let stores = selectedStores.map((item) => item.value);
      let data = cloneDeep(props.articleDetails)?.filter((item) =>
        stores.includes(item.store_code)
      );
      setDetails(data);
    } else {
      setDetails([]);
    }
  }, [selectedStores]);

  const handleTabChange = (e, newValue) => {
    setTabValue(newValue);
  };

  const onSearch = (e) => {
    const searchValue = e.target?.value;
    if (searchValue?.trim() === "") {
      setCurrentOptions(storeOptions);
    } else {
      const filtered = cloneDeep(storeOptions)?.filter((option) =>
        option.label?.toLowerCase()?.includes(searchValue.toLowerCase())
      );
      setCurrentOptions(filtered);
    }
  };

  const clearAllOptions = () => {
    setSelectedStores([]);
  };

  return (
    <CustomAccordion label="Store inventory positions" defaultExpanded={false}>
      <div
        className={`${globalClasses.flexColumn} ${globalClasses.gap}`}
        style={{ display: "flex" }}
      >
        <Select
          label="Store"
          setIsOpen={setIsDropdownOpen}
          isOpen={isDropdownOpen}
          isWithSearch={true}
          onSearch={onSearch}
          isClearable={true}
          isCloseWhenClickOutside={true}
          isMulti={true}
          initialOptions={storeOptions}
          currentOptions={currentOptions}
          selectedOptions={selectedStores}
          setSelectedOptions={setSelectedStores}
          labelOrientation="right"
          isSelectAll={isSelectAll}
          setIsSelectAll={setIsSelectAll}
          isWithSelectAll={true}
          toggleSelectAll
          onClearAll={clearAllOptions}
        />
        <Tabs
          onChange={handleTabChange}
          orientation="horizontal"
          tabNames={tabNames}
          tabPanels={tabPanels}
          value={tabValue}
          // className={classes.tabsContainer}
        />
      </div>
    </CustomAccordion>
  );
};

export default StoreInventoryPositions;
