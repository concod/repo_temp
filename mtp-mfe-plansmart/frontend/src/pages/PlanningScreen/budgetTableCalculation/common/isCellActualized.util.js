import { get, isArray } from "lodash";
import { NON_ACTUALIZED_PLAN_STATUS } from "../../planningScreen.constant";

export default function ({ accessor }) {
  const colDef = this.columnsMap[accessor];
  const category = get(colDef, "extra.category", []);
  const timeline = get(colDef, "extra.timeline", "");

  //planActualizedWeeks is an object with all the timeline keys so using it to get timeline key from category
  const timeCategory = category.filter((key) => this.planActualizedWeeks[key]);
  const planActualizedWeeksForTimeCategory = get(
    this.planActualizedWeeks,
    timeCategory,
    []
  );
  let isActualized = false;
  //for grand total the planActualizedWeeksForTimeCategory will be boolean so using the same
  isActualized = isArray(planActualizedWeeksForTimeCategory)
    ? planActualizedWeeksForTimeCategory.includes(timeline)
    : planActualizedWeeksForTimeCategory;

  if (NON_ACTUALIZED_PLAN_STATUS.includes(this.planDetails.status)) {
    isActualized = false;
  }

  return isActualized;
}
