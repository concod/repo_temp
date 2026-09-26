import { useState, useEffect } from "react";
import {
  getBreadCrumbHeader,
  formatBreadCrumbs,
} from "../utils-assortsmart/utilityFunctions";
import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import { getBreadCrumbHeaderClusterSmart } from "modules/clusterSmart/utils-clusterSmart/utilityFunctions";
import { useHistory } from "react-router";
const AssortBreadCrumbs = (props) => {
  const [headers, setheaders] = useState([]);
  const history = useHistory();
  const historyRouting = (options) => {
    return options.map((option) => {
      return {
        ...option,
        action: () => history.push(option.route),
      };
    });
  };
  useEffect(() => {
    if (props.planStep || props.planStep === 0) {
      const options = props.location.includes("cluster-smart") ? getBreadCrumbHeaderClusterSmart(props.planStep,props.location) : getBreadCrumbHeader(props.planStep, props.location);
      let formattedOptions = historyRouting(options);
      formattedOptions = formatBreadCrumbs(formattedOptions);
      setheaders(formattedOptions);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.planStep, props.location]);
  return <HeaderBreadCrumbs options={headers} />;
};

export default AssortBreadCrumbs;
