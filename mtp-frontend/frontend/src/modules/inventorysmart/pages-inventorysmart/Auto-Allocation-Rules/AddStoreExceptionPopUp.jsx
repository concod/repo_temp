import { useEffect } from "react";
import { useState } from "react";
import { getColumnsAg } from "core/actions/tableColumnActions";
import {
  addStoreException,
  getStoreGroupDetails,
} from "modules/inventorysmart/services-inventorysmart/Auto-Allocation-Rules/auto-allocation-rules-service";
import {
  ERROR_MESSAGE,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { connect } from "react-redux";
import { addSnack } from "core/actions/snackbarActions";
import { useRef } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import makeStyles from "@mui/styles/makeStyles";
import { useMemo } from "react";
import Loader from "core/Utils/Loader/loader";
import Form from "core/Utils/form";
import globalStyles from "Styles/globalStyles";

const useStyles = makeStyles(() => ({
  root: {
    "& .MuiDialog-paperWidthSm": {
      maxWidth: "60rem",
      borderRadius: "0.6rem",
    },
  },
  contentBody: {
    minHeight: "8rem",
    border: "none",
  },
}));

const AddStoreExceptionPopUp = (props) => {
  const { currentRuleCode, onCancel, fetchStoreExceptions, setParentRender } = props;

  const globalClasses = globalStyles();
  const classes = useStyles();
  const [channelOptions, setChannelOptions] = useState([]);
  const [storeOptions, setStoreOptions] = useState([]);
  const [storeData, setStoreData] = useState([]);
  const [channelSelected, setChannelSelected] = useState({});
  const [storesSelected, setStoresSelected] = useState({});
  const [loader, setLoader] = useState(false);

  const storeExceptionPopUpOptions = useMemo(
    () => [
      {
        label: "Channel",
        field_type: "dropdown",
        accessor: "channel",
        isDisabled: false,
        options: channelOptions,
        isMulti: true,
      },
      {
        label: "Stores",
        field_type: "dropdown",
        accessor: "stores",
        isDisabled: false,
        isMulti: true,
        options: storeOptions,
      },
    ],
    [channelOptions, storeOptions]
  );

  useEffect(async () => {
    setLoader(true);
    try {
      let response = await props.getStoreGroupDetails(currentRuleCode);
      let data = response?.data.data;
      const channelOptions = data.map((channel) => {
        return {
          label: channel.channel,
          value: channel.channel,
        };
      });
      setChannelOptions(channelOptions);
      setStoreData(data);
      setLoader(false);
    } catch(err) {
      displaySnackMessages(ERROR_MESSAGE, "error");
      setLoader(false);
    }
  }, []);

  const displaySnackMessages = (message, variance, onClose) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
        ...(onClose && { onClose: onClose }),
      },
    });
  };

  const handleChange = (data, type) => {
    if (type === "channel") {
      let updatedStoreOptions = [];
      let selectedStoresAsPerChannel = storeData.filter((channel) =>
        data.channel.includes(channel.channel)
      );
      const allStores = selectedStoresAsPerChannel.reduce(
        (accumulator, current) => {
          return accumulator.concat(current.store_info_array);
        },
        []
      );
      updatedStoreOptions = allStores.map((store) => {
        return {
          label: store.store_name,
          value: store.store_code,
        };
      });
      setChannelSelected(data.channel);
      setStoreOptions(updatedStoreOptions);
    } else if (type === "stores") {
      setStoresSelected(data.stores);
    }
  };

  const handleStoreAddition = async () => {
    setParentRender(false);
    try {
      let req = {
        rule_code: currentRuleCode,
        store_list: storesSelected,
      };
      let response = await props.addStoreException(req);
      displaySnackMessages(response.data?.message, "success");
      onCancel();
      fetchStoreExceptions();
      setParentRender(true);
    } catch (e) {
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };

  return (
    <Dialog
      onClose={onCancel}
      className={classes.root}
      maxWidth={"lg"}
      aria-labelledby="customized-dialog-title"
      open={true}
      fullWidth={true}
      disableEscapeKeyDown={true}
    >
      <Loader loader={loader}>
      <DialogTitle id="customized-dialog-title">
        <Grid
          container
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <IconButton aria-label="close" onClick={onCancel} size="large">
            <CloseIcon />
          </IconButton>
        </Grid>
      </DialogTitle>
      <DialogContent style={{ height: "500px" }}>
        <div className={classes.contentBody}>
          <div className={globalClasses.marginAround}>
            <Form
              layout={"vertical"}
              maxFieldsInRow={5}
              handleChange={handleChange}
              fields={storeExceptionPopUpOptions}
              updateDefaultValue={false}
              defaultValues={""}
              labelWidthSpan={2}
              fieldTypeWidthSpan={6}
            ></Form>
          </div>
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} color="primary">
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleStoreAddition}
          color="primary"
        >
          Apply
        </Button>
      </DialogActions>
      </Loader>
    </Dialog>
  );
};

const mapDispatchToProps = (dispatch) => {
  return {
    addStoreException: (body) => dispatch(addStoreException(body)),
    getStoreGroupDetails: (body) => dispatch(getStoreGroupDetails(body)),
    getColumnsAg: (queryParam, levelsJSON, actions) =>
      dispatch(getColumnsAg(queryParam, levelsJSON, actions)),
    addSnack: (snack) => dispatch(addSnack(snack)),
  };
};

export default connect(null, mapDispatchToProps)(AddStoreExceptionPopUp);
