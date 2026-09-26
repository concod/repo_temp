import { useSelector } from "react-redux";
import {
  planKpiConfigSelector,
  planKpiConfigV2Selector
} from "../slice/planningScreen.slice";

const useKpiConfig = (metricKey, isV2) => {
  const kpiConfig = useSelector(
    isV2 ? planKpiConfigV2Selector : planKpiConfigSelector
  );

  return kpiConfig[metricKey];
};

export default useKpiConfig;
