import PropTypes from "prop-types";
import { Prompt } from "impact-ui-v3";
import { DELETE_VIEW } from "./deleteView.constant";
import * as apis from "../../api/deleteView.api";
import { bindActionCreators } from "redux";
import { connect } from "react-redux";
import "components/planSmart/SidePanel/style.scss";

const DeleteView = (props) => {
  const {
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    viewId,
    deleteViewApi,
    screenId
  } = props;
  return (
    <Prompt
      isOpen={isDeleteModalOpen}
      title={DELETE_VIEW.TITLE}
      variant={DELETE_VIEW.VARIANT}
      primaryButtonLabel={DELETE_VIEW.PRIMARY_BUTTON_LABEL}
      secondaryButtonLabel={DELETE_VIEW.SECONDARY_BUTTON_LABEL}
      style={{ backgroundColor: "rgba(0, 0, 0, 0.3)" }}
      onPrimaryButtonClick={() => {
        deleteViewApi(viewId, setIsDeleteModalOpen,screenId);
      }}
      onSecondaryButtonClick={() => {
        setIsDeleteModalOpen(false);
      }}
    >
      {DELETE_VIEW.CONTENT}
    </Prompt>
  );
};

DeleteView.propTypes = {
  isDeleteModalOpen: PropTypes.bool.isRequired,
  setIsDeleteModalOpen: PropTypes.func.isRequired,
  viewId: PropTypes.number.isRequired,
  deleteViewApi: PropTypes.func.isRequired
};

const mapDispatchToProps = (dispatch) => {
  return {
    ...bindActionCreators({ ...apis }, dispatch)
  };
};

export default connect(null, mapDispatchToProps)(DeleteView);
