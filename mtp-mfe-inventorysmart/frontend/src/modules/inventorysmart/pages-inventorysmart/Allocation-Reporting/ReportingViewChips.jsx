import { Chips } from "impact-ui-v3";

const ReportingViewChips = ({ options = [], selectedOption, onChange }) => (
  <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
    {options.map((option) => (
      <Chips
        key={option.value}
        isActive={selectedOption === option.value}
        label={option.label}
        onClick={() => onChange(option.value)}
        type="single"
        disabled={option.isDisabled}
      />
    ))}
  </div>
);

export default ReportingViewChips;
