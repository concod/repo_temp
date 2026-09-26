/**
 * Add file related functions here
 */

export const validateFile = (file, slValidTypes) => {
  //Used to validate the type of file
  const validTypes = slValidTypes;
  if (validTypes.indexOf(file.type) === -1) {
    return false;
  }
  return true;
};

export const fileSize = (size) => {
  //Used to validate the size of the file
  if (size === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(size) / Math.log(k));
  return parseFloat((size / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};
