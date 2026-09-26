import { makeStyles } from "@mui/styles";
import CalenderIcon from "assets/calender_date_strip_icon.svg";
import { useTranslation } from "impact-ui-v3";
import moment from "moment";

const useStyles = makeStyles(() => ({
  dateStripContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F4F1F9",
    border: "1px solid #BFAFD9",
    borderRadius: "12px",
    padding: "8px",
    width: "100%",
    boxSizing: "border-box",
    height: "48px",
    marginBottom: "24px",
    "& .date-strip-left-section": {
      display: "flex",
      alignItems: "center",
      gap: "12px",
    },
    "& .date-strip-info": {
      display: "flex",
      alignItems: "center",
      gap: "12px",
    },
    "& svg": {
      borderRadius: "10px",
    },
    "& .date-strip-date-text": {
      color: "#60697D",
      fontFamily: "Manrope",
      fontSize: "14px",
      fontWeight: 700,
      lineHeight: "21px",
    },
    "& .date-strip-date-value": {
      color: "#31416E",
      fontFamily: "Manrope",
      fontSize: "14px",
      fontWeight: 700,
      lineHeight: "21px",
      marginLeft: "5px",
    },
    "& .date-strip-divider": {
      width: "1px",
      height: "16px",
      backgroundColor: "#D9DDE7",
    },
    "& .date-strip-warning": {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "2px 8px",
      borderRadius: "1000px",
      border: "1px solid #8C6F06",
      backgroundColor: "#FFFFFF",
      fontFamily: "Manrope",
      fontSize: "14px",
      fontWeight: 500,
      lineHeight: "20px",
      color: "#8C6F06",
      height: "24px",
    },
  },
}));

const DateStrips = ({ createdDate, purgeDate }) => {
  const classes = useStyles();
  const { t } = useTranslation();

  return (
    <div className={classes.dateStripContainer}>
      <div className="date-strip-left-section">
        <CalenderIcon />
        <div className="date-strip-info">
          <div>
            <span className="date-strip-date-text">
              {t("inventorysmart.createdDate")}:
            </span>
            <span className="date-strip-date-value">{createdDate}</span>
          </div>
          {purgeDate && (
            <>
              <div className="date-strip-divider" />
              <div>
                <span className="date-strip-date-text">
                  {t("inventorysmart.purgeDate")}:
                </span>
                <span className="date-strip-date-value">{purgeDate}</span>
              </div>
            </>
          )}
          {purgeDate && moment().isSame(moment(purgeDate), "day") && (
            <div className="date-strip-warning">
              {t("inventorysmart.s2sDateWarning")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DateStrips;
