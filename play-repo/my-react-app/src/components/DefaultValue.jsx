import { useState } from "react";

function useDefault(defaultValue, initialValue) {
  const [value, setValue] = useState(initialValue);

  if (value === undefined || value === null) {
    return [defaultValue, setValue];
  }

  return [value, setValue];
}

function DefaultComponent() {
  const initialUser = { name: "Marshall" };
  const defaultUser = { name: "Mathers" };
  const [user, setUser] = useDefault(defaultUser, initialUser);

  return (
    <div>
      <div>User: {user.name}</div>
      <input onChange={(e) => setUser({ name: e.target.value })} />
      <button onClick={() => setUser(null)}>reset</button>
    </div>
  );
}

export default DefaultComponent;
