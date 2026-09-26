import { useState, useEffect } from "react";
import { Typography } from "@mui/material";
import { connect } from "react-redux";
import globalStyles from "core/Styles/globalStyles";
import { useNavigate } from "react-router-dom-v5-compat";
import {
    getConfiguratorAppsConfig,
    getClientSubscribedApps,
  } from "core/actions/configuratorActions";
  import { cloneDeep, debounce } from "lodash";
  import "./style.css";
import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import { useParams } from "react-router-dom";
import { Button } from "@mui/material";
import { Input } from "impact-ui";
import Loader from "core/Utils/Loader/loader";
import { moduleConfiguratorJSON } from "./constants";
import { updateSubscribeStatus } from "./helper-functions";
import { CONFIGURATOR } from "modules/oms/constants-oms/routeConstants.js";

import Calendar from "assets/Calendar.png";
import Selected from "coreAssets/active.svg?url";
import StarLeft from "coreAssets/star.svg?url";
import StarRight from "assets/Soft Star (1).svg?url";
import TextStar from "assets/Soft Star (2).svg?url";
import NotActiveCalendar from "assets/NotActiveCalendar.png";


const ModuleWorkflowView = (props) => {
  const globalClasses = globalStyles();
  const [loading, setLoading] = useState(false);
  const client = "demo";
  const [data, setData] = useState({});
  const [config, setConfig] = useState(null);
  const [productMapping, setProductMapping] = useState([]);
  const [productsDescription, setProductsDescriptions] = useState([]);
  const [products, setProducts] = useState([{
    id:1,
    title:"Ordering",
    product:"Ordering",
    desc:"ordering",
    small_description:"Configure Inventory planning for optimised allocation, replenishment & ordering.",
    

},{
    id:2,
    title:"Inventory",
    desc:"Inventory",
    small_description:"Configure Inventory planning for optimised allocation, replenishment & ordering.",
    product:"Inventory",

}]);
  const [clientProducts, setClientProducts] = useState([]);
  const [activeProduct, setActiveProduct] = useState({
    id:1,
    title:"Ordering",
    product:"Ordering",
    desc:"ordering",
    small_description:"Configure Inventory planning for optimised allocation, replenishment & ordering.",
    descriptions:"Optimize ordering of inventories through retail allocation that leverages predictive analytics for the greatest accuracy in even the most complex allocation and replenishment businesses. Our solution is highly automatable and accurate using leading edge machine learning models that allow for rapid “what-if” simulations to ensure the business is making the right decisions.",
    is_subscribed: true,
    url:"ordering"

});
  const [originalProductList, setOriginalProductList] = useState([]);
  const [nameSearchVal, setNameSearchVal] = useState("");
  const navigate = useNavigate();

  const homeIcon = [
    {
      label: "Home",
      id: 1,
    },
  ];
  


  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        let result = moduleConfiguratorJSON
          
        const subscribedAppsResp = [
            {
                "application": "MondaySmart"
            },
            {
                "application": "Workflow Input Center"
            },
            {
                "application": "InventorySmart"
            },
            {
                "application": "Master Data View"
            },
            {
                "application": "MLOps"
            },
            {
                "application": "Module Configurator"
            },
            {
                "application": "AssortSmart"
            },
            {
                "application": "ItemSmart"
            },
            {
                "application": "PlanSmart"
            },
            {
                "application": "DataIngestion"
            },
            {
                "application": "Application Access Management"
            }
        ];
        result["tb_product_description"] = updateSubscribeStatus(
          cloneDeep(result["tb_product_description"]),
          subscribedAppsResp
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


//   const search = debounce((nameVal) => {
//     const matchingResults = originalProductList?.filter((obj) =>
//       obj.id.toLowerCase().includes(nameVal.toLowerCase())
//     );
//     // Update search results
//     setProducts(matchingResults);
//   }, 300);

  if (loading || !data) {
    return <Loader loader={loading}></Loader>;
  }

  function Product({
    id,
    title,
    desc,
    selected,
    active,
    handleSelected,
    activeProduct,
  }) {
    const [hover, setHover] = useState(false);
    if (selected) {
      return (
        <div className="product-card selected" >
          <div className="product-select-indicator">
            <img src={Selected} alt="product-select-indicator" />
          </div>
          <div className="product-select-star-left selected">
            <img src={StarLeft} alt="product-select-star-left" />
          </div>
          <div className="product-select-star-right selected">
            <img src={StarRight} alt="product-select-star-right" />
          </div>
          <div className="product-select-calendar">
            <img src={Calendar} alt="product-select-calendar" />
          </div>
          <div className="product-select-star-text selected">
            <img src={TextStar} alt="product-select-star-text" />
          </div>
          <div className="product-card-bottom">
            <div className="product-title selected">{title}</div>
            <div className="product-description">{desc}</div>
          </div>
        </div>
      );
    } else {
      return (
        <div
          className="product-card not-selected"
          onMouseOver={() => setHover(true)}
          onMouseOut={() => setHover(false)}
          onClick={() => handleSelected(id)}
        >
          <div className="product-select-star-left">
            <img src={StarLeft} alt="product-select-star-left" />
          </div>
          <div className="product-select-star-right">
            <img src={StarRight} alt="product-select-star-right" />
          </div>
          <div className="product-select-calendar">
            <img
              src={hover ? Calendar : NotActiveCalendar}
              alt="product-select-calendar"
            />
          </div>
          <div className="product-select-star-text">
            <img src={TextStar} alt="product-select-star-text" />
          </div>
          <div className="product-card-bottom">
            <div className="product-title">{title}</div>
            <div className="product-description">{desc}</div>
          </div>
        </div>
      );
    }
  }

  const handleSelected = (id) => {

    let products=[{
      id:1,
      title:"Ordering",
      product:"Ordering",
      desc:"ordering",
      small_description:"Configure Inventory planning for optimised allocation, replenishment & ordering.",
      descriptions:"Optimize ordering of inventories through retail allocation that leverages predictive analytics for the greatest accuracy in even the most complex allocation and replenishment businesses. Our solution is highly automatable and accurate using leading edge machine learning models that allow for rapid “what-if” simulations to ensure the business is making the right decisions.",
      is_subscribed: true,
      url:"ordering"

    },
    {
        id:2,
        title:"Inventory",
        desc:"Inventory",
        small_description:"helllo"

    }]
    let res = products.filter((item) => item.id == id)[0];
    setActiveProduct(res);
  };

  const handleNavigation = () => {
   
      navigate(`${CONFIGURATOR}/${activeProduct.url}/module-configurator`);
    
  };

  

console.log('activeProduct',activeProduct)
  return (
    <>
    {/* <div>
      <Typography variant="h5" style={{ padding: "20px" }} gutterBottom>
        Module Configurator Screen
      </Typography>
    </div> */}
    <section className="configurator-section">
      <HeaderBreadCrumbs options={homeIcon} />
      <div className="configurator-container">
        <div className="configurator-description-container">
          <div className="configurator-level-description">
            <div className="configurator-title">IA Smart Configurator</div>
            {/* {config && ( */}
              <div className="configurator-description">
                IA Smart Platform leverages ADA powered AI/ML based long range forecasts to generate merchandising financial plans at multiple levels of product hierarchy. Also, generates optimised plans based on key constraints and strategic objectives. Also, generates optimised levels of product hierarchy. Also, generates optimised plans based on key constraints and strategic objectives.

                {/* {config.configurator_description} */}
              </div>
            {/* )} */}
            <div className="configurator-know-more-btn">
              Click here to know more about how to use
            </div>
          </div>
          {activeProduct && (
            <div className="configurator-selected-product">
              <div className="configurator-selected-product-title">
                {activeProduct.product}
              </div>
              <div className="configurator-selected-product-description">
              Optimize inventories through retail ordering that leverages predictive analytics for the greatest accuracy in even the most comp
                {/* {activeProduct?.descriptions?.split("/n").length > 0 ? (
                  activeProduct?.descriptions?.split("/n").map((item) => {
                    return <p>{item}</p>;
                  })
                ) : ( */}
                  <p>{activeProduct.descriptions}</p>
                {/* )} */}
              </div>
              <div className="configurator-seprator"></div>
              <div className="configurator-selected-product-title">
                Benefits
              </div>
              <ul className="configurator-selected-product-benefits">
                {/* {activeProduct?.benefits?.split("/n")?.map((item) => {
                  return <li>{item}</li>;
                })} */}
                <li>Optimized end-to-end Ordering of Inventory Planning
                Business friendly defaulting & exception management
                Automated allocation & replenishments
                Exhaustive reporting & insights
                Customized alerts</li>
              </ul>
              <div style={{ textAlign: "right" }}>
                {activeProduct?.is_subscribed ? (
                  <Button className="contained-btn" onClick={handleNavigation}>
                    Get Started
                  </Button>
                ) : (
                  <Button
                    color="primary"
                    variant="contained"
                    component="a"
                    href={"https://www.impactanalytics.co/"}
                    target="_blank"
                  >
                    Know More
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
            <div className="configurator-product-title">Our Products</div>
            <div className={`${globalClasses.flexRow}`}>
              <Input
                placeholder="Search..."
                helperText="Enter a valid product name"
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
                Back{" "}
              </Button>
            </div>
          </div>
          <div className="product-cards">
      {products.map((item) => {
        return (
          <Product
            key={item.id}
            id={item.id}
            title={item.product}
            desc={item.small_description}
            handleSelected={handleSelected}
            activeProduct={activeProduct}
           selected={activeProduct.id == item.id}
          />
        );
      })}
    </div>
        </div>
      </div>
    </section>
    </>

    
    
  );
};

const mapStateToProps = (state) => {};

const mapActionsToProps = {};

export default connect(mapStateToProps, mapActionsToProps)(ModuleWorkflowView);
