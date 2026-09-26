import { Input } from "impact-ui-v3";
import InfoIcon from "assets/Info.svg";
import ErrorIcon16 from "assets/errorIcon16.svg";
export const StyleUnitsBox = ({
  units,
  onChange,
  onBlur,
  unitsError,
  unitsHelperText,
  maxUnits,
  classes,
}) => {
  return (
    <div className={classes.unitsBox}>
      <div className={classes.unitsRow}>
        <p className={classes.unitsLabel}>
          Units:
          <span className={classes.required}>*</span>
        </p>
        <div className={classes.minInput}>
          <Input
            type="number"
            value={units ?? ""}
            onChange={onChange}
            onBlur={onBlur}
            isError={unitsError}
            helperText={unitsHelperText}
            isHelperText={Boolean(unitsError && unitsHelperText)}
            rightIcon={unitsError ? <ErrorIcon16 /> : undefined}
            inputProps={{ min: 0}}
          />
        </div>
        <p className={classes.unitsHint}>min per style-color ID</p>
      </div>
      <div className={classes.helpRow}>
        <span className={classes.infoIconBox}>
          <InfoIcon />
        </span>
        <p className={classes.helpText}>
          Every Style-Color ID receives at least this minimum. Rest of the units
          will be distributed as per demand.
        </p>
      </div>
    </div>
  );
};
