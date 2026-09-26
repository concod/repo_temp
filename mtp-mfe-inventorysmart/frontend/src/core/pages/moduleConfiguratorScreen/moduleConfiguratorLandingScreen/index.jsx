import { useEffect, useState } from "react";
import "./style.css";
import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import { Button } from "@mui/material";
import ProductCard from "./Cards";
import Loader from "core/Utils/Loader/loader";
import { moduleConfiguratorJSON } from "./constants";
import { Input } from "impact-ui";
import { useTranslation } from "impact-ui-v3";
import { cloneDeep, debounce } from "lodash";
import globalStyles from "core/Styles/globalStyles";
import {
  getClientSubscribedApps,
} from "core/actions/configuratorActions";
import { updateSubscribeStatus } from "./helper-functions";
import { useNavigate } from "react-router-dom-v5-compat";
import { CONFIGURATOR_LANDING } from "modules/assortsmart/constants-assortsmart/routesContants";
import { PLAN_SMART_CONFIGURATOR_LANDING_PAGE } from "modules/plansmart/constants-plansmart/routesConstants";

const Configurator = (props) => {
  const globalClasses = globalStyles();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const client = "demo";
  const [data, setData] = useState({});
  const [config, setConfig] = useState(null);
  const [productMapping, setProductMapping] = useState([]);
  const [productsDescription, setProductsDescriptions] = useState([]);
  const [products, setProducts] = useState([]);
  const [clientProducts, setClientProducts] = useState([]);
  const [activeProduct, setActiveProduct] = useState(null);
  const [originalProductList, setOriginalProductList] = useState([]);
  const [nameSearchVal, setNameSearchVal] = useState("");
  const navigate = useNavigate();

  const handleActiveProducts = (clientProducts, products) => {
    let actProduct = clientProducts.filter((item) => item.status == "TRUE");
    setActiveProduct(
      products.filter((item) => item.id === actProduct[0].product_id)[0]
    );
  };

  const handleNavigation = () => {
    if (activeProduct && activeProduct.id === "assortsmart") {
      navigate(`${CONFIGURATOR_LANDING}`);
    } else if(activeProduct && activeProduct.id === "plansmart") {
      navigate(PLAN_SMART_CONFIGURATOR_LANDING_PAGE);
    } else {
      navigate(
        "/" +
          window?.location?.pathname?.split("/")[1] +
          "/" +
          activeProduct.url +
          "/" +
          "application-configurator"
      );
    }
  };

  // function to add products details from client products
  const configuringClientProductsDescriptions = (clientProducts, products) => {
    let res = clientProducts.map((citem) => {
      return products.filter((item) => item.id == citem.product_id)[0];
    });
    setProducts(res);
    setOriginalProductList(res);
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        let result = moduleConfiguratorJSON;
        const subscribedAppsResp = await getClientSubscribedApps()();
        result["tb_product_description"] = updateSubscribeStatus(
          cloneDeep(result["tb_product_description"]),
          subscribedAppsResp?.data?.data
        );
        setData(result);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (Object.keys(data).length > 0) {
      setConfig(data.tb_configurator_description?.[0] || null);
      setProductMapping(data.tb_client_product_mapping || []);
      setProductsDescriptions(data.tb_product_description);
      setClientProducts(
        data.tb_client_product_mapping.filter(
          (item) => item.client_url === client
        ) || []
      );
      if (clientProducts && clientProducts.length > 0) {
        handleActiveProducts(clientProducts, productsDescription);
        configuringClientProductsDescriptions(
          clientProducts,
          productsDescription
        );
      }
    }
  }, [data, client, productMapping]);

  const search = debounce((nameVal) => {
    const matchingResults = originalProductList?.filter((obj) =>
      obj.id.toLowerCase().includes(nameVal.toLowerCase())
    );
    // Update search results
    setProducts(matchingResults);
  }, 300);

  if (loading || !data) {
    return <Loader loader={loading}></Loader>;
  }

  return (
    <section className="configurator-section">
      <HeaderBreadCrumbs options={[{ label: t("moduleConfigurator.breadcrumb.home"), id: 1 }]} />
      <div className="configurator-container">
        <div className="configurator-description-container">
          <div className="configurator-level-description">
            <div className="configurator-title">{t("moduleConfigurator.landing.iaSmartConfigurator")}</div>
            {config && (
              <div className="configurator-description">
                {config.configurator_description}
              </div>
            )}
            <div className="configurator-know-more-btn">
              {t("moduleConfigurator.landing.clickHereToKnowMore")}
            </div>
          </div>
          {activeProduct && (
            <div className="configurator-selected-product">
              <div className="configurator-selected-product-title">
                {activeProduct.product}
              </div>
              <div className="configurator-selected-product-description">
                {activeProduct.descriptions.split("/n").length > 0 ? (
                  activeProduct.descriptions.split("/n").map((item) => {
                    return <p>{item}</p>;
                  })
                ) : (
                  <p>{activeProduct.descriptions}</p>
                )}
              </div>
              <div className="configurator-seprator"></div>
              <div className="configurator-selected-product-title">
                {t("moduleConfigurator.landing.benefits")}
              </div>
              <ul className="configurator-selected-product-benefits">
                {activeProduct?.benefits?.split("/n")?.map((item) => {
                  return <li>{item}</li>;
                })}
              </ul>
              <div style={{ textAlign: "right" }}>
                {activeProduct?.is_subscribed ? (
                  <Button className="contained-btn" onClick={handleNavigation}>
                    {t("moduleConfigurator.landing.getStarted")}
                  </Button>
                ) : (
                  <Button
                    color="primary"
                    variant="contained"
                    component="a"
                    href={"https://www.impactanalytics.co/"}
                    target="_blank"
                  >
                    {t("moduleConfigurator.landing.knowMore")}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
        <div className={`configurator-products-container `}>
          <div
            className={`${globalClasses.flexRow} ${globalClasses.layoutAlignSpaceBetween}`}
          >
            <div className="configurator-product-title">{t("moduleConfigurator.landing.ourProducts")}</div>
            <div className={`${globalClasses.flexRow}`}>
              <Input
                placeholder={t("moduleConfigurator.landing.searchPlaceholder")}
                helperText={t("moduleConfigurator.landing.searchHelperText")}
                onChange={(event) => {
                  setNameSearchVal(event.target.value);
                  search(event.target.value);
                }}
                value={nameSearchVal}
              />
              <Button
                variant="text"
                onClick={() => {
                  navigate("/home");
                }}
              >
                {" "}
                {t("moduleConfigurator.landing.back")}{" "}
              </Button>
            </div>
          </div>
          <ProductCard
            products={products}
            activeProduct={activeProduct}
            setActiveProduct={setActiveProduct}
          />
        </div>
      </div>
    </section>
  );
};

export default Configurator;
