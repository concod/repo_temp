import {
  Dialog,
  DialogActions,
  DialogContent,
  Typography,
  Button,
  LinearProgress,
} from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { useEffect, useState } from "react";
import { connect } from "react-redux";
import { getDefinitions } from "core/pages/product-grouping/product-grouping-service";
import ReactSelect from "../../../../Utils/select";

const useStyles = makeStyles((theme) => ({
  paperFullWidth: {
    overflowY: "visible",
  },
  dialogContent: {
    overflowY: "visible",
  },
  selectDefinitions: {
    color: theme.palette.text.primary,
  },
}));
const DefinitionasSubRule = (props) => {
  const [isLoading, setisLoading] = useState(false);
  const [definitions, setdefinitions] = useState([]);
  const [selectedDefinitions, setselectedDefinitions] = useState([]);
  const getOptions = () => {
    let filteredDefinitions = [...definitions];

    //If it is updating a subrule, remove the edited definition from subrules dropdown
    if (props.type === "edit") {
      filteredDefinitions = filteredDefinitions.filter((dfn) => {
        return dfn.pgd_code !== props.editDefinition.pgd_code;
      });
    }

    return filteredDefinitions.map((dfn) => {
      return {
        ...dfn,
        label: dfn.name,
        value: dfn.pgd_code,
      };
    });
  };
  useEffect(() => {
    const fetchDefinitions = async () => {
      setisLoading(true);
      try {
        let body = {
          search: [],
          range: [],
          sort: [],
        };
        const res = await props.getDefinitions(body, 100, 0);
        setdefinitions(res.data.data);
        setisLoading(false);
      } catch (error) {
        setisLoading(false);
        //Error handling
      }
    };
    if (props.isOpen) {
      fetchDefinitions();
    }
  }, [props.isOpen]);
  const handleClose = () => {
    setselectedDefinitions([]);
    setdefinitions([]);
    props.handleClose();
  };
  const classes = useStyles();
  return (
    <Dialog
      id="productGrpingDfnasSubDialog"
      classes={{
        paperFullWidth: classes.paperFullWidth,
      }}
      maxWidth="sm"
      fullWidth={true}
      open={props.isOpen}
    >
      {isLoading && <LinearProgress />}
      <DialogContent className={classes.dialogContent}>
        <Typography
          variant="body1"
          component="h4"
          className={classes.selectDefinitions}
        >
          Select Definitions
        </Typography>
        <div style={{ position: "relative", zIndex: 2 }}>
          <ReactSelect
            id="productGrpingDfnsDrpDwn"
            options={getOptions()}
            isMulti={true}
            value={selectedDefinitions}
            onChange={(options) => setselectedDefinitions(options)}
            maxMenuHeight={200}
          />
        </div>
      </DialogContent>
      <DialogActions>
        <Button
          id="productGrpingDfnasSubCnclBtn"
          onClick={handleClose}
          variant="outlined"
          color="primary"
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={() => props.addedDefns(selectedDefinitions)}
          id="productGrpingDfnasSubAddBtn"
        >
          Add
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const mapActionsToProps = {
  getDefinitions,
};
export default connect(null, mapActionsToProps)(DefinitionasSubRule);
