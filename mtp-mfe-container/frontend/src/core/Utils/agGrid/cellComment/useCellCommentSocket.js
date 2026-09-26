import { cloneDeep } from "lodash";
import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setTableCommentsData } from "./cell-comment-services";

const UseCellCommentSocket = () => {
  const dispatch = useDispatch();
  const tableCommentsData = useSelector(
    (state) => state?.cellCommentReducer?.tableCommentsData
  );
  const currentTableCommentState = useRef({});
  useEffect(() => {
    currentTableCommentState.current = tableCommentsData;
  }, [tableCommentsData]);
  const handleCellCommentUpdate = (info) => {
    const {
      type,
      data,
      component_type,
      components = {
        component_id: null,
        sub_component_id: null,
      },
    } = info;
    const commentDataCopy = cloneDeep(
      currentTableCommentState?.current?.[component_type]
    );
    const rowId = components?.[0]?.component_id;
    const columnName = components?.[0]?.sub_component_id;
    const component = commentDataCopy?.[rowId];
    switch (type) {
      case "new_comment_found": {
        if (component) {
          const subComponentIndex = component?.sub_components?.findIndex(
            (item) => Object.keys(item)?.[0] === columnName
          );
          if (subComponentIndex !== -1) {
            const subComponent =
              component?.sub_components?.[subComponentIndex]?.[columnName];
            subComponent?.cell_comments?.push(data);
            subComponent &&
              (subComponent.comments_count =
                (subComponent.comments_count || 0) + 1);
          } else {
            const newSubComponent = {
              [columnName]: {
                comments_count: 1,
                cell_comments: [data],
                event_id: data?.event_id,
              },
            };
            component?.sub_components?.push(newSubComponent);
          }
          component.comments_count = (component.comments_count || 0) + 1;
          component.event_id = data?.event_id;
        }
        Object.assign(commentDataCopy, {
          [rowId]: component,
        });
        dispatch(
          setTableCommentsData({
            [component_type]: commentDataCopy,
          })
        );
        break;
      }

      case "comment_updated": {
        const { comment_id, event_id, comment, userMentioned } = data;
        component?.sub_components?.forEach((subComponent) => {
          const subComponentKey = Object.keys(subComponent)?.[0];
          if (subComponentKey === columnName) {
            const subComponentData = subComponent?.[subComponentKey];
            subComponentData.cell_comments?.forEach((cellComment) => {
              if (cellComment.comment_id === comment_id) {
                cellComment.comment = comment;
                cellComment.userMentioned = userMentioned;
              }
            });
          }
        });
        Object.assign(commentDataCopy, {
          [rowId]: component,
        });
        dispatch(
          setTableCommentsData({
            [component_type]: commentDataCopy,
          })
        );
        break;
      }
      case "comment_deleted": {
        const { comment_id, event_id } = data;
        component?.sub_components?.forEach((subComponent, index) => {
          const subComponentKey = Object.keys(subComponent)?.[0];
          if (subComponentKey === columnName) {
            const subComponentData = subComponent?.[subComponentKey];
            const initialCommentsCount =
              subComponentData?.cell_comments?.length || 0;
            subComponentData.cell_comments = subComponentData.cell_comments?.filter(
              (comment) => comment.comment_id !== comment_id
            );

            const updatedCommentsCount =
              subComponentData?.cell_comments?.length || 0;

            if (initialCommentsCount !== updatedCommentsCount) {
              subComponentData.comments_count = updatedCommentsCount;
              component.comments_count = (component.comments_count || 0) - 1;
            }
            if (updatedCommentsCount === 0) {
              component.sub_components.splice(index, 1);
            }
          }
        });
        Object.assign(commentDataCopy, {
          [rowId]: component,
        });
        dispatch(
          setTableCommentsData({
            [component_type]: commentDataCopy,
          })
        );
        break;
      }
    }
  };
  const handleCellCommentResponse = (response) => {
    handleCellCommentUpdate(response);
  };
  return { handleCellCommentResponse };
};

export default UseCellCommentSocket;
