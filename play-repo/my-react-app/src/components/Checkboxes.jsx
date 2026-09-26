import { useState, useEffect } from "react";

const checkboxesData = [
  {
    id: 1,
    name: "Electronics",
    checked: true,
    children: [
      {
        id: 2,
        name: "Mobile phones",
        checked: false,
        children: [
          {
            id: 3,
            name: "iPhone",
            checked: false,
          },
          {
            id: 4,
            name: "Android",
            checked: false,
          },
        ],
      },
      {
        id: 5,
        name: "Laptops",
        checked: false,
        children: [
          {
            id: 6,
            name: "MacBook",
            checked: false,
          },
          {
            id: 7,
            name: "Surface Pro",
            checked: false,
          },
        ],
      },
    ],
  },
  {
    id: 8,
    name: "Books",
    checked: false,
    children: [
      {
        id: 9,
        name: "Fiction",
        checked: false,
      },
      {
        id: 10,
        name: "Non-fiction",
        checked: false,
      },
    ],
  },
  {
    id: 11,
    name: "Toys",
    checked: false,
  },
];

const ChecbboxNode = ({ item, handleCheckboxChange }) => {
  return (
    <>
      <input
        type="checkbox"
        checked={item.checked}
        onChange={(e) => {
          handleCheckboxChange(e.target.checked, item.id);
        }}
      />
      <label>{item.name}</label>
    </>
  );
};

const RenderCheckboxes = ({ data, handleCheckboxChange }) => {
  return data.map((item) => {
    return (
      <div key={item.id}>
        <ChecbboxNode item={item} handleCheckboxChange={handleCheckboxChange} />
        {item.children?.length > 0 && (
          <div style={{ paddingLeft: "20px" }}>
            <RenderCheckboxes
              data={item.children}
              handleCheckboxChange={handleCheckboxChange}
            />
          </div>
        )}
      </div>
    );
  });
};

export default function Checkboxes() {
  const [data, setData] = useState(checkboxesData);

  const updateData = (data, id, checked, parent) => {
    if (parent) {
      parent.checked = checked;
    }
    for (let i = 0; i < data.length; i++) {
      if (data[i].id === id) {
        data[i].checked = checked;
        return true;
      }
      if (data[i].children?.length > 0) {
        const found = updateData(data[i].children, id, checked, data[i]);
        if (found) return true;
      }
    }
    return false;
  };

  const handleCheckboxChange = (checked, id) => {
    setData((prevData) => {
      updateData(prevData, id, checked, null);
      return [...prevData];
    });
  };

  return (
    <RenderCheckboxes data={data} handleCheckboxChange={handleCheckboxChange} />
  );
}
