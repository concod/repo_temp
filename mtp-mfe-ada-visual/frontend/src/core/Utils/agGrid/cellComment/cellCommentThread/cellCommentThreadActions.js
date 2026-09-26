import { addSnack } from "core/actions/snackbarActions";
import { deleteComment, getActiveCellComments } from "../cell-comment-services";

export const fetchCommentsForActiveCell = async (eventId, dispatch) => {
  try {
    const request = await getActiveCellComments(eventId);
    if (request?.data?.status) {
      return {
        status: true,
        data: request?.data?.data?.comments,
      };
    }
  } catch (err) {
    console.error(
      "fetchCommentsForActiveCell : Error fetching comments for cell ==> ",
      err
    );
    dispatch(
      addSnack({
        message: "Error fetching cellComments",
        options: {
          variant: "error",
        },
      })
    );
    return {
      status: false,
    };
  }
};

export const handleDeleteComment = async (commentId, payload, dispatch) => {
  try {
    const request = await deleteComment(commentId, payload);
    if (request.data?.status) {
      dispatch(
        addSnack({
          message: request?.data?.message,
          options: {
            variant: "success",
          },
        })
      );
      return true;
    }
  } catch (err) {
    console.error("handleDeleteComment : Error deleting comment - ", err);
    dispatch(
      addSnack({
        message: "Error deleting comment",
        options: {
          variant: "error",
        },
      })
    );
  }
};
