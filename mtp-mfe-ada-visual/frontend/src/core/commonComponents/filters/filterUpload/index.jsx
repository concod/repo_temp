import FilterSectionMenuItem from "./filterSectionMenuItem";
import makeStyles from "@mui/styles/makeStyles";
import globalStyles from "core/Styles/globalStyles";
import { pxToRem } from "../../../Utils/functions/utils";
import { useEffect } from "react";
import { Typography } from "@mui/material";

const useStyles = makeStyles((theme) => ({
  wrapper: {
    width: "100%",
    marginBottom: pxToRem(16),
    marginTop: pxToRem(8),
    flexWrap: "wrap",
  },
  headerLabel: {
    fontFamily: "Manrope",
    fontWeight: 700,
    fontSize: pxToRem(12),
    lineHeight: pxToRem(20),
    color: theme.palette.text.boldHeadingBlue,
  },
}));
const FilterUploadStrip = ({ props }) => {
  const globalClasses = globalStyles();
  const classes = useStyles();
  const { heirarchy, selectedFilterChoice, setSelectedFilterChoice } = props;
  const options = [
    {
      label: `${heirarchy} heirarchy`,
      icon: <span class="material-symbols-outlined">package_2</span>,
    },
    {
      label: "Upload Excel",
      icon: <span class="material-symbols-outlined">upload</span>,
    },
    {
      label: "Copy and Paste",
      icon: <span class="material-symbols-outlined">content_copy</span>,
    },
  ];
  useEffect(() => {
    setSelectedFilterChoice(options?.[0]?.label);
  }, []);
  return (
    <div>
      <Typography variant="text" className={classes.headerLabel}>
        How you want to select the product?
      </Typography>
      <div
        className={`${classes.wrapper} ${globalClasses.flexRow} ${globalClasses.gap} ${globalClasses.verticalAlignCenter}`}
      >
        {options?.map((item, index) => (
          <FilterSectionMenuItem
            props={{ item, selectedFilterChoice, setSelectedFilterChoice }}
          />
        ))}
      </div>
    </div>
  );
};

export default FilterUploadStrip;
