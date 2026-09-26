import {
  fetchUnitDefnById,
  setSelectedStyleId,
  setUnitDefnName,
  setUnitAttributeType,
  setStyleAttributes,
} from "../product-unit-definition-service";
import { connect } from "react-redux";
import Create from "./createnew";
import { useParams } from "react-router-dom";
const EditDefinition = (props) => {
  const params = useParams();
  return (
    <>
      <Create
        defn_id={params.defn_id}
        style_id={params.defn_id}
        screen_status="edit"
      />
    </>
  );
};
const mapActionsToProps = {
  fetchUnitDefnById,
  setSelectedStyleId,
  setUnitDefnName,
  setUnitAttributeType,
  setStyleAttributes,
};
export default connect(null, mapActionsToProps)(EditDefinition);
