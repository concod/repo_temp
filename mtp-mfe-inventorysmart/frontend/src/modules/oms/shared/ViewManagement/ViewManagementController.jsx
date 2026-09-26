import { useCallback, useEffect } from "react";
import { useDispatch } from "react-redux";
import { noop } from "lodash";
import PropTypes from "prop-types";

import ListingViews from "./components/ListingViews/ListingViews";

import { getScreensMapping } from "./api/screensMapping.api";
import { getUserRole } from "./api/userRole.api";
import { getTemplateDetails } from "./api/viewManagementTemplate.api";

/**
 * skipBootstrap — when true the parent has already dispatched getScreensMapping /
 * getUserRole on mount and owns fetchTemplateDetails; skip internal side-effects so
 * ViewManagementController is a pure UI pass-through.
 *
 * externalFetchTemplate — caller-owned fetchTemplateDetails; used instead of the
 * internally-created one when skipBootstrap is true.
 */
const ViewManagementController = ({
  viewDetailsApplyCallback = noop,
  screenId,
  disabled = false,
  skipBootstrap = false,
  skipInitialBootstrap = false,
  externalFetchTemplate = null,
}) => {
  const dispatch = useDispatch();

  useEffect(() => {
    if (skipBootstrap) return;
    dispatch(getScreensMapping());
    dispatch(getUserRole());
  }, [dispatch, skipBootstrap]);

  const internalFetchTemplateDetails = useCallback(
    (sid, callback) => {
      dispatch(getTemplateDetails(sid, [], callback));
    },
    [dispatch]
  );

  const fetchTemplateDetails = externalFetchTemplate ?? internalFetchTemplateDetails;

  return (
    <>
      <ListingViews
        fetchTemplateDetails={fetchTemplateDetails}
        screenId={screenId}
        viewDetailsApplyCallback={viewDetailsApplyCallback}
        disabled={disabled}
        skipInitialBootstrap={skipInitialBootstrap}
      />
    </>
  );
};

ViewManagementController.propTypes = {
  screenId: PropTypes.number,
  viewDetailsApplyCallback: PropTypes.func,
  disabled: PropTypes.bool,
  skipBootstrap: PropTypes.bool,
  skipInitialBootstrap: PropTypes.bool,
  externalFetchTemplate: PropTypes.func,
};

export default ViewManagementController;
