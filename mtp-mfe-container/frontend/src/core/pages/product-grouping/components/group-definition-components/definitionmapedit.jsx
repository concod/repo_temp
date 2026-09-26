import Definition from "./Definition";
import { useEffect, useState } from "react";
import {
  fetchGroupDefinitionById,
  ToggleLoader,
} from "core/pages/product-grouping/product-grouping-service";
import { connect } from "react-redux";
import LoadingOverlay from "../../../../Utils/Loader/loader";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import { useNavigate } from "react-router-dom-v5-compat";
import { useParams } from "react-router-dom";

const EditMapDefinition = (props) => {
  const params = useParams();
  const group_id = params.group_id;
  const prevScr = `/product-grouping/group-definition-mapping/${group_id}`;
  const [definitionObj, setdefinitionObj] = useState({});
  const navigate = useNavigate();
  const routeOptions = [
    {
      label: "Home",
      to: "/home",
    },
    {
      id: "product_grouping_home_scr",
      label: dynamicLabelsBasedOnTenant("product_grouping", "core"),
      action: () => {
        navigate("/product-grouping");
      },
    },
    {
      id: "product_grouping_definitions_scr",
      label: "Group Definition Mapping",
      action: () => {
        navigate(prevScr);
      },
    },
    {
      id: "product_group_defn_mapping_edit_definition",
      label: "Edit Definition",
      action: () => null,
    },
  ];
  useEffect(() => {
    const fetchDefinitionData = async () => {
      try {
        props.ToggleLoader(true);
        const res = await props.fetchGroupDefinitionById(params.def_id);
        setdefinitionObj(res.data.data);
        props.ToggleLoader(false);
      } catch (error) {
        //error handling
      }
    };
    fetchDefinitionData();
  }, []);
  return (
    <LoadingOverlay loader={props.isLoading} spinner>
      <Definition
        id="productGrpingDfnMapEdit"
        type="edit"
        definition={definitionObj}
        routeOptions={routeOptions}
        prevScr={prevScr}
      />
    </LoadingOverlay>
  );
};
const mapStateToProps = (state) => {
  return {
    isLoading: state.productGroupReducer.isLoading,
  };
};
const mapActionsToProps = {
  fetchGroupDefinitionById,
  ToggleLoader,
};
export default connect(mapStateToProps, mapActionsToProps)(EditMapDefinition);
