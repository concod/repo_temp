import React from "react";

const EditableRow = ({
  editFormData,
  handleEditFormChange,
  handleCancelClick,
  handleEditFormSubmit,
}) => {
  return (
    <tr>
      <td>
        <input
          type="text"
          required="required"
          placeholder="Enter a key..."
          name="key"
          value={editFormData.key}
          onChange={handleEditFormChange}
        ></input>
      </td>
      <td>
        <input
          type="text"
          required="required"
          placeholder="Enter an value..."
          name="value"
          value={editFormData.value}
          onChange={handleEditFormChange}
        ></input>
      </td>
      <td>
        <button type="submit" onClick={handleEditFormSubmit}>
          Save
        </button>
        <button type="button" onClick={handleCancelClick}>
          Cancel
        </button>
      </td>
    </tr>
  );
};

export default EditableRow;
