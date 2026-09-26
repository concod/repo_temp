import moment from "moment";

export const dateFormat = "DD-MM-YYYY HH:mm:ss";

export const formatTime = (timestamp) => {
  return moment(timestamp, dateFormat).format("HH:mm A");
};

export const formatDate = (timestamp) => {
  return moment(timestamp, dateFormat).format("DD MMM YYYY");
};

export const getBubbleWidth = (text) => {
  const length = text?.length;
  if (length <= 20) return "30%";
  if (length <= 50) return "50%";
  return "70%";
};