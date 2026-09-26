const ReadOnlyRow = ({ row, handleEditClick, handleDeleteClick }) => {
  return (
    <tr>
      <td>{row.key}</td>
      <td>{row.value}</td>
      <td>
        <button type="button" onClick={(event) => handleEditClick(event, row)}>
          Edit
        </button>
        <button type="button" onClick={() => handleDeleteClick(row.id)}>
          Delete
        </button>
      </td>
    </tr>
  );
};

export default ReadOnlyRow;
