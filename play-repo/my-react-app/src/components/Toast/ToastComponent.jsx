import { useToastContext } from "./ToastProvider";
const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const ToastComponent = () => {
  const toastContext = useToastContext();
  console.log(toastContext);

  return (
    <button
      onClick={() => {
        const arr1 = arr.pop();
        toastContext.addToast({
          type: "success",
          message: `Toast added ${arr1}`,
        });
      }}
    >
      toast
    </button>
  );
};

export default ToastComponent;
