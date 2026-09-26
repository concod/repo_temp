import moment from "moment";

/**
 * getTimeDifference takes the previous date gives a
 * difference between the current time and that previous date
 * in seconds/minutes/hours
 * @param {string} previousDate
 * @returns
 */
export const getTimeDifference = (previousDate) => {
  try {
    const previousTime = moment(previousDate);
    const currentTime = moment();
    const diffDuration = moment.duration(currentTime.diff(previousTime));

    const hours = diffDuration.hours();
    const minutes = diffDuration.minutes();
    const seconds = diffDuration.seconds();

    if (hours > 0) {
      return `${hours} hours ${minutes} minutes`;
    } else if (minutes > 0) {
      return `${minutes} minutes`;
    } else {
      return `${seconds} seconds`;
    }
  } catch (error) {
    console.error("getTimeDifference error:", error);
  }
};
