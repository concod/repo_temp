import Configuration from "./configuration";
import HeaderBreadCrumbs from "../../../Utils/HeaderBreadCrumbs";
import { useNavigate } from "react-router-dom-v5-compat";

/**
 * Heading Component for the filter configuration screen
 */
const NavigationCrumbs = (props) => {
  const navigate = useNavigate();
  return (
    <HeaderBreadCrumbs
      options={[
        {
          label: "Filters Configuration",
          id: 1,
          action: () => {
            navigate("/filters");
          },
        },
      ]}
    ></HeaderBreadCrumbs>
  );
};

/**
 * Starting point of the Filters screen
 * @param {*} props
 */
const Navigation = () => {
  return (
    <>
      <NavigationCrumbs />
      <Configuration />
    </>
  );
};

export default Navigation;
