import makeStyles from "@mui/styles/makeStyles";
import globalStyles from "core/Styles/globalStyles";
import { pxToRem } from "core/Utils/functions/utils";
import { RadioButtonGroup } from "impact-ui-v3";

const useStyles = makeStyles((theme) => ({
  itemBody: {
    height: pxToRem(32),
    border: `1px solid ${theme.palette.background.separaterColor}`,
    borderRadius: pxToRem(8),
    padding: `${pxToRem(6)} ${pxToRem(12)}`,
    gap: pxToRem(4),
  },
  label: {
    fontFamily: "Manrope",
    fontWeight: 500,
    fontSize: pxToRem(14),
    lineHeight: pxToRem(20),
    color: theme.palette.colours.neutralGrey,
  },
  icon: {
    "& span": {
      color: theme.palette.colours.neutralGrey,
      fontSize: pxToRem(15),
      aspectRatio: "1/1",
      marginTop: `${pxToRem(2)}`,
    },
  },
  separatorLine: {
    minHeight: pxToRem(12),
    borderRight: `1px solid ${theme.palette.background.separaterColor}`,
    margin: `0 ${pxToRem(4)}`,
  },
  radioGroupWrapper: {
    "& .ia-radioButton": {
      margin: "unset",
      padding: "unset",

      "& .MuiRadio-root": {
        padding: pxToRem(4),
      },
    },
  },
  blueHighlight: {
    borderColor: theme.palette.colours.brightRoyalBlue,
    "& span": {
      color: theme.palette.colours.brightRoyalBlue,
    },
  },
}));
const FilterSectionMenuItem = ({ props }) => {
  const globalClasses = globalStyles();
  const classes = useStyles();
  const { item, selectedFilterChoice, setSelectedFilterChoice } = props;
  return (
    <div
      className={`${classes.itemBody} ${globalClasses.flexRow} ${
        globalClasses.verticalAlignCenter
      } ${selectedFilterChoice === item.label && classes.blueHighlight}`}
    >
      <RadioButtonGroup
        orientation="column"
        className={classes.radioGroupWrapper}
        options={[
          {
            label: item.label,
            value: item.label,
          },
        ]}
        selectedOption={selectedFilterChoice}
        onChange={(e) => setSelectedFilterChoice(e.target.value)}
      />
      <div className={classes.separatorLine}></div>
      <span className={classes.icon}>{item.icon}</span>
    </div>
  );
};

export default FilterSectionMenuItem;
