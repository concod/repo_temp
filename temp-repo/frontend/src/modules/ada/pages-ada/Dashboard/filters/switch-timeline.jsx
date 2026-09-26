import { useDispatch } from "react-redux";
import { setSwitch } from "modules/ada/services-ada/ada-dashboard/ada-dashboard-services";
import Select from "./select";
import { Grid } from "@mui/material";

const SwitchTimeline = (props) => {
  const dispatch = useDispatch();

  // const switchValue = useSelector(
  //   (store) => store?.adaReducer?.adaDashboardReducer?.switchTimeLine
  // );

  const setSelected = (val) => {
    dispatch(setSwitch(val));
  };
  return (
    <Grid xs={2.5} item>
      <Select {...props} isMulti={false} onChange={setSelected} />
    </Grid>
  );
};

export default SwitchTimeline;
