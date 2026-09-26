import { useState, useRef, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useDateRangeStore, type RangeType } from "../../../store/dateRangeStore";
import "./DateRangePicker.scss";

const formatDate = (date: Date | null): string => {
  if (!date) return "--";
  const day = date.getDate().toString().padStart(2, "0");
  const month = date.toLocaleString("en-US", { month: "short" });
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

const rangeOptions: { value: RangeType; label: string }[] = [
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "quarter", label: "Quarter" },
];

const DateRangePicker = () => {
  const {
    rangeType,
    startDate,
    endDate,
    setRangeType,
    setStartDate,
    setEndDate,
    minDate,
    maxDate,
  } = useDateRangeStore();

  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleRangeTypeChange = (type: RangeType) => {
    setRangeType(type);
  };

  const handleStartDateChange = (date: Date | null) => {
    if (date) {
      setStartDate(date);
    }
  };

  const handleEndDateChange = (date: Date | null) => {
    if (date) {
      setEndDate(date);
    }
  };

  return (
    <div className="date-range-picker">
      <button
        ref={triggerRef}
        className="date-range-picker__trigger"
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        <i className="fa-regular fa-calendar date-range-picker__icon" />
        <span className="date-range-picker__text">
          {formatDate(startDate)} - {formatDate(endDate)}
        </span>
        <i
          className={`fa-solid fa-chevron-down date-range-picker__chevron ${
            isOpen ? "date-range-picker__chevron--open" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div ref={popoverRef} className="date-range-picker__popover">
          <div className="date-range-picker__range-types">
            {rangeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`date-range-picker__range-btn ${
                  rangeType === option.value
                    ? "date-range-picker__range-btn--active"
                    : ""
                }`}
                onClick={() => handleRangeTypeChange(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="date-range-picker__dates">
            <div className="date-range-picker__date-field">
              <label className="date-range-picker__label">Start Date</label>
              <DatePicker
                selected={startDate}
                onChange={handleStartDateChange}
                dateFormat="dd-MMM-yyyy"
                className="date-range-picker__input"
                popperPlacement="bottom-start"
                showMonthDropdown
                showYearDropdown
                dropdownMode="select"
                minDate={minDate || undefined}
                maxDate={maxDate || undefined}
              />
            </div>

            <div className="date-range-picker__date-field">
              <label className="date-range-picker__label">End Date</label>
              <DatePicker
                selected={endDate}
                onChange={handleEndDateChange}
                dateFormat="dd-MMM-yyyy"
                className="date-range-picker__input"
                popperPlacement="bottom-start"
                minDate={startDate || undefined}
                maxDate={maxDate || undefined}
                showMonthDropdown
                showYearDropdown
                dropdownMode="select"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateRangePicker;
