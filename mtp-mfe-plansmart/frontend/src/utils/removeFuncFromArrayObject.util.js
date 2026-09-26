function removeFuncFromArrayObject(arr) {
  arr.forEach((item) => {
    Object.keys(item).forEach((key) => {
      if (typeof item[key] === "function") {
        delete item[key];
      } else if (Array.isArray(item[key])) {
        removeFuncFromArrayObject(item[key]);
      } else if (typeof item[key] === "object" && item[key] !== null) {
        item[key] = removeFuncFromArrayObject([item[key]]);
      }
    });
  });
  return arr;
}

export default removeFuncFromArrayObject;
