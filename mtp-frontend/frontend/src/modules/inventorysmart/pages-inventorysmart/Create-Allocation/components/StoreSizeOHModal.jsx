import {
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import Loader from "core/Utils/Loader/loader";
import { useStyles } from "../../Allocation-Reporting/Store-Stock-Drilldown/store-stock-drilldown-table-view";
import AgGridComponent from "core/Utils/agGrid";
import { useEffect, useState } from "react";
import { isEmpty } from "lodash";

const StoreSizeOHModal = ({
  storeDetails,
  columns,
  storeSizeData,
  loader,
  setOpenPopup,
}) => {
  const [column, setColumn] = useState([]);
  const [data, setData] = useState([]);
  const classes = useStyles();

  useEffect(() => {
    if (
      !isEmpty(storeSizeData) &&
      !isEmpty(storeDetails) &&
      !isEmpty(columns)
    ) {
      setColumn(columns);
      setData([storeSizeData?.[storeDetails?.store_code]]);
    }
  }, [columns, storeSizeData, storeDetails]);
  return (
    <Dialog
      maxWidth={"md"}
      aria-labelledby="customized-dialog-title"
      open={true}
      fullWidth={true}
      disableEscapeKeyDown={true}
    >
      <DialogTitle id="customized-dialog-title">
        <Grid
          container
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Typography variant="h5" gutterBottom>
            {storeDetails.metric}
          </Typography>
          <Typography variant="h5" gutterBottom>
            {dynamicLabelsBasedOnTenant("article_number")}:{" "}
            {storeDetails.product_code}
          </Typography>
          <Typography variant="h5" gutterBottom>
            Store Number: {storeDetails.store_code}
          </Typography>
          <IconButton
            aria-label="close"
            onClick={() => setOpenPopup(false)}
            size="large"
          >
            <CloseIcon />
          </IconButton>
        </Grid>
      </DialogTitle>
      <DialogContent>
        <Loader loader={loader}>
          <div
            className={columns?.length < 3 ? classes.sizeSplitTableWidth : ""}
          >
            <AgGridComponent
              downloadAsExcel={true}
              disableExcelDownload={data?.length ? false : true}
              rowdata={data}
              columns={column}
              suppressFieldDotNotation
              sideBar={false}
            />
          </div>
        </Loader>
      </DialogContent>
    </Dialog>
  );
};

export default StoreSizeOHModal;
