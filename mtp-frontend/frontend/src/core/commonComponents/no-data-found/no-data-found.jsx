import { Button } from "@mui/material";
import { useStyles } from "./style";
import NoDataFoundSvg from "assets/noDataFound.svg";

const NoDataFound = () => {
  const classes = useStyles();
  return (
    <div className={classes.noDataFoundOuterContainer}>
      <div className={classes.noDataFoundContainer}>
        <NoDataFoundSvg viewBox="201 194" />
        {/* <p className={classes.noDataFoundContainerHeader}>No data found</p> */}
        <p className={classes.noDataFoundContainerSubHeader}>
          Apply mandatory filters to view screen
        </p>
        {/* <Button type="button" variant="contained">
          Select Filters
        </Button> */}
      </div>
    </div>
  );
};

export default NoDataFound;
