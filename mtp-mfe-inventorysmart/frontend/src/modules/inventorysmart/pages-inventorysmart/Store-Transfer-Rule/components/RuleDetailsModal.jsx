import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import { Modal, useTranslation } from "impact-ui-v3";
import Loader from "core/Utils/Loader/loader";
import AgGridComponent from "core/Utils/agGrid";
import { addSnack } from "core/actions/snackbarActions";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { cloneDeep } from "lodash";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import globalStyles from "core/Styles/globalStyles";
import { ERROR_MESSAGE } from "../../../constants-inventorysmart/stringConstants";
import { fetchStoreTransferRuleDetail } from "../../../services-inventorysmart/Store-Transfer-Rule/store-transfer-rule";

const RuleDetailsModal = (props) => {
  const { t } = useTranslation();
  const [ruleDetailColumns, setRuleDetailColumns] = useState([]);
  const [ruleDetailLoader, setRuleDetailLoader] = useState(false);
  const globalClasses = globalStyles();

  const gridRef = useRef(null);

  useEffect(() => {
    if (props.isOpen && props.ruleId) {
      fetchRuleDetails();
    }
  }, [props.isOpen, props.ruleId]);

  const handleErrorMessage = (e, defaultError = ERROR_MESSAGE) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message) displaySnackMessages(errObj?.message, "error");
    else displaySnackMessages(defaultError, "error");
  };

  const displaySnackMessages = (message, variance, onClose) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
        onClose: onClose,
      },
    });
  };

  const fetchRuleDetails = async () => {
    setRuleDetailLoader(true);
    
    try {
      // Only fetch column configuration
      let cols = [];
      cols = await getColumnsAg("table_name=Store_Transfer_rule")();
      let colActions = agGridColumnFormatter(
        cloneDeep(cols),
        null,
        {}
      );
      setRuleDetailColumns(colActions);
      
    } catch (e) {
      handleErrorMessage(e);
    } finally {
      setRuleDetailLoader(false);
    }
  };
  

  const handleTableDataFetch = async (body, pageIndex, params) => {
    try {
      setRuleDetailLoader(true);
      if (!props.ruleId) {
        setRuleDetailLoader(false);
        return {
          data: [],
          totalCount: 0
        };
      }

      const requestBody = {
        rule_id: props.ruleId,
        meta: {
          ...body,
          limit: { limit: 10, page: pageIndex + 1 },
        },
      };
      const response = await props.fetchStoreTransferRuleDetail(requestBody);
      
      if (response?.data?.data) {
        const allData = response?.data?.data;
        const totalCount = response?.data?.total
        
        setRuleDetailLoader(false);
        return {
          data: allData,
          totalCount: totalCount
        };
      } else {
        setRuleDetailLoader(false);
        return {
          data: [],
          totalCount: 0
        };
      }
    } catch (error) {
      handleErrorMessage(error);
      setRuleDetailLoader(false);
      return {
        data: [],
        totalCount: 0
      };
    }
  };

  return (
    <Modal
      open={props.isOpen}
      title={t("inventorysmart.ruleDetails")}
      onClose={props.onClose}
      size="Large"
      onSecondaryButtonClick={props.onClose}
      secondaryButtonLabel={t("inventorysmart.cancel")}
      width="80%"
      height="80%"
    >
      <Loader loader={ruleDetailLoader}>
        <div className={globalClasses.paddingAround}>
          {ruleDetailColumns.length > 0 ? (
            <AgGridComponent
              columns={ruleDetailColumns}
              manualCallBack={handleTableDataFetch}
              rowModelType="serverSide"
              serverSideStoreType="partial"
              cacheBlockSize={10}
              paginationPageSize={10}
              pagination={true}
              loadTableInstance={(params) => { gridRef.current = params; }}
              uniqueRowId={"mapping_id"}
            />
          ) : (
            <div className={globalClasses.centerAlign}>
              <p>{t("inventorysmart.noDetailsAvailableForThisRule")}</p>
            </div>
          )}
        </div>
      </Loader>
    </Modal>
  );
};

const mapDispatchToProps = (dispatch) => {
  return {
    fetchStoreTransferRuleDetail: (payload) => dispatch(fetchStoreTransferRuleDetail(payload)),
    addSnack: (snack) => dispatch(addSnack(snack)),
  };
};

export default connect(null, mapDispatchToProps)(RuleDetailsModal);
