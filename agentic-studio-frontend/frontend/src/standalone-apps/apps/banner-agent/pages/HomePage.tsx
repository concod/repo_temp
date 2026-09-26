// @ts-expect-error Reuse existing JSX component in TSX page.
import Sidebar from "../components/Sidebar/Sidebar";
// @ts-expect-error Reuse existing JSX component in TSX page.
import AvatarHeader from "../components/AvatarHeader/AvatarHeader";
import { useAuthStore } from "../store/authStore";
import { useStandaloneCreativeConfig } from "../../../shared/packages/marketingCreativeCore/provider";
import "./Assets/AssetsPage.scss";
import "./HomePage.scss";

const projectCards = [
    { id: 1, title: "PSP Ad 13 Feb", updatedAt: "Last edited on February 13, 2026 at 11:56 PM" },
    { id: 2, title: "PSP Ad 13 Feb", updatedAt: "Last edited on February 13, 2026 at 11:56 PM" },
    { id: 3, title: "PSP Ad 13 Feb", updatedAt: "Last edited on February 13, 2026 at 11:56 PM" },
];

export default function HomePage() {
    const { userName, userEmail } = useAuthStore();
    const {
        defaultPrompt,
        branding: { heroImageSrc },
    } = useStandaloneCreativeConfig();
    const displayName = userName || userEmail?.split("@")[0] || "Vinayak";

    return (
        <section className="assets-page banner-agent-home-page">
            <Sidebar activeItem="Home" />

            <main className="assets-page__main">
                <section className="assets-page__panel banner-agent-home-page__panel">
                    <header className="banner-agent-home-page__header">
                        <h1>
                            Welcome <strong>{displayName}</strong>
                        </h1>
                        <p>Create, edit and scale. Cook your next ad.</p>
                    </header>

                    <section className="banner-agent-home-page__actions" aria-label="Primary actions">
                        <article className="banner-agent-home-page__generate-card">
                            <div className="text">
                                <h2>Generate Asset</h2>
                                <p>Create asset for your next ad with just a prompt</p>
                                <span className="meta">5 Assets generated</span>
                            </div>
                            <div className="hero" aria-hidden="true">
                                <img src={heroImageSrc} alt="" />
                            </div>
                            <div className="prompt-row">
                                <input
                                    type="text"
                                    placeholder={`Eg: ${defaultPrompt}`}
                                    aria-label="Generation prompt"
                                />
                                <button type="button" aria-label="Submit prompt">
                                    <span>➜</span>
                                </button>
                            </div>
                        </article>

                        <div className="banner-agent-home-page__side-cards">
                            <article className="mini-card mini-card--blue">
                                <h3>Make Ad</h3>
                                <p>Create and Scale ads for your product</p>
                                <span>3 Ads Created</span>
                            </article>
                            <article className="mini-card mini-card--pink">
                                <h3>Asset to video</h3>
                            </article>
                        </div>
                    </section>

                    <section className="banner-agent-home-page__projects" aria-label="Recent projects">
                        <div className="banner-agent-home-page__projects-head">
                            <h2>Your Recent Projects</h2>
                            <button type="button">View All</button>
                        </div>

                        <div className="banner-agent-home-page__project-grid">
                            {projectCards.map((project) => (
                                <article key={project.id} className="project-card">
                                    <div className="project-card__preview" aria-hidden="true">
                                        <img src={heroImageSrc} alt="" />
                                    </div>
                                    <div className="project-card__body">
                                        <h3>{project.title}</h3>
                                        <p>{project.updatedAt}</p>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </section>
                </section>
            </main>
        </section>
    );
}
