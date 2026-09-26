import { ADD_SNACK, CLOSE_SNACK, REMOVE_SNACK } from "../actions/types";
import CloseSnack from "../Utils/snackbar/components/closeSnack";
const initialState = {
  snacks: [],
};

const closeAction = (key) => {
  return <CloseSnack uniqueId={key} />;
};
export default function (state = initialState, action) {
  switch (action.type) {
    case ADD_SNACK:
      return {
        ...state,
        snacks: [
          ...state.snacks,
          {
            ...action.payload,
            options: {
              ...action.payload.options,
              anchorOrigin: action.payload?.options?.anchorOrigin || {
                vertical: "bottom",
                horizontal: "right",
              },
              key:
                action.payload.options.key ||
                new Date().getTime(),
              variant: action.payload.options.variant || "info",
              autoHideDuration: action.payload.options.autoHideDuration || 5000,
              action: action.payload.options.action
                ? action.payload.options.action
                : (key) => closeAction(key),
            },
          },
        ],
      };
    case REMOVE_SNACK:
      return {
        ...state,
        snacks: state.snacks.filter((snack) => {
          return snack.options.key !== action.payload;
        }),
      };
    case CLOSE_SNACK:
      return {
        ...state,
        snacks: state.snacks.map((snack) => {
          return action.payload.dismissAll ||
            action.payload.key === snack.options.key
            ? { ...snack, dismissed: true }
            : { ...snack };
        }),
      };
    default:
      return state;
  }
}
