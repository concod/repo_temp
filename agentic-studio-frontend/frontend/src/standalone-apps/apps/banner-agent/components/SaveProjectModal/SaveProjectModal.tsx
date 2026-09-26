import type { FormEvent, MouseEvent } from "react";
import "./SaveProjectModal.scss";

type SaveProjectOption = {
    id: string;
    name: string;
    description?: string;
    assetCountLabel?: string;
    canSelect?: boolean;
};

type SaveProjectModalProps = {
    isOpen: boolean;
    isSaving: boolean;
    isLoadingProjects: boolean;
    projectsError: string;
    saveError: string;
    projects: SaveProjectOption[];
    selectedProjectId: string;
    assetName: string;
    assetDescription: string;
    onClose: () => void;
    onSubmit: (event?: FormEvent<HTMLFormElement>) => void;
    onProjectSelect: (projectId: string) => void;
    onAssetNameChange: (nextName: string) => void;
    onAssetDescriptionChange: (nextDescription: string) => void;
    title?: string;
    subtitle?: string;
};

export default function SaveProjectModal({
    isOpen,
    isSaving,
    isLoadingProjects,
    projectsError,
    saveError,
    projects,
    selectedProjectId,
    assetName,
    assetDescription,
    onClose,
    onSubmit,
    onProjectSelect,
    onAssetNameChange,
    onAssetDescriptionChange,
    title = "Save to Project",
    subtitle = "Choose a project and store this asset as a new item.",
}: SaveProjectModalProps) {
    if (!isOpen) {
        return null;
    }

    const handleOverlayClick = (event: MouseEvent<HTMLDivElement>) => {
        if (isSaving) {
            return;
        }
        if (event.target === event.currentTarget) {
            onClose();
        }
    };

    return (
        <div className="save-project-modal__overlay" onClick={handleOverlayClick}>
            <div
                className="save-project-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="save-project-modal-title"
            >
                <header className="save-project-modal__header">
                    <div>
                        <h3 id="save-project-modal-title">{title}</h3>
                        <p>{subtitle}</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => (isSaving ? undefined : onClose())}
                        aria-label="Close save modal"
                        disabled={isSaving}
                    >
                        ×
                    </button>
                </header>

                <form className="save-project-modal__form" onSubmit={onSubmit}>
                    <div className="save-project-modal__body">
                        <section className="save-project-modal__projects">
                            <h4>Projects</h4>
                            <div className="save-project-modal__project-list">
                                {isLoadingProjects ? (
                                    <div className="save-project-modal__state">Loading projects...</div>
                                ) : null}
                                {!isLoadingProjects && projectsError ? (
                                    <div className="save-project-modal__state save-project-modal__state--error">
                                        {projectsError}
                                    </div>
                                ) : null}
                                {!isLoadingProjects && !projectsError && projects.length === 0 ? (
                                    <div className="save-project-modal__state">No projects found yet.</div>
                                ) : null}
                                {!isLoadingProjects && !projectsError && projects.length > 0 ? (
                                    <div className="save-project-modal__project-items">
                                        {projects.map((project) => (
                                            <button
                                                key={project.id}
                                                type="button"
                                                className={`save-project-modal__project ${selectedProjectId === project.id ? "is-active" : ""}`}
                                                onClick={() => {
                                                    if (!project.canSelect) return;
                                                    onProjectSelect(project.id);
                                                }}
                                                disabled={!project.canSelect}
                                            >
                                                <div>
                                                    <span className="save-project-modal__project-name">{project.name}</span>
                                                    {project.description ? (
                                                        <span className="save-project-modal__project-desc">{project.description}</span>
                                                    ) : null}
                                                </div>
                                                <span className="save-project-modal__project-meta">
                                                    {project.assetCountLabel}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                ) : null}
                            </div>
                        </section>

                        <section className="save-project-modal__details">
                            <div className="save-project-modal__field">
                                <label htmlFor="save-project-asset-name">Asset name</label>
                                <input
                                    id="save-project-asset-name"
                                    type="text"
                                    value={assetName}
                                    onChange={(event) => onAssetNameChange(event.target.value)}
                                    placeholder="Summer Banner - Edited"
                                />
                            </div>
                            <div className="save-project-modal__field">
                                <label htmlFor="save-project-asset-description">Description (optional)</label>
                                <textarea
                                    id="save-project-asset-description"
                                    value={assetDescription}
                                    onChange={(event) => onAssetDescriptionChange(event.target.value)}
                                    placeholder="Added logo and adjusted colors in editor"
                                    rows={4}
                                />
                            </div>
                            {saveError ? (
                                <div className="save-project-modal__error" role="alert">
                                    {saveError}
                                </div>
                            ) : null}
                        </section>
                    </div>

                    <div className="save-project-modal__actions">
                        <button
                            type="button"
                            className="save-project-modal__cancel"
                            onClick={() => onClose()}
                            disabled={isSaving}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="save-project-modal__submit"
                            disabled={isSaving || !selectedProjectId}
                        >
                            {isSaving ? "Saving..." : "Save Asset"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
