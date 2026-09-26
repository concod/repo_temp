# Plansmart with Micro Frontend Architecture

### Table of contents
- [WIP] Running project & deployment
    - Running project locally (devlopment)
    - Production deployment notes
- [WIP] Tools & Technologies usage
- Code review checklist
- Coding standards
    - Folder structure
    - Naming things
    - Better practices
    - [WIP] Unit tests


## [WIP] Running project & deployment

## [WIP] Tools & Technologies usage

## Code review checklist
### Not acceptable code
- Sonar cube errors
    - Sonar reports is the highest priority
    - Code shouldn't be merged if there are any errors reported in sonar for a given PR.
- Hardcoded security tokens, licence code, tenant configuration details
- Console logs

### Other checklist
- Code is easily understand.
- Code is written following the coding standarts/guidelines.
- Are functions/classes/components reasonably small (not too big)?
- Event listeners removed at teardown.
- Naming conventions followed for variables, file names, translations.
- Avoid multiple if/else blocks.
- Use lodash/ramda functions instead of implementing itself.
- Code has no any linter errors or warnings.


## Coding standards

### Naming conventions

#### PascalCase

##### 1. React Component & Component's folder
```
const Todo = () => {
   //...
}
```
##### 2. CSS File Names
```
Todo.css
Todo.scss
Todo.module.scss
```
##### 3. Enumerations
```
const RequestType = {
   //...
}
```

---
#### camelCase

##### 1. Variable Names
```
const userName = "ia-devs";
```

##### 2. Function Names
```
const getFullName = (firstName, lastName) => {
    return `${firstName} ${lastName}`;
}
```
##### 3. Object Properties
```
const user = {
  userName: "sathishskdev",
  firstName: "Sathish",
  lastName: "Kumar"
}
```
##### 4. CSS Module Class Names
```
.headerContainer {
    display: "flex";
}
```
##### 5. Custom Hooks
```
const useTodo = () => {
  //...
}
```
##### 6. Higher Order Component
```
const withTimer = () => {
  //...
}
```
---
#### kebab-case

##### 1. CSS Class Names
```
header-container {
    display: "flex";
}

<div className="header-container">
  //...
</div>
```
##### 2. Container Folder Names
```
├── src
│   ├── dependencies
│   │   ├── mfe-container
│   │   └── json-markdown
```
---
#### SNAKE_CASE/snake_case

##### 1. Constants
```
const BASE_PATH = "https://domain.services/api";
```
##### 2. Enumeration Properties
```
const RequestType = { // Name in Pascal Case
  // Properties in Screaming Snake Case
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  DELETE: 'DELETE',
};
```
##### 3. Global Variables
```
const ENVIRONMENT = 'PRODUCTION';
const PI = 3.14159;
```



### Better practices

#### Prefer passing objects instead of multiple props

when we use multiple arguments or props are used to pass user-related information to component or function, it can be challenging to remember the order and purpose of each argument, especially when the number of arguments grows.

```
// ❌ Avoid passing multiple arguments
const updateTodo = (id, name, completed) => {
 //...
}

// ❌ Avoid passing multiple props
const TodoItem = (id, name, completed) => {
  return(
    //...
  )
}
```

When the number of arguments increases, it becomes more challenging to maintain and refactor the code. There is an increased chance of making mistakes, such as omitting an argument or providing incorrect values.

```
// ✅ Use object arguments
const updateTodo = (todo) => {
 //...
}

const todo = {
   id: 1,
   name: "Morning Task",
   completed: false
}

updateTodo(todo);
```

- Function becomes more **self-descriptive** and **easier to understand**.
- Reducing the chances of errors caused by **incorrect argument order**.
- Easy to **add** or **modify** properties without changing the function signature.
- Simplify the process of **debugging** or **testing** functions to passing an object as an argument.

---
#### Use more descriptive and specific names
It's important to avoid using generic or unclear names for your components, variables, or functions.

```
// ❌ Avoid

const MyComponent = () => { 
// What kind of component is this?

const data = getData() 
// What kind of data is this?

const onClick = () => {
  // What does it do?
}
//...
}
```
In the above example, The component name, variable name "data" and the function name "onClick" are generic and don't convey their specific purpose or context.

To improve clarity and maintainability, it's recommended to use more descriptive and specific names.

```
// ✅ Best Practice

const ProductDetails = () => {

const productInfo = fetchProductInfo();
// Fetches detailed product information

const addProductToCart = () => {
  // Add the product to the shopping cart
};
//...
}
```
---
#### Choosing Singular or Plural Naming

The decision to use singular or plural names for various elements, such as components, variable and functions, can significantly impact code clarity.

```
// ✅ Best Practice

const fetchConversation = () => {
  // Fetch single conversation.
}

const fetchConversations = () => {
  // Fetch multiple conversations.
}

// Use singular name for a single conversation
const conversation = { /*Conversation Details*/ }

// Use plural name for multiple conversation
const conversations = [
  { /*Conversation Details*/ }, 
  { /*Conversation Details*/ }
]
```
---
#### Avoid Excessive Abbreviations

```
// ❌ Bad example

// Excessive abbreviation
const selUsr = {
  usrId: '1',
  usrNm: 'Sathish Kumar',
  usrEmail: 'sathish@domain.com',
};

// Usage
selUsr.usrId
```

In the above example, the object selUsr contains selected user information with abbreviated property names like usrId, usrNm, and usrEmail. While this code may be functional, it lacks clarity and can cause confusion for other developers who need to work with this object and property.

```
// ✅ Best Practice

// Descriptive object and property names
const selectedUser = {
  userId: 1,
  userName: 'Sathish Kumar',
  userEmail: 'sathish@domain.com',
}

// Usage
selectedUser.userId
```
#### Avoid using indexes as key props
```
// ❌ Avoid index as key
const renderItem = (todo, index) => {
  const {name} = todo;
  return <li key={index}> {name} </>
}
```
Using indexes as key props can lead to *incorrect rendering * especially when adding, removing, or reordering list items.

It can result in poor performance and incorrect component updates.
```
// ✅ Using unique and stable identifiers
const renderItem = (todo, index) => {
  const {id, name} = todo;
  return <li key={id}> {name} </>
}
```
- Efficiently update and reorder components in lists.
- Reducing potential rendering issues.
- Avoids in-correct component update.

### [WIP] Unit tests

### Folder structure
```
├── node_modules (.gitignore)
├── public
│   ├── favicon.ico
│   ├── index.html
│   └── manifest.json
├── src
│   ├── dependencies
│   │   ├── mfe-container   // core & mfe supporting code
│   │   └── json-markdown   // low-code framework code form biglots
│   ├── assets
│   │       ├── images
│   │       |   └── logo.svg
│   │       └── videos
│   │           └── demo.avi
│   ├── utils
│   │   └── request.util.js
│   │   └── emailValidation.util.js
│   ├── hooks
│   │   ├── useError.js
│   │   ├── useAsync.js
│   │   ├── useEventListener.js
│   │   ├── useDebounce.js
│   │   └── useFetch.js
│   ├── constants
│   │   ├── modelApi.constant.js
│   │   └── index.js
│   ├── components
│   │   ├── Button
│   │   │   ├── Button.css
│   │   │   ├── Button.jsx
│   │   │   └── Button.test.js
│   │   └── Dropdown
│   │       ├── Dropdown.css
│   │       ├── Dropdown.util.js
│   │       ├── useDropdown.js
│   │       ├── Dropdown.jsx
│   │       └── Dropdown.test.js
│   ├── pages
│   │   ├── Settings
│   │   │   ├── Settings.css
│   │   │   ├── Settings.jsx
│   │   │   └── Settings.test.js
│   │   └── Dashboard
│   │       ├── components
│   │       ├── CreatePlan
│   │       │   ├── hooks
│   │       │   │   ├── useFormValidator.js
│   │       │   │   └── useKPIFormatter.js
│   │       │   ├── constants
│   │       │   │   └── errorMessages.constants.js
│   │       │   ├── utils
│   │       │   │   └── planFormatter.util.js
│   │       │   ├── CreatePlan.css
│   │       │   ├── CreatePlan.jsx
│   │       │   └── CreatePlan.test.js
│   │       ├── Dashboard.css
│   │       ├── Dashboard.jsx
│   │       └── Dashboard.test.js
│   ├── index.css
│   ├── index.js
│   ├── serviceWorker.js
│   └── setupTests.js
├── .gitignore
├── package.json
└── README.md
```

