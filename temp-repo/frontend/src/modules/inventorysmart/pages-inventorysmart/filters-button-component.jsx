import Button from "@mui/material/Button";
import PropTypes from "prop-types";

import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";

const FiltersButtonComponent = ({
  filterButtonLabel,
  resetButtonLabel,
  disableFilters, //Disabling the filters if user has been redirected to Create Allocation from different page
  onFilterHandler,
  onResetHandler,
}) => {
  const classes = useStyles();

  return (
    <div className={classes.dashboardFiltersBtnsDiv}>
      <Button
        variant="contained"
        color="primary"
        className={classes.button}
        onClick={() => onFilterHandler()}
        disabled={disableFilters}
      >
        {filterButtonLabel}
      </Button>
      <Button
        variant="outlined"
        color="primary"
        className={classes.button}
        onClick={() => onResetHandler()}
        disabled={disableFilters}
      >
        {resetButtonLabel}
      </Button>
    </div>
  );
};

FiltersButtonComponent.propTypes = {
  filterButtonLabel: PropTypes.string,
  resetButtonLabel: PropTypes.string,
  onResetHandler: PropTypes.func.isRequired,
  onFilterHandler: PropTypes.func.isRequired,
};

export default FiltersButtonComponent;
