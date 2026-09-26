const UseCopyToClipboard = async (message) => {
  if (!navigator?.clipboard) {
    console.warn("Clipboard not supported");
    return false;
  }
  try {
    await navigator.clipboard.writeText(message);
    return true;
  } catch (error) {
    console.warn("Copy failed", error);
    return false;
  }
};

export default UseCopyToClipboard;
