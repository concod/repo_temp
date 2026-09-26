import Checkboxes from "./components/Checkboxes";
import ToastComponent from "./components/Toast/ToastComponent";
import ToastProvider from "./components/Toast/ToastProvider";
import Virtualization from "./components/Virtualization";
import { useState, useEffect, useRef } from "react";

const flattenArray = (arr) => {
  return arr.reduce((acc, val) => {
    if (Array.isArray(val)) {
      acc.push(...flattenArray(val));
    } else {
      acc.push(val);
    }
    return acc;
  }, []);
};

// console.log(flattenArray([1, 2, [3, { v: true }]]));

const flattenObject = (obj) => {
  return Object.keys(obj).reduce((acc, key) => {
    if (typeof obj[key] === "object" && obj[key] !== null) {
      acc.push(...flattenObject(obj[key]));
    } else {
      if (Array.isArray(obj)) {
        obj[key] && acc.push(obj[key]);
      } else {
        obj[key] && acc.push(key);
      }
    }
    return acc;
  }, []);
  // .join(" ");
};

console.log(flattenObject(["foo", "bar", "baz"]));

function App() {
  return <div>{/* <Checkboxes /> */}</div>;
}

export default App;
