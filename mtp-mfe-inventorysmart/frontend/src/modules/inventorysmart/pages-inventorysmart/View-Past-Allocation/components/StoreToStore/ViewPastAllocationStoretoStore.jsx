// @ts-nocheck
import { useState } from "react";
import { connect } from "react-redux";
import { ButtonGroup } from "impact-ui-v3";
import TableViewIcon from "assets/v3NewIcons/TableView.svg";
import CardViewIcon from "assets/v3NewIcons/CardView.svg";
import globalStyles from "core/Styles/globalStyles";
import ViewPastAllocatoinS2STable from "./ViewPastAllocatoinS2STable";
import ViewPastAllocationCardView from "../ViewPastAllcationCardView";

const ViewPastAllocationStoretoStore = (props) => {
  const globalClasses = globalStyles();
  const [selectedButton, setSelectedButton] = useState("tableView");

  const handleButtonChange = (event, newValue) => {
    setSelectedButton(newValue);
  };
  const renderCenterOptions = () => {
    return (
      <ButtonGroup
        onChange={handleButtonChange}
        options={[
          { label: "", value: "cardView", icon: <CardViewIcon /> },
          { label: "", value: "tableView", icon: <TableViewIcon /> },
        ]}
        selectedOption={selectedButton}
      />
    );
  };

  return (
    <div>
      {props.isFiltersValid && selectedButton === "tableView" && (
        <ViewPastAllocatoinS2STable
          selectedDates={props.selectedDates}
          enableDownload={
            props.viewPastAllocationModuleConfig?.view_past_allocation_table
              ?.enableDownload
          }
          renderCenterOptions={renderCenterOptions}
        />
      )}
      {props.isFiltersValid && selectedButton === "cardView" && (
        <ViewPastAllocationCardView
          selectedDates={props.selectedDates}
          renderCenterOptions={renderCenterOptions}
          isStoretoStore
        />
      )}
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    isPreviewMode:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartCreateAllocationConfig?.isPreviewMode,
    isFiltersValid:
      store.inventorysmartReducer.inventorySmartPastAllocationService
        .isFiltersValidS2S,
    viewPastAllocationModuleConfig:
      store.inventorysmartReducer.inventorySmartPastAllocationService
        ?.viewPastAllocationModuleConfig,
  };
};

const mapDispatchToProps = () => ({});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ViewPastAllocationStoretoStore);
