import { useStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";
import globalStyles from "core/Styles/globalStyles";
import colours from "core/Styles/colours";
import "./SampleCalculation.css";
import { formatStringDate } from "core/Utils/functions/utils";
import { getTenantTimeZoneDetails } from "core/commonComponents/coreComponentScreen/utils";

const SampleSection = (props) => {
    const { data, sectionLabel } = props;
    const classes = useStyles();
    const globalClasses = globalStyles();
    const { tenantDateFormat } = getTenantTimeZoneDetails();


    const headers = Object.keys(data[0] || []);
    const labelsArray = headers.map((label) =>
        label
            .toString()
            .replace("_", " ")
            .replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1))
    );

    const getValue = (item, key) => {
        let value = item[key];
        if (Number.isFinite(Number(value))) {
            return Number(value).toFixed(0);
        }
        else if (key === "date") {
            return formatStringDate(
                value,
                false,
                false,
                tenantDateFormat
            );
        }
        return value;
    }

    const isNumberType = (key) => {
        return Number.isFinite(Number(data[0]?.[key]));
    }

    return (
        <div className={`${globalClasses.marginBottom} sampleTableWrapper`}>
            <div className={`${globalClasses.marginBottom} ${classes.alertsValuesStyles}`}>{sectionLabel.charAt(0).toUpperCase() + sectionLabel.slice(1)}</div>
            <div className="sampleTableScrollWrapper">
                <div
                    className={`${classes.alertsRowsStyles} sampleRowContainer sampleRowHeader`}
                >
                    {labelsArray.map((header, index) => (
                        <div
                            key={index}
                            className={`${classes.alertsTextWrapper} sampleRowCell ${isNumberType(headers[index]) ? "sampleNumberValue" : ""}`}
                        >
                            <span className={classes.alertsLabelStyles} style={{ color: colours.boldHeadingBlue }}>{header}</span>
                        </div>
                    ))}
                </div>
                <div className="sampleRowsBody">
                    {data.map((item, index) => (
                        <div
                            key={index}
                            className={`${classes.alertsRowsStyles} sampleRowContainer sampleRowBody`}
                        >
                            {headers.map((key, key_index) => (
                                <div
                                    key={key_index}
                                    className={`${classes.alertsTextWrapper} sampleRowCell ${isNumberType(key) ? "sampleNumberValue" : ""}`}
                                >
                                    <span className={classes.alertsLabelStyles}>{getValue(item, key)}</span>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
export default SampleSection;
