import React from "react";
import * as XLSX from "xlsx";
import * as FileSaver from "file-saver";

export const downloadXlsxLink = (
  fileName,
  headerList,
  customCSSStyles,
  downloadStaticExcelFile = false,
  filePath
) => {
  const handleStaticDownload = () => {
    fetch(filePath)
      .then((res) => res.blob())
      .then((blob) => {
        let url = window.URL.createObjectURL(blob);
        let temp_link = document.createElement("a");
        temp_link.style.display = "none";
        temp_link.download = fileName;
        temp_link.href = url;
        document.body.appendChild(temp_link);
        temp_link.click();
        document.body.removeChild(temp_link);
        window.URL.revokeObjectURL(url);
      });
  };

  // Convert data to Excel format
  const downloadExcelSheet = () => {
    let headerArray = headerList.map((header) => header.label);
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([headerArray], {
      header: headerArray,
    });
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const fileType =
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8";
    const excelBlob = new Blob([excelBuffer], { type: fileType });
    FileSaver.saveAs(excelBlob, `${fileName}`);
  };

  return (
    <>
      {downloadStaticExcelFile ? (
        <a href="#" onClick={handleStaticDownload}>
          Download File
        </a>
      ) : (
        <a
          className={customCSSStyles}
          onClick={() => {
            downloadExcelSheet();
          }}
        >
          Download Template
        </a>
      )}
    </>
  );
};
