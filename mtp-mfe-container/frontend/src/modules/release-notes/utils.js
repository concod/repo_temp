import PreviewIcon from "@mui/icons-material/Preview";
import moment from "moment";

export const TimeCreatedRenderer = (instance) => (
  <div>{moment(instance.data.timeCreated).format("DD-MMM-YYYY")}</div>
);

export const UrlRenderer = (instance) => (
  <PreviewIcon
    onClick={() => window.open(instance.data.url, "_blank")}
  />
);