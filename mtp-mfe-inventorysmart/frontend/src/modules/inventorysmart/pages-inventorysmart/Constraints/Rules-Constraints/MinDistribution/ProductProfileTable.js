import React, { useState } from "react";
import Loader from "core/Utils/Loader/loader";
import { useExceptionStyles } from "../../../Exceptions-stores/exceptionStyles";
import InfoIcon from "@mui/icons-material/Info";
import CloseIcon from "@mui/icons-material/Close";
import AgGridComponent from "core/Utils/agGrid";
import { useTranslation } from "impact-ui-v3";

const ProductProfileTable = (props) => {
  const { t } = useTranslation();
  const [showInfoMessage, setShowInfoMessage] = useState(true);
  const useStyles = useExceptionStyles();

  const getTopCenterOptions = () => {
    let options = [];
    if (showInfoMessage) {
      options.push(
        <div className={useStyles.infoMessage}>
          <div className="info-message-text">
            <InfoIcon fontSize="small" />
            <p>{t("inventorysmart.rclProductProfileInfo")}</p>
          </div>
          <CloseIcon
            className="close-icon"
            onClick={() => {
              setShowInfoMessage(false);
            }}
          />
        </div>
      );
    }
    return options;
  };

  return (
    <Loader loader={props.distributionStrategyLoader}>
      <div className={useStyles.distributionStrategyTable}>
        {props.tableCols?.length > 0 && (
          <AgGridComponent
            rowdata={props.distributionStrategyData}
            columns={props.tableCols}
            selectAllHeaderComponent={false}
            pagination={false}
            sizeColumnsToFitFlag={true}
            uniqueRowId={"store_number"}
            tableHeader={t("inventorysmart.rclMinDistProductProfile")}
            topCenterOptions={getTopCenterOptions()}
            tableId="product-profile-min-distribution"
          />
        )}
      </div>
    </Loader>
  );
};

export default ProductProfileTable;
