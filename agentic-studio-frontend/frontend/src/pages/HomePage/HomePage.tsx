import { PrimaryMediumButton } from "../../components/Button";
import banner from "../../assets/images/banner.svg";
import { AppCard } from "../../components/Card";
import { useNavigate } from "react-router-dom";



const HomePage = () => {
  const baseUrl = "https://impact-agents.ai";
  let appDomain = import.meta.env.VITE_API_BASE_URL;
  if (appDomain === "https://impact-agents.ai/") {
    appDomain = "https://app.impact-agents.ai/";
  }
  
  const featuredApps = [
    {
      title: "ROIALLY",
      description: "It's a value hunting ally at Impact Analytics. It can calculate how much ROI we can capture for a company. Users can enter their company name.",
      tags: ["Productivity", "Technology"],
      link: "http://ajunsmachine.theworkpc.com:8000/v1"
    },
    // {
    //   title: "IA Digital Agent",
    //   description: "Ask anything about Impact Analytics and get instant answers. You can ask about the company, products, services, people, etc.",
    //   tags: ["Productivity", "Technology"],
    //   link: `${baseUrl}/ia_digital_agent`
    // },
    {
      title: "Assortment Recommendation Application",
      description: "Ask any assortment details about Interstate-Batteries and get instant answers.",
      tags: ["Productivity", "Technology"],
      link: `${baseUrl}/ib_agent`
    },
    // {
    //   title: "Leslies Pool Banner Agent",
    //   description: "Generates banners personalised to different platform, trend keywords for the Leslies pool product campaigns.",
    //   tags: ["Productivity", "Technology"],
    //   link: `${baseUrl}/leslies-pool-agent`
    // },
    {
      title: "Image Generator Application",
      description: "Agent to creates banners personalised to different platform, trend keywords for the PSP's product campaigns.",
      tags: ["Productivity", "Technology"],
      link: `${baseUrl}/psp-agent`
    },
    // {
    //   title:"ARIAT",
    //   description: "Generate images and videos for Ariat's product campaigns and promotions.",
    //   tags: ["Productivity", "Technology"],
    //   link: `${baseUrl}/ariat-agent`
    // },
    {
      title: "Store Ops SOP Application",
      description: "AI assistant to help you navigate through Pet Supplies Plus's Standard Operating Procedures (SOPs).",
      tags: ["Productivity", "Technology"],
      link: `https://app.impact-agents.ai/apps/psp-sop`
    },
    {
      title: "Generic Image and Video Generator Application",
      description: "Generate images and videos for product campaigns and promotions.",
      tags: ["Productivity", "Technology"],
      link: `${baseUrl}/usc-agent`
    },
    {
      title: "Label compliance checker Application",
      description: "AI assistant to help you retrieve or view a detailed summary of the label compliance of a product/image based on guidelines",
      tags: ["Productivity", "Technology"],
      link: `${baseUrl}/label-compliance-agent`
    },
    {
      title: "Generic - Store Operations SOP Application",
      description: "AI assistant to help you navigate through Standard Operating Procedures (SOPs) for store operations.",
      tags: ["Productivity", "Technology"],
      link: `${baseUrl}/pet_pantry_sop`
    },
    {
      title: "Generic Banner Generator Application",
      description: "Create personalized banners for different platforms and trend keywords for product campaigns.",
      tags: ["Productivity", "Technology"],
      link: `${baseUrl}/complete_pet_banner`
    },
    {
      title: "Generic - Assortment Recommendation Application",
      description: "Get intelligent recommendations and insights for product assortment optimization.",
      tags: ["Productivity", "Technology"],
      link: `${baseUrl}/assortment_recommendation`
    },
    {
      title: "Advanced Image Generator Application",
      description: "Agent to creates banners personalised to different platform, trend keywords for the PSP's product campaigns.",
      tags: ["Productivity", "Technology"],
      link: `${baseUrl}/psp-agent-v2`
    }
  ];
  const navigate = useNavigate();
  return (
    <>
      <div className="home-banner">
        <div className="home-banner__text">
          <span className="home-banner__text-title headline-3">Create your own custom Agent</span>
          <span className="home-banner__text-description body-medium">Build reliable AI agents, enable Safe AI and Responsible AI modules, and access them via Agent API or launch it as an app instantly.</span>
          <div className="home-banner__button">
            <PrimaryMediumButton onClick={() => navigate('/agents/create')}>
              Build Agent
            </PrimaryMediumButton>
          </div>
        </div>
        <div className="home-banner__image">
          <img src={banner} alt="Home Page Banner" />
        </div>
      </div>
      <div className="home-featured-apps">
        <div className="home-featured-apps__header headline-4">
          <span>Featured Apps</span>
        </div>
        <div className="home-featured-apps__cards">
          {featuredApps.map((app, index) => (
            <AppCard key={app.title} {...app} gradientIndex={index} />
          ))}
        </div>
      </div>
    </>
  );
};

export default HomePage;