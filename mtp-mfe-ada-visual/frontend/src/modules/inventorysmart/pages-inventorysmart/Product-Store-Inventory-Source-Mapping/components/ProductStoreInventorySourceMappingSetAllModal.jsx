import { useEffect, useMemo, useState } from "react";
import Form from "core/Utils/form";
import ConfirmPrompt from "core/commonComponents/confirmPrompt";
import globalStyles from "core/Styles/globalStyles";
import {
  DIALOG_APPLY_BTN_TEXT,
  DIALOG_CANCEL_BTN_TEXT,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";

const ProductStoreInventorySourceMappingSetAllModal = (props) => {
  const [formData, setFormData] = useState({});
  const [payloadListByArticle, setPayloadListByArticle] = useState([]);
  const globalClasses = globalStyles();

  const PRODUCT_STORE_INVENTORY_SOURCE_MAPPING_SET_ALL_FIELDS = useMemo(
    () => [
      {
        label:"Inventory Source",
        accessor: "inv_source",
        field_type: "list",
        options:[
          {
            label: "RFID",
            value: "1"
          },
          {
            label: "Book",
            value: "0"
          },
        ]
      }
    ],
    []
  );

  const generatePayloadByArticleId = (articles) => {
    const payloadList = [];
    const payloadMapByArticle = {};

    articles?.forEach((article) => {
      const articleId = article?.article;
      const storeCode = article?.store_code;

      if (!payloadMapByArticle?.[articleId]) {
        payloadMapByArticle[articleId] = {
          articleId,
          store_code: [storeCode],
        };
      } else {
        payloadMapByArticle?.[articleId]?.store_code?.push(storeCode);
      }
    });

    for (const articleId in payloadMapByArticle) {
      payloadList?.push(payloadMapByArticle[articleId]);
    }

    setPayloadListByArticle([...payloadList]);
    return payloadList;
  };

  const handleChange = (data) => {
    //TODO this has to be handled in form/index.js in future
    setFormData(data);
  };

  const onApply = async () => {
    let itemsToUpdate = [];
    let selections = props.agGridInstance.api.getSelectedNodes();

    selections.forEach((row) => {
      const selected = row.data;

      selected.grade = formData?.store_grade;
      //the below key is flag hence setting 0 or 1
      selected.inv_source = formData?.inv_source ? formData?.inv_source : "0";

      itemsToUpdate.push(selected);
    });
    await props.agGridInstance.api.refreshCells({ update: itemsToUpdate });
    props.saveMapping(formData, payloadListByArticle);
  };

  useEffect(() => {
    if (props.showSetAllModal && props.selectedArticles?.length) {
      generatePayloadByArticleId(props.selectedArticles);
    }
  }, [props.showSetAllModal, props.selectedArticles]);

  return (
    <>
      <ConfirmPrompt
        showModal={props.showSetAllModal}
        title="Set All"
        message=""
        ariaLabeledBy="confirm-delete-dialog-set-all"
        primaryBtnText={DIALOG_APPLY_BTN_TEXT}
        secondaryBtnText={DIALOG_CANCEL_BTN_TEXT}
        showCloseIcon={true}
        setConfirm={props.setShowSetAllModal}
        size={"xs"}
        confirmCallback={(val) => {
          if (val) {
            onApply();
          }
        }}
      >
        <div>
          <Form
            maxFieldsInRow={2}
            layout={"vertical"}
            handleChange={handleChange}
            fields={PRODUCT_STORE_INVENTORY_SOURCE_MAPPING_SET_ALL_FIELDS}
            updateDefaultValue={true}
            defaultValues={{}}
          ></Form>
        </div>
      </ConfirmPrompt>
    </>
  );
};

export default ProductStoreInventorySourceMappingSetAllModal;
