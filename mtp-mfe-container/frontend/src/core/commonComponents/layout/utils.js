import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const parseHTMLFromString = (encodedString) => {
  return encodedString
    ?.replaceAll("&lt;", "<")
    ?.replaceAll("&quot;", '"')
    ?.replaceAll("&gt;", ">");
};

/**
 * Converts React element icons to HTML strings for serialization
 * @param {Object} item - Sidebar item with potential React element icon
 * @returns {Object} - Item with icon converted to HTML string
 */
const convertReactIconToString = (item) => {
  if (React.isValidElement(item.icon)) {
    try {
      item.icon = renderToStaticMarkup(item.icon);
    } catch (e) {
      item.icon = "";
    }
  }
  return item;
};

/**
 * Serializes sidebar data by converting React elements to strings
 * Handles nested childList recursively
 * @param {Array} sidebarData - Array of sidebar items
 * @returns {Array} - Serialized sidebar data safe for JSON.stringify
 */
const serializeSidebarData = (sidebarData) => {
  return sidebarData.map((item) => {
    // Convert parent icon
    const serializedItem = convertReactIconToString({ ...item });
    
    // Handle nested childList
    if (serializedItem.childList && Array.isArray(serializedItem.childList)) {
      serializedItem.childList = serializedItem.childList.map((child) => 
        convertReactIconToString({ ...child })
      );
    }
    
    return serializedItem;
  });
};

export { parseHTMLFromString, convertReactIconToString, serializeSidebarData };
