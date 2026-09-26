import { connect } from "react-redux";
import { useState, memo, useCallback, useEffect } from "react";
import { Panel } from "impact-ui-v3";
import makeStyles from "@mui/styles/makeStyles";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import Loader from "core/Utils/Loader/loader";
import { getViewPackConfiguration } from "modules/inventorysmart/services-inventorysmart/Finalize/store-view-services";
import { ERROR_MESSAGE } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { addSnack } from "core/actions/snackbarActions";
import './ViewPackConfiguration.scss';

const useStyles = makeStyles(() => ({
  packConfigPanel: {
    fontFamily: "Manrope",
    "& .impact_drawer_container_large": {
      width: "480px",
    },
  },
  packList: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    marginTop: "0.5rem",
  },
}));

const formatQuantity = (qty) => {
  return qty < 10 ? `0${qty}` : `${qty}`;
};

const PackItem = memo(({ pack, isExpanded, onToggle }) => {
  return (
    <div className="pack-item">
      <div
        className="pack-header"
        onClick={() => onToggle(pack.pack_type_id)}
      >
        <div className="pack-header-name">
          <div className="pack-icon">
            {isExpanded ? (
              <ExpandLessIcon />
            ) : (
              <ExpandMoreIcon />
            )}
          </div>
          <span>{pack.pack_type_id}</span>
        </div>
        <span className="pack-total">Total: {pack.total_units}</span>
      </div>
      {isExpanded && (
        <div className="chip-container">
          <div className="chip-content">
            {pack.sizes.map((sizeItem, idx) => (
              <span key={`${sizeItem.size}-${idx}`} className="chip">
                {sizeItem.size}: <span className='chip-count'>{formatQuantity(sizeItem.units)}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

const ViewPackConfiguration = (props) => {
  const { isOpen, onClose } = props;
  const classes = useStyles();
  const [expandedPacks, setExpandedPacks] = useState({});
  const [data, setPackData] = useState([]);
  const [isLoading, setLoading] = useState(false);

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
        disableOnClose: true,
      },
    });
  };
  
  const handleErrorMessage = (e) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message) displaySnackMessages(errObj?.message, "error");
    else displaySnackMessages(ERROR_MESSAGE, "error");
  };

  useEffect(() => {
    if (isOpen) {
      const getPackData = async () => {
        try {
          setLoading(true);
          const payload = {
            "allocation_code": props.allocationCode,
            "article": props.selectedArticle,
            "ignore_allocation_code": "",
            "plan_status": props.planStatus,
            "plan_type": props.planType
          };
          const res = await props.getViewPackConfiguration(payload);
          if (res.data.status && res.data.data) {
            setPackData(res.data.data.pack_configurations);
          }
        } catch (err) {
          handleErrorMessage(err);
        } finally {
          setLoading(false);
        }
      };

      getPackData();
    }
  }, [isOpen]);

  const togglePack = useCallback((packName) => {
    setExpandedPacks((prev) => ({
      ...prev,
      [packName]: !prev[packName],
    }));
  }, []);

  const handleClose = () => {
    setExpandedPacks({});
    if (onClose) {
      onClose();
    }
  };

  return (
    <Panel
      className={classes.packConfigPanel}
      title="Pack Configurations"
      size="large"
      anchor="right"
      width={644}
      onClose={handleClose}
      open={isOpen}
    >
      <Loader loader={isLoading}>
        <div className={classes.packList}>
          {data.map((pack) => (
            <PackItem
              key={pack.pack_type_id}
              pack={pack}
              isExpanded={!!expandedPacks[pack.pack_type_id]}
              onToggle={togglePack}
            />
          ))}
        </div>
      </Loader>
    </Panel>
  );
};

const mapStateToProps = (store) => {
  return {
     planStatus:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .planStatus,
    planType:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .planType,
    allocationCode:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .allocationCode,
  }
}

const mapDispatchToProps = (dispatch) => ({
  getViewPackConfiguration: (payload) =>
    dispatch(getViewPackConfiguration(payload)),
  addSnack: (snack) => dispatch(addSnack(snack)),
});

export default connect(mapStateToProps, mapDispatchToProps)(ViewPackConfiguration);
