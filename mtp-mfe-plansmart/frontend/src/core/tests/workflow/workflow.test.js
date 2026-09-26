import React from "react";
import {
  render,
  cleanup,
  fireEvent,
  screen,
  within,
  act,
} from "@testing-library/react";
// import Workflow from '../../core/pages/workflow/components/form-table'

afterEach(cleanup);

it("adding data in states form", async () => {
  render();
  //   <Workflow
  //   form={[{ label: 'Name', type: 'textfield', name: 'name', showValidationonBlur: true },
  //   { label: 'Description', type: 'textfield', name: 'description' }]}
  //   columns={[{ label: 'Name', key: 'label' }, { label: 'Description', key: 'description' }]}
  //   saveRequest={()=>{console.log('save hit')}} title='States' rowData={[]}

  //  />

  const Header = await screen.getByText("Create States");
  expect(Header).toHaveTextContent("Create States");

  const firstInput = screen.getByLabelText("Name");
  fireEvent.change(firstInput, {
    target: { value: "Open state", name: "name" },
  });
  expect(firstInput.value).toBe("Open state");

  const secondInput = screen.getByLabelText("Description");
  fireEvent.change(secondInput, {
    target: { value: "starting of new ticket", name: "description" },
  });
  expect(secondInput.value).toBe("starting of new ticket");

  fireEvent.click(screen.getByRole("button", { name: /add/i }));
  expect(firstInput.value).toBe("");
  expect(secondInput.value).toBe("");

  expect(screen.getAllByRole("row")[1]).toHaveTextContent(/Open states/);
  expect(screen.getAllByRole("row")[1]).toHaveTextContent(
    /starting of new ticket/
  );
});

it("Checking the error text while adding the same pair in states", async () => {
  render();
  // <Workflow
  //   form={[{ label: 'Name', type: 'textfield', name: 'name', showValidationonBlur: true },
  //   { label: 'Description', type: 'textfield', name: 'description' }]}
  //   columns={[{ label: 'Name', key: 'label' }, { label: 'Description', key: 'description' }]}
  //   saveRequest={()=>{console.log('save hit')}} title='States' rowData={[]}

  //  />

  const firstInput = screen.getByLabelText("Name");
  fireEvent.change(firstInput, {
    target: { value: "Open state", name: "name" },
  });

  const secondInput = screen.getByLabelText("Description");
  fireEvent.change(secondInput, {
    target: { value: "starting of new ticket", name: "description" },
  });

  fireEvent.click(screen.getByRole("button", { name: /add/i }));
  expect(firstInput.value).toBe("");
  expect(secondInput.value).toBe("");

  expect(screen.getAllByRole("row")[1]).toHaveTextContent(/Open states/);
  expect(screen.getAllByRole("row")[1]).toHaveTextContent(
    /starting of new ticket/
  );

  fireEvent.change(firstInput, {
    target: { value: "Open state", name: "name" },
  });
  fireEvent.click(screen.getByRole("button", { name: /add/i }));

  expect(screen.getByRole("errorBox")).toHaveTextContent(
    /Please provide different name. It already exist/
  );
});

it("adding data in Transition form and checking validation for duplicate pair", async () => {
  render();
  // <Workflow
  //     transitions={true}
  //   optSelect1={[{id:1,label:'Option 1'},{id:2,label:'Option 2'}]}
  //   form={[{ label: 'Source State', type: 'select', name: 'source_state_id', options: [{id:1,label:'Option 1'},{id:2,label:'Option 2'}] },
  //   { label: 'Destination State', type: 'select', name: 'destination_state_id', options: [{id:1,label:'Option 1'},{id:2,label:'Option 2'}] }]}
  //   optSelect2={[{id:1,label:'Option 1'},{id:2,label:'Option 2'}]}
  //   columns={[{ label: 'Source State', key: 'source_state_label' }, { label: 'Destination State', key: 'destination_state_label' }]}
  //   rowData={[]}
  //   title='Transitions'
  //   saveRequest={()=>{console.log('save request')}}

  //  />

  const Header = screen.getByText("Create Transitions");
  expect(Header).toHaveTextContent("Create Transitions");

  fireEvent.mouseDown(screen.getAllByRole("button")[0]);
  expect(screen.getByRole("listbox")).not.toEqual(null);

  //CHANGE
  act(() => {
    const options = screen.getAllByRole("option");
    // screen.debug(getAllByRole("option"));
    fireEvent.mouseDown(options[1]);
    options[0].click();
  });

  fireEvent.mouseDown(screen.getAllByRole("button")[1]);
  expect(screen.getByRole("listbox")).not.toEqual(null);

  //CHANGE
  act(() => {
    const options = screen.getAllByRole("option");
    // screen.debug(getAllByRole("option"));
    fireEvent.mouseDown(options[1]);
    options[1].click();
  });

  fireEvent.click(screen.getByRole("button", { name: /add/i }));

  expect(screen.getAllByRole("row")[1]).toHaveTextContent(/Option 2/);
  expect(screen.getAllByRole("row")[1]).toHaveTextContent(/Option /);

  fireEvent.mouseDown(screen.getAllByRole("button")[0]);
  expect(screen.getByRole("listbox")).not.toEqual(null);

  //CHANGE
  act(() => {
    const options = screen.getAllByRole("option");
    // screen.debug(getAllByRole("option"));
    fireEvent.mouseDown(options[1]);
    options[0].click();
  });

  fireEvent.mouseDown(screen.getAllByRole("button")[1]);
  expect(screen.getByRole("listbox")).not.toEqual(null);

  //CHANGE
  act(() => {
    const options = screen.getAllByRole("option");
    // screen.debug(getAllByRole("option"));
    fireEvent.mouseDown(options[1]);
    options[1].click();
  });

  fireEvent.click(screen.getByRole("button", { name: /add/i }));
  expect(screen.getByRole("errorBox")).toHaveTextContent(
    /This combination already exist. Please try with a new combination/
  );
});

it("checking the validation for create Workflow ", async () => {
  render();
  // <Workflow
  //   workflow={true}
  //   optSelect1={[{id:1,label:'Option 1'},{id:2,label:'Option 2'}]}
  //   form={[{ label: 'Name', type: 'textfield', name: 'field_name' },
  //   { label: 'Initial State', type: 'select', name: 'initial_state_id', options:  [ {id:1,label:'Option 1'},{id:2,label:'Option 2'}]  }]}
  //   columns={[{ label: 'Name', key: 'field_name' }, { label: 'Initial State', key: 'initial_state_label' }]}
  //   rowData={[]}
  //   title='Workflow'
  //   hideCreateSegment={true}
  //   saveRequest={()=>{console.log('save request')}}
  //  />

  const Header = screen.queryByText("Create Workflow");
  expect(Header).not.toBeInTheDocument();
});

it("adding data in Workflow form and checking validation", async () => {
  render();
  // <Workflow
  //   workflow={true}
  //   optSelect={[{id:1,label:'Option 1'},{id:2,label:'Option 2'}]}
  //   form={[{ label: 'Name', type: 'textfield', name: 'field_name' },
  //   { label: 'Initial State', type: 'select', name: 'initial_state_id', options:  [ {id:1,label:'Option 1'},{id:2,label:'Option 2'}]  }]}
  //   columns={[{ label: 'Name', key: 'field_name' }, { label: 'Initial State', key: 'initial_state_label' }]}
  //   rowData={[]}
  //   title='Workflow'
  //   hideCreateSegment={false}
  //   saveRequest={()=>{console.log('save request')}}
  //  />

  const Header = screen.queryByText("Create Workflow");
  expect(Header).toBeInTheDocument();

  fireEvent.mouseDown(screen.getAllByRole("button")[0]);
  expect(screen.getByRole("listbox")).not.toEqual(null);

  //CHANGE
  act(() => {
    const options = screen.getAllByRole("option");
    // screen.debug(getAllByRole("option"));
    fireEvent.mouseDown(options[1]);
    options[0].click();
    fireEvent.mouseOut(options[1]);
  });

  const firstInput = screen.getByLabelText("Name");
  fireEvent.change(firstInput, {
    target: { value: "Open Workflow", name: "field_name" },
  });
  fireEvent.click(screen.getByRole("button", { name: /add/i }));

  expect(screen.getAllByRole("row")[1]).toHaveTextContent(/Open Workflow/);
  expect(screen.getAllByRole("row")[1]).toHaveTextContent(/Option /);

  fireEvent.change(firstInput, {
    target: { value: "Open Workflow", name: "field_name" },
  });
  fireEvent.click(screen.getByRole("button", { name: /add/i }));

  expect(screen.getByRole("errorBox")).toHaveTextContent(
    /Please provide different name. It already exist/
  );

  const row = screen.getAllByRole("row")[1];
  fireEvent.click(within(row).getByTestId("delete-0"));

  expect(screen.getAllByRole("row")).toHaveLength(2);
});
