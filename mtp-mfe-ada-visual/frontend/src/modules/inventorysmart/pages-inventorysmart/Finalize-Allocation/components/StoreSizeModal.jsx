import {
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useStyles } from "../../Allocation-Reporting/Store-Stock-Drilldown/store-stock-drilldown-table-view";
import AgGridComponent from "core/Utils/agGrid";

const StoreSizeModal = ({ columns, storeSizeData, setOpenPopup }) => {
  const classes = useStyles();
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
            {"Store Number" + " "}: {storeSizeData?.[0]?.store_code}
          </Typography>
          <IconButton onClick={() => setOpenPopup(false)} size="large">
            <CloseIcon />
          </IconButton>
        </Grid>
      </DialogTitle>
      <DialogContent>
        <div className={columns?.length < 3 ? classes.sizeSplitTableWidth : ""}>
          <AgGridComponent
            downloadAsExcel={true}
            rowdata={storeSizeData}
            columns={columns}
            suppressFieldDotNotation
            sideBar={false}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StoreSizeModal;
