export const getProductSetall = (value, newentry, pkey, row, column) => {
  let fdata = [];

  if (value === true) {
    newentry[pkey] = row.id;
    newentry["dc"]["map"] = [column.dc_code];
    fdata = [newentry];
  } else {
    newentry[pkey] = row.id;
    newentry["dc"]["unmap"] = [column.dc_code];
    fdata = [newentry];
  }
  return fdata;
};

export const getexistingProductsetall = (
  row,
  pkey,
  column,
  exdata,
  existingdata,
  value
) => {
  let mapflag = value === true ? "map" : "unmap";
  if (Object.keys(exdata).length > 0) {
    exdata["dc"][mapflag].push(column.dc_code);
    existingdata.splice(existingdata.indexOf(exdata), 1, exdata);
    return existingdata;
  } else {
    exdata[pkey] = row.id;
    value === true
      ? (exdata["dc"] = {
          map: [column.dc_code],
          unmap: [],
        })
      : (exdata["dc"] = {
          unmap: [column.dc_code],
          map: [],
        });
    existingdata.push(exdata);
    return existingdata;
  }
};
