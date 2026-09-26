export const InitialQuaterlyState = {
  selectedMonths: [],
  selectedDatesForQuaterly: [],
  selectedDaysForQuaterly: [],
  selectedWeeksForQuarterly: [],
};
export const InitialYearlyState = {
  selectedMonthsForYearly: [],
  selectedDatesForYearly: [],
  selectedDaysForYearly: [],
  selectedWeeksForYearly: [],
};

export const QuaterlyReducer = (state, action) => {
  switch (action.type) {
    case "SET_SELECTED_MONTHS":
      return { ...state, selectedMonths: action.payload };
    case "SET_SELECTED_DATES_FOR_QUATERLY":
      return { ...state, selectedDatesForQuaterly: action.payload };
    case "SET_SELECTED_DAYS_FOR_QUATERLY":
      return { ...state, selectedDaysForQuaterly: action.payload };
    case "SET_SELECTED_WEEKS_FOR_QUARTERLY":
      return { ...state, selectedWeeksForQuarterly: action.payload };
    case "RESET":
      return { ...InitialQuaterlyState };
    case "PRESET_QUATERLY_STATE":
      return { ...action.payload };
    default:
      return state;
  }
};
export const YearlyReducer = (state, action) => {
  switch (action.type) {
    case "SET_SELECTED_MONTHS_FOR_YEARLY":
      return { ...state, selectedMonthsForYearly: action.payload };
    case "SET_SELECTED_DATES_FOR_YEARLY":
      return { ...state, selectedDatesForYearly: action.payload };
    case "SET_SELECTED_DAYS_FOR_YEARLY":
      return { ...state, selectedDaysForYearly: action.payload };
    case "SET_SELECTED_WEEKS_FOR_YEARLY":
      return { ...state, selectedWeeksForYearly: action.payload };
    case "RESET":
      return { ...InitialYearlyState };
    case "PRESET_YEARLY_STATE":
      return { ...action.payload };
    default:
      return state;
  }
};
