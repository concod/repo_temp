import { useEffect, useState } from "react";

export const usePwdValidationHook = (
  ref,
  minUpper,
  minLower,
  minSpl,
  minDigits,
  minLength,
  isDigitsAllowed,
  isSplChrsAllowed
) => {
  const [checklist, setchecklist] = useState([]);
  const checklistArr = [
    "minUpper",
    "minLower",
    "minSpl",
    "minDigits",
    "minLength",
  ];
  const validCheck = (checkList) => {
    for (var i = 0; i < checkList.length; i++) {
      if (checkList[i].status === false && checkList[i].show === true) {
        return false;
      }
    }
    return true;
  };
  useEffect(() => {
    const validateInput = (value) => {
      let updatedChecklist = checklistArr.map((eachCheck) => {
        switch (eachCheck) {
          case "minUpper":
            if (minUpper > 0) {
              const UL = value.replace(/[^A-Z]/g, "").length;
              if (UL >= minUpper) {
                return {
                  status: true,
                  msg: "Atleast One Upper Case",
                  show: true,
                };
              } else {
                return {
                  status: false,
                  msg: "Atleast One Upper Case",
                  show: true,
                };
              }
            } else {
              return {
                status: false,
                msg: "Atleast One Upper Case",
                show: false,
              };
            }
          case "minLower":
            if (minLower > 0) {
              const LL = value.replace(/[^a-z]/g, "").length;
              if (LL >= minLower) {
                return {
                  status: true,
                  msg: "Atleast One Lower Case",
                  show: true,
                };
              } else {
                return {
                  status: false,
                  msg: "Atleast One Lower Case",
                  show: true,
                };
              }
            } else {
              return {
                status: false,
                msg: "Atleast One Lower Case",
                show: false,
              };
            }
          case "minSpl":
            if (minSpl > 0) {
              const SpL = value.match(/[@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/g)
                .length;
              if (SpL >= minSpl) {
                return {
                  status: true,
                  msg: "Atleast one Special Character",
                  show: true,
                };
              } else {
                return {
                  status: false,
                  msg: "Atleast one Special Character",
                  show: true,
                };
              }
            } else {
              //If Special Characters Not allowed - Then check for the length
              if (!isSplChrsAllowed) {
                const Sp = value.match(/[@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/g);
                const SpL = Sp ? Sp.length : 0;
                if (SpL > 0) {
                  return {
                    status: false,
                    msg: "No Special Characters Allowed",
                    show: true,
                  };
                } else {
                  return {
                    status: true,
                    msg: "No Special Characters Allowed",
                    show: true,
                  };
                }
              } else {
                return {
                  status: false,
                  msg: "No Special Characters Allowed",
                  show: false,
                };
              }
            }
          case "minDigits":
            if (minDigits > 0) {
              const DL = value.match(/\d/g).length;
              if (DL >= minDigits) {
                return {
                  status: true,
                  msg: "Atleast one Digit",
                  show: true,
                };
              } else {
                return {
                  status: false,
                  msg: "Atleast one Digit",
                  show: true,
                };
              }
            } else {
              //If Digits Not allowed - Then check for the length
              if (!isDigitsAllowed) {
                const D = value.match(/\d/g);
                const DL = D ? D.length : 0;
                if (DL > 0) {
                  return {
                    status: false,
                    msg: "No Digits Allowed",
                    show: true,
                  };
                } else {
                  return {
                    status: true,
                    msg: "No Digits Allowed",
                    show: true,
                  };
                }
              } else {
                return {
                  status: false,
                  msg: "No Digits Allowed",
                  show: false,
                };
              }
            }
          case "minLength":
            const Length = value.length;
            if (Length >= minLength) {
              return {
                status: true,
                msg: "Atleast 6 characters long",
                show: true,
              };
            } else {
              return {
                status: false,
                msg: "Atleast 6 characters long",
                show: true,
              };
            }
        }
      });
      updatedChecklist = updatedChecklist.filter((check) => {
        return check.show === true;
      });
      setchecklist(updatedChecklist);
    };
    validateInput(ref.current.value);
  }, [ref.current && ref.current.value]);
  return [validCheck(checklist), checklist];
};
