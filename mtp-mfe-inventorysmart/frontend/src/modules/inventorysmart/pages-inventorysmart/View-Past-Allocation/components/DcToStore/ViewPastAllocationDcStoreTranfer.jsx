import { useState } from "react";
import { connect } from "react-redux";
import { ButtonGroup } from "impact-ui-v3";
import globalStyles from "core/Styles/globalStyles";
import TableViewIcon from "assets/v3NewIcons/TableView.svg";
import CardViewIcon from "assets/v3NewIcons/CardView.svg";
import ViewPastAllocationsTable from "./ViewPastAllocationTable";
import AllocationPreviewTable from "../../../Create-Allocation/components/AllocationPreviewTable";
import ViewPastAllocationCardView from "../ViewPastAllcationCardView";

const ViewPastAllocationDcStoreTranfer = (props) => {
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
    <>
      {props.isPreviewMode ? (
        props.previewSelectedFilters.length > 0 && (
          <AllocationPreviewTable
            filterConfig={props.filters}
            selectedFilters={props.previewSelectedFilters}
            startEndDate={props.startEndDate}
            isViewOnly={true}
          />
        )
      ) : (
        <>
          {props.isFiltersValid && selectedButton === "tableView" && (
            <ViewPastAllocationsTable
              startEndDate={props.startEndDate}
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
            />
          )}
        </>
      )}
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    isPreviewMode:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartCreateAllocationConfig?.isPreviewMode,
    isFiltersValid:
      store.inventorysmartReducer.inventorySmartPastAllocationService
        .isFiltersValid,
    viewPastAllocationModuleConfig:
      store.inventorysmartReducer.inventorySmartPastAllocationService
        ?.viewPastAllocationModuleConfig,
  };
};

const mapDispatchToProps = () => ({});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ViewPastAllocationDcStoreTranfer);
