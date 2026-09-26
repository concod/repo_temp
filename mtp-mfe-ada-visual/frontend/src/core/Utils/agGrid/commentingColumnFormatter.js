import CellRenderers from "./cellRenderer";

const commentingColumnFormatter = (
  columns = [],
  actions = [],
  isChatEnabled = false,
  enableCellComment = false,
  targetChatIndex = 1
) => {
  let chatTargetIndex = targetChatIndex;
  if (isChatEnabled && columns[1]?.cellRenderer === "agGroupCellRenderer") {
    chatTargetIndex = 2;
  }
  const processedColumns = columns?.map((item, index) => {
    if (enableCellComment && !item?.extra?.skipCommentColumnFormatting) {
      item.cellRenderer = (cellProps) => {
        const newItem = { ...item };
        return (
          <CellRenderers
            cellData={cellProps}
            column={newItem}
            actions={actions}
          />
        );
      };
    }
    if (index === chatTargetIndex && isChatEnabled) {
      if (item.sub_headers && item.sub_headers.length > 0) {
        item.sub_headers[0].cellRenderer = (cellProps) => {
          const newItem = { ...item.sub_headers[0] };
          newItem.originalType = item.sub_headers[0].type;
          newItem.type = "chat";
          return (
            <CellRenderers
              cellData={cellProps}
              column={newItem}
              actions={actions}
            />
          );
        };
      } else {
        item.cellRenderer = (cellProps) => {
          const newItem = { ...item };
          newItem.originalType = item.type;
          newItem.type = "chat";
          return (
            <CellRenderers
              cellData={cellProps}
              column={newItem}
              actions={actions}
            />
          );
        };
      }
    }

    return item;
  });
  return processedColumns;
};

export default commentingColumnFormatter;
