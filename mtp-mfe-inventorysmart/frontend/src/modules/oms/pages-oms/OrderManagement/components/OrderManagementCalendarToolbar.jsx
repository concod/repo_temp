import React from "react";
import PropTypes from "prop-types";
import NormalCalendarFiscalMapping from "core/commonComponents/calendar/normalCalendarFiscalMapping";

export default function OrderManagementCalendarToolbar({
  showWeekDateRange,
  selectedMonthTab,
  selectedRoqDateTab,
  placementCalendarData,
  receiptCalendarData,
  selectedPlacementDate,
  selectedReceiptDate,
  onPlacementDateChange,
  onReceiptDateChange,
  onPlacementApply,
  onReceiptApply,
  isPlacementDisabled,
  isReceiptDisabled,
  selectionRangeForPlacement,
  selectionRangeForReceipt,
  maxPlacementEndDate,
  isOutsidePlacementRange,
  isOutsideReceiptRange,
}) {
  if (!showWeekDateRange) {
    return null;
  }

  if (selectedRoqDateTab === "roq_placement_date") {
    return (
      <NormalCalendarFiscalMapping
        key={`om-placement-week-range-${selectedMonthTab}-${selectedRoqDateTab}`}
        disablePastWeeks={true}
        disableOutSideFiscalRange={false}
        showDefaultLabel={false}
        maxOneWeekSelection={true}
        maxEightWeekSelection={true}
        displayRow={true}
        resetOptions={true}
        fiscalCalendarData={placementCalendarData}
        selectionRange={selectionRangeForPlacement}
        disabled={isPlacementDisabled}
        selectedDate={selectedPlacementDate}
        onDateChange={onPlacementDateChange}
        onPrimaryButtonClick={onPlacementApply}
        isOutsideRange={isOutsidePlacementRange}
        maxWeekEndDate={maxPlacementEndDate}
        restrictEndDateToMaxEndDate={true}
      />
    );
  }

  return (
    <NormalCalendarFiscalMapping
      key={`om-receipt-week-range-${selectedMonthTab}-${selectedRoqDateTab}`}
      disablePastWeeks={true}
      disableOutSideFiscalRange={false}
      showDefaultLabel={false}
      maxOneWeekSelection={true}
      maxEightWeekSelection={true}
      displayRow={true}
      resetOptions={true}
      selectionMonthCount={6}
      disabled={isReceiptDisabled}
      fiscalCalendarData={receiptCalendarData}
      selectedDate={selectedReceiptDate}
      onDateChange={onReceiptDateChange}
      onPrimaryButtonClick={onReceiptApply}
      isOutsideRange={isOutsideReceiptRange}
      useFiscalMonthEnd={true}
      useCurrentWeekStart={true}
      enableAutoSelectionForMonth={selectionRangeForReceipt === null}
      selectionRange={selectionRangeForReceipt}
    />
  );
}

OrderManagementCalendarToolbar.propTypes = {
  showWeekDateRange: PropTypes.bool,
  selectedMonthTab: PropTypes.string,
  selectedRoqDateTab: PropTypes.string,
  placementCalendarData: PropTypes.array,
  receiptCalendarData: PropTypes.array,
  selectedPlacementDate: PropTypes.object,
  selectedReceiptDate: PropTypes.object,
  onPlacementDateChange: PropTypes.func,
  onReceiptDateChange: PropTypes.func,
  onPlacementApply: PropTypes.func,
  onReceiptApply: PropTypes.func,
  isPlacementDisabled: PropTypes.bool,
  isReceiptDisabled: PropTypes.bool,
  selectionRangeForPlacement: PropTypes.number,
  selectionRangeForReceipt: PropTypes.number,
  maxPlacementEndDate: PropTypes.object,
  isOutsidePlacementRange: PropTypes.func,
  isOutsideReceiptRange: PropTypes.func,
};
