import React, { useState, Fragment } from "react";
import { nanoid } from "nanoid";
import ReadOnlyRow from "./ReadOnlyRow";
import EditableRow from "./EditableRow";

function TableKeyValue(props) {
  const [rows, setrows] = useState([
    {
      id: 0,
      key: "",
      value: "",
    },
  ]);
  const [addFormdata, setformdata] = useState({
    key: "",
    value: "",
  });
  const [editFormData, setEditFormData] = useState({
    key: "",
    value: "",
  });
  const [editrowId, setEditrowId] = useState(null);

  function handleformchange(event) {
    event.preventDefault();
    const fieldkey = event.target.getAttribute("name");
    const fieldvalue = event.target.value;
    const newformdata = { ...addFormdata };
    newformdata[fieldkey] = fieldvalue;
    setformdata(newformdata);
  }
  const handleEditFormChange = (event) => {
    event.preventDefault();

    const fieldName = event.target.getAttribute("name");
    const fieldValue = event.target.value;

    const newFormData = { ...editFormData };
    newFormData[fieldName] = fieldValue;

    setEditFormData(newFormData);
  };

  function handlesubmitform(event) {
    event.preventDefault();
    const newdata = {
      id: nanoid(),
      key: addFormdata.key,
      value: addFormdata.value,
    };

    const newrow = [...rows, newdata];
    setrows(newrow);
  }

  const handleEditFormSubmit = (event) => {
    event.preventDefault();

    const editedRow = {
      id: editrowId,
      key: editFormData.key,
      value: editFormData.value,
    };

    const newrows = [...rows];

    const index = rows.findIndex((row) => row.id === editrowId);

    newrows[index] = editedRow;

    setrows(newrows);
    setEditrowId(null);
  };

  const handleEditClick = (event, row) => {
    event.preventDefault();
    setEditrowId(row.id);

    const formValues = {
      key: row.key,
      value: row.value,
    };

    setEditFormData(formValues);
  };

  const handleCancelClick = () => {
    setEditrowId(null);
  };

  const handleDeleteClick = (rowId) => {
    const newrows = [...rows];

    const index = rows.findIndex((row) => row.id === rowId);

    newrows.splice(index, 1);

    setrows(newrows);
  };

  return (
    <div>
      <form onSubmit={handleEditFormSubmit}>
        <table>
          <thead>
            <tr>
              <th className="text-center"> Key </th>
              <th className="text-center"> Value </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <Fragment>
                {editrowId === row.id ? (
                  <EditableRow
                    editFormData={editFormData}
                    handleEditFormChange={handleEditFormChange}
                    handleCancelClick={handleCancelClick}
                    handleEditFormSubmit={handleEditFormSubmit}
                  />
                ) : (
                  <ReadOnlyRow
                    row={row}
                    handleEditClick={handleEditClick}
                    handleDeleteClick={handleDeleteClick}
                  />
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </form>
      <h2>Add a row to be sent </h2>
      <form>
        <input
          type="text"
          name="key"
          required="required"
          onChange={handleformchange}
        />
        <input
          type="text"
          name="value"
          required="required"
          onChange={handleformchange}
        />
        <button type="submit" onClick={handlesubmitform}>
          add row
        </button>
      </form>
    </div>
  );
}
export default TableKeyValue;
