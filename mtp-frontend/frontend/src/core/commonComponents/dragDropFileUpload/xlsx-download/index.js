import React from "react";
import * as XLSX from "xlsx";
import * as FileSaver from "file-saver";

export const downloadXlsxLink = (
  fileName,
  headerList,
  customCSSStyles,
  downloadStaticExcelFile = false,
  filePath,
  downloadStaticMacrosFile = false
) => {
  const handleStaticDownload = (event) => {
    event.preventDefault();
    let temp_link = document.createElement("a");
    temp_link.style.display = "none";
    temp_link.download = fileName;
    temp_link.href = filePath;
    document.body.appendChild(temp_link);
    temp_link.click();
    document.body.removeChild(temp_link);
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

  // Download Macros from Assets Folder
  const downloadMacros = async () => {
    try {
      let macrosFile = await import(`${filePath}`);
      FileSaver.saveAs(macrosFile.default, fileName);
    } catch (error) {
      console.error("Error in downloading Macros:", error);
    }
  };

  return (
    <>
      {downloadStaticExcelFile ? (
        <a
          href={filePath}
          className={customCSSStyles}
          onClick={(event) => handleStaticDownload(event)}
        >
          Download File
        </a>
      ) : (
        <a
          className={customCSSStyles}
          onClick={() => {
            if (downloadStaticMacrosFile) {
              downloadMacros();
            } else downloadExcelSheet();
          }}
        >
          Download Template
        </a>
      )}
    </>
  );
};
