import React from 'react';
import { MonthRangePicker } from 'impact-ui-v3';

const toDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

const SimpleMonthRangePickerWrapper = ({
  customWidth = "282px",
  displayFormat = "MM/YY",
  startMonth = null,
  endMonth = null,
  focusedInput = null,
  isOutsideRange = () => false,
  locale = "en-US",
  onApply = () => {},
  disabled = false,
  label,
}) => {
  return (
    <MonthRangePicker
      customWidth={customWidth}
      displayFormat={displayFormat}
      startMonth={toDate(startMonth)}
      endMonth={toDate(endMonth)}
      focusedInput={focusedInput}
      isOutsideRange={isOutsideRange}
      locale={locale}
      onApply={onApply}
      disabled={disabled}
      label={label}
    />
  );
};

export default SimpleMonthRangePickerWrapper;
