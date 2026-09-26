export const resolveGroupUpdateAction = (
  baseAction,
  hasSelectionChanges,
  hasNameChange
) => {
  if (!hasNameChange) {
    return baseAction;
  }
  if (hasSelectionChanges) {
    return `${baseAction}_with_rename`;
  }
  return "rename_only";
};

export const hasGroupNameChanged = (pendingName, originalName) =>
  Boolean(pendingName?.trim()) &&
  pendingName.trim() !== (originalName || "").trim();

export const hasPendingGroupNameChange = (
  pendingName,
  originalName,
  editState = {}
) => {
  const { isEditing, draftName, baselineName } = editState;
  if (
    isEditing &&
    hasGroupNameChanged(draftName, baselineName ?? originalName)
  ) {
    return true;
  }
  return hasGroupNameChanged(pendingName, originalName);
};
