import Dashboard from "./components/dashboard";
import BreadCrumbs from "../assort-bread-crumbs";
import { useHistory } from "react-router";
const AssortDashboard = (props) => {
  const history = useHistory();
  return (
    <>
      <BreadCrumbs planStep={0} location={history.location.pathname} />
      <Dashboard location={history.location.pathname} />
    </>
  );
};

export default AssortDashboard;
