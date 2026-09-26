export const DistributionChipGroup = ({
  name,
  options,
  selectedValue,
  onChange,
  classes,
}) => (
  <div className={classes.chipRow} role="radiogroup" aria-label={name}>
    {options.map((option) => {
      const selected = selectedValue === option.value;
      return (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={selected}
          className={`${classes.chip} ${selected ? classes.chipSelected : ""}`}
          onClick={() => onChange(option.value)}
        >
          <span
            className={`${classes.radio} ${
              selected ? classes.radioSelected : ""
            }`}
          >
            {selected ? <span className={classes.radioDot} /> : null}
          </span>
          {option.label}
        </button>
      );
    })}
  </div>
);
