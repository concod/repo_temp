import React, { useEffect, useMemo, useState } from 'react'
import Sidebar from '../../components/Sidebar/Sidebar'
import { bannerAgentConfig } from '../../config/bannerAgentConfig'
import { bannerAgentService } from '../../services/bannerAgentService'
import { DeleteModal } from '../../../../../components/Modal'
import projectsIcon from '../../assets/sidebar-icons/projects-selected.svg'
import savedAssetsIcon from '../../assets/saved-assets.png'
import editIcon from '../../assets/editAsset.svg'
import deleteIcon from '../../assets/delete.svg'
import './ProjectsPage.scss'

const toSafeString = (value) => (typeof value === 'string' ? value.trim() : '')

const formatTimestamp = (value) => {
    const raw = toSafeString(value)
    if (!raw) return null

    const parsed = new Date(raw)
    if (Number.isNaN(parsed.getTime())) return null

    return parsed.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    })
}

const formatLastEdited = (updatedAt, createdAt) => {
    const formatted = formatTimestamp(updatedAt) || formatTimestamp(createdAt)
    return formatted ? `Last edited on ${formatted}` : 'Last edited date unavailable'
}

const formatCreatedLabel = (value) => {
    const formatted = formatTimestamp(value)
    return formatted ? `Created on ${formatted}` : 'Created date unavailable'
}

const getAssetType = (asset) => {
    const metadataType = toSafeString(asset?.metadata?.type).toLowerCase()
    return metadataType === 'video' ? 'video' : 'image'
}

const getAssetPreview = (asset) => {
    const assetUrl = toSafeString(asset?.asset_url)
    if (assetUrl) return assetUrl
    const metadataImage = typeof asset?.metadata?.image_data === 'string'
        ? asset.metadata.image_data.trim()
        : ''
    return metadataImage || ''
}

const getAssetDownloadExtension = (asset) => {
    const assetUrl = toSafeString(asset?.asset_url)
    const match = assetUrl ? assetUrl.split('?')[0].match(/\.([a-z0-9]+)$/i) : null
    const extension = match ? match[1].toLowerCase() : ''
    const assetType = getAssetType(asset)

    if (assetType === 'video') {
        return ['mp4', 'mov', 'webm', 'm4v'].includes(extension) ? extension : 'mp4'
    }

    if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(extension)) {
        return extension === 'jpeg' ? 'jpg' : extension
    }

    return 'png'
}

const buildAssetDownloadName = (asset) => {
    const rawName = toSafeString(asset?.asset_name) || toSafeString(asset?.id) || 'project-asset'
    const sanitized = rawName.replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '')
    return `${sanitized || 'project-asset'}.${getAssetDownloadExtension(asset)}`
}

const getOptionalField = (value, fallback = 'N/A') => {
    const normalized = toSafeString(value)
    return normalized || fallback
}

const getAssetCountLabel = (value) => {
    const parsedCount = typeof value === 'number'
        ? value
        : typeof value === 'string'
            ? Number.parseInt(value, 10)
            : 0
    const count = Number.isFinite(parsedCount) ? parsedCount : 0
    return `${count} ${count === 1 ? 'asset' : 'assets'}`
}

const getSortTimestamp = (project) => {
    const candidate = toSafeString(project?.updated_at) || toSafeString(project?.created_at)
    if (!candidate) return 0
    const parsed = new Date(candidate)
    if (Number.isNaN(parsed.getTime())) return 0
    return parsed.getTime()
}

function ProjectsPage() {
    const [projects, setProjects] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState('')
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [projectName, setProjectName] = useState('')
    const [projectDescription, setProjectDescription] = useState('')
    const [submitError, setSubmitError] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [editingProjectId, setEditingProjectId] = useState(null)
    const [deleteModal, setDeleteModal] = useState({
        isOpen: false,
        projectId: null,
        projectName: null,
        isDeleting: false,
    })
    const [isDetailOpen, setIsDetailOpen] = useState(false)
    const [detailProject, setDetailProject] = useState(null)
    const [detailAssets, setDetailAssets] = useState([])
    const [detailError, setDetailError] = useState('')
    const [isDetailLoading, setIsDetailLoading] = useState(false)
    const [previewAsset, setPreviewAsset] = useState(null)

    useEffect(() => {
        let isMounted = true

        const loadProjects = async () => {
            setIsLoading(true)
            setError('')

            try {
                const response = await bannerAgentService.fetchProjects()
                const items = Array.isArray(response?.projects) ? response.projects : []

                if (!isMounted) return
                setProjects(items)
            } catch (loadError) {
                if (!isMounted) return
                const errorMessage = loadError instanceof Error
                    ? loadError.message
                    : 'Unable to load projects.'
                setError(errorMessage)
                setProjects([])
            } finally {
                if (isMounted) {
                    setIsLoading(false)
                }
            }
        }

        loadProjects()

        return () => {
            isMounted = false
        }
    }, [])

    useEffect(() => {
        if (!isCreateOpen) return

        const handleKeydown = (event) => {
            if (event.key === 'Escape') {
                handleCloseModal()
            }
        }

        document.addEventListener('keydown', handleKeydown)
        return () => {
            document.removeEventListener('keydown', handleKeydown)
        }
    }, [isCreateOpen, isSubmitting])

    useEffect(() => {
        if (!previewAsset) return

        const handleKeydown = (event) => {
            if (event.key === 'Escape') {
                setPreviewAsset(null)
            }
        }

        document.addEventListener('keydown', handleKeydown)
        return () => {
            document.removeEventListener('keydown', handleKeydown)
        }
    }, [previewAsset])

    const handleOpenModal = () => {
        setEditingProjectId(null)
        setProjectName('')
        setProjectDescription('')
        setIsCreateOpen(true)
        setSubmitError('')
    }

    const handleCloseModal = (force = false) => {
        if (isSubmitting && !force) return
        setIsCreateOpen(false)
        setEditingProjectId(null)
        setProjectName('')
        setProjectDescription('')
        setSubmitError('')
    }

    const handleEditProject = (project) => {
        if (!project?.projectId) return
        setEditingProjectId(project.projectId)
        setProjectName(project.rawName || project.name)
        setProjectDescription(project.description || '')
        setIsCreateOpen(true)
        setSubmitError('')
    }

    const handleDeleteProject = (project) => {
        if (!project?.projectId) return
        setDeleteModal({
            isOpen: true,
            projectId: project.projectId,
            projectName: project.name,
            isDeleting: false,
        })
    }

    const handleOpenProjectDetail = async (project) => {
        if (!project?.projectId) return
        setIsDetailOpen(true)
        setIsDetailLoading(true)
        setDetailError('')
        try {
            const response = await bannerAgentService.fetchProjectById(project.projectId)
            const assets = Array.isArray(response?.assets) ? response.assets : []
            setDetailProject({
                id: toSafeString(response?.id) || project.projectId,
                name: getOptionalField(response?.project_name, project.name),
                description: toSafeString(response?.description),
                assetCountLabel: getAssetCountLabel(response?.asset_count ?? assets.length),
            })
            setDetailAssets(assets)
        } catch (loadError) {
            const errorMessage = loadError instanceof Error
                ? loadError.message
                : 'Unable to load project assets.'
            setDetailError(errorMessage)
            setDetailProject(null)
            setDetailAssets([])
        } finally {
            setIsDetailLoading(false)
        }
    }

    const handleCloseDetail = () => {
        if (isDetailLoading) return
        setIsDetailOpen(false)
        setDetailProject(null)
        setDetailAssets([])
        setDetailError('')
        setPreviewAsset(null)
    }

    const handleOpenAssetPreview = (asset) => {
        const preview = getAssetPreview(asset)
        if (!preview) return
        setPreviewAsset({
            src: preview,
            type: getAssetType(asset),
            name: getOptionalField(asset?.asset_name, 'Project asset'),
            description: toSafeString(asset?.description),
            createdLabel: formatCreatedLabel(asset?.created_at),
            dimensions: getOptionalField(asset?.metadata?.dimensions, 'Dimensions unknown'),
            downloadName: buildAssetDownloadName(asset),
        })
    }

    const handleCreateProject = async (event) => {
        event.preventDefault()
        if (isSubmitting) return

        const trimmedName = toSafeString(projectName)
        if (!trimmedName) {
            setSubmitError('Project name is required.')
            return
        }

        setIsSubmitting(true)
        setSubmitError('')

        const trimmedDescription = toSafeString(projectDescription)
        try {
            if (editingProjectId) {
                await bannerAgentService.updateProject(editingProjectId, {
                    project_name: trimmedName,
                    description: projectDescription.trim(),
                })
            } else {
                const payload = {
                    project_name: trimmedName,
                    ...(trimmedDescription ? { description: trimmedDescription } : {}),
                    ...(bannerAgentConfig.agentId ? { agent_id: bannerAgentConfig.agentId } : {}),
                    agent_name: 'Banner-Agent-V2',
                }
                await bannerAgentService.createProject(payload)
            }
            const response = await bannerAgentService.fetchProjects()
            const items = Array.isArray(response?.projects) ? response.projects : []
            setProjects(items)
            handleCloseModal(true)
        } catch (createError) {
            const message = createError instanceof Error
                ? createError.message
                : editingProjectId
                    ? 'Unable to update project.'
                    : 'Unable to create project.'
            setSubmitError(message)
        } finally {
            setIsSubmitting(false)
        }
    }

    const projectCards = useMemo(() => {
        return projects
            .slice()
            .sort((a, b) => {
                const aTime = getSortTimestamp(a)
                const bTime = getSortTimestamp(b)
                return bTime - aTime
            })
            .map((project, index) => ({
                projectId: toSafeString(project?.id),
                id: getOptionalField(project?.id, `project-${index}`),
                rawName: toSafeString(project?.project_name),
                name: getOptionalField(project?.project_name, 'Untitled project'),
                description: toSafeString(project?.description),
                lastEditedLabel: formatLastEdited(project?.updated_at, project?.created_at),
                agentName: getOptionalField(project?.agent_name, 'Unknown agent'),
                assetCountLabel: getAssetCountLabel(project?.asset_count),
                canMutate: Boolean(toSafeString(project?.id)),
            }))
    }, [projects])

    const modalTitle = editingProjectId ? 'Edit Project' : 'Create Project'
    const modalSubtitle = editingProjectId
        ? 'Update the project details and keep your assets organized.'
        : 'Start a new banner project and add assets later.'
    const modalSubmitLabel = editingProjectId ? 'Save Changes' : 'Create Project'

    return (
        <section className="projects-page">
            <Sidebar activeItem="Projects" />

            <main className="projects-page__main">
                <section className="projects-page__panel projects-page__panel--library">
                    <header className="projects-page__header">
                        <div>
                            <div className="projects-page__title-wrap">
                                <img
                                    src={savedAssetsIcon}
                                    alt=""
                                    aria-hidden="true"
                                    className="projects-page__title-icon"
                                />
                                <h1>Your Projects</h1>
                            </div>
                            <p>Track saved banner campaigns and creative collections.</p>
                        </div>
                        <div className="projects-page__actions">
                            <button
                                type="button"
                                className="projects-page__add-btn"
                                aria-label="Create new project"
                                onClick={handleOpenModal}
                            >
                                <span className="projects-page__add-icon" aria-hidden="true">+</span>
                                <span>Create Project</span>
                            </button>
                        </div>
                    </header>

                    {error ? (
                        <div className="projects-page__state projects-page__state--error" role="alert">
                            {error}
                        </div>
                    ) : null}

                    {isLoading ? (
                        <div className="projects-page__state">Loading projects...</div>
                    ) : null}

                    {!isLoading && !error && projectCards.length === 0 ? (
                        <div className="projects-page__state">No projects found yet.</div>
                    ) : null}

                    {!isLoading && projectCards.length > 0 ? (
                        <div className="projects-page__grid" aria-live="polite">
                            {projectCards.map((project) => (
                                <article
                                    key={project.id}
                                    className="projects-page__card"
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => handleOpenProjectDetail(project)}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter' || event.key === ' ') {
                                            event.preventDefault()
                                            handleOpenProjectDetail(project)
                                        }
                                    }}
                                >
                                    <div className="projects-page__thumb">
                                        <span className="projects-page__badge">{project.assetCountLabel}</span>
                                        <div className="projects-page__thumb-icon">
                                            <img src={projectsIcon} alt="" aria-hidden="true" />
                                        </div>
                                    </div>
                                    <div className="projects-page__card-body">
                                        <div className="projects-page__card-header">
                                            <h2 className="projects-page__card-title">{project.name}</h2>
                                            <div className="projects-page__card-actions">
                                                <button
                                                    type="button"
                                                    className="projects-page__card-action"
                                                    onClick={(event) => {
                                                        event.stopPropagation()
                                                        handleEditProject(project)
                                                    }}
                                                    disabled={!project.canMutate}
                                                    aria-label={`Edit ${project.name}`}
                                                >
                                                    <img src={editIcon} alt="" aria-hidden="true" />
                                                </button>
                                                <button
                                                    type="button"
                                                    className="projects-page__card-action projects-page__card-action--danger"
                                                    onClick={(event) => {
                                                        event.stopPropagation()
                                                        handleDeleteProject(project)
                                                    }}
                                                    disabled={!project.canMutate}
                                                    aria-label={`Delete ${project.name}`}
                                                >
                                                    <img src={deleteIcon} alt="" aria-hidden="true" />
                                                </button>
                                            </div>
                                        </div>
                                        <p className="projects-page__card-subtitle">{project.lastEditedLabel}</p>
                                        <div className="projects-page__card-meta">
                                            <span>{project.agentName}</span>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    ) : null}
                </section>
            </main>

            {isCreateOpen ? (
                <div
                    className="projects-page__modal-overlay"
                    onClick={(event) => {
                        if (isSubmitting) return
                        if (event.target === event.currentTarget) {
                            handleCloseModal()
                        }
                    }}
                >
                    <div className="projects-page__modal" role="dialog" aria-modal="true" aria-labelledby="create-project-title">
                        <div className="projects-page__modal-header">
                            <div>
                                <h2 id="create-project-title" className="projects-page__modal-title">{modalTitle}</h2>
                                <p className="projects-page__modal-subtitle">{modalSubtitle}</p>
                            </div>
                            <button
                                type="button"
                                className="projects-page__modal-close"
                                onClick={handleCloseModal}
                                aria-label="Close create project"
                                disabled={isSubmitting}
                            >
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="M6 6l12 12M18 6l-12 12" />
                                </svg>
                            </button>
                        </div>

                        <form className="projects-page__form" onSubmit={handleCreateProject}>
                            <div className="projects-page__form-field">
                                <label htmlFor="project-name">Project name</label>
                                <input
                                    id="project-name"
                                    type="text"
                                    value={projectName}
                                    onChange={(event) => {
                                        setProjectName(event.target.value)
                                        if (submitError) setSubmitError('')
                                    }}
                                    placeholder="e.g. Summer Campaign"
                                    autoFocus
                                />
                            </div>
                            <div className="projects-page__form-field">
                                <label htmlFor="project-description">Description (optional)</label>
                                <textarea
                                    id="project-description"
                                    value={projectDescription}
                                    onChange={(event) => {
                                        setProjectDescription(event.target.value)
                                        if (submitError) setSubmitError('')
                                    }}
                                    placeholder="Short brief or notes"
                                    rows={3}
                                />
                            </div>

                            {submitError ? (
                                <div className="projects-page__modal-error" role="alert">
                                    {submitError}
                                </div>
                            ) : null}

                            <div className="projects-page__modal-actions">
                                <button type="button" className="projects-page__modal-cancel" onClick={handleCloseModal} disabled={isSubmitting}>
                                    Cancel
                                </button>
                                <button type="submit" className="projects-page__modal-submit" disabled={isSubmitting}>
                                    {isSubmitting ? 'Saving...' : modalSubmitLabel}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : null}

            {deleteModal.isOpen ? (
                <DeleteModal
                    onClose={() => setDeleteModal({
                        isOpen: false,
                        projectId: null,
                        projectName: null,
                        isDeleting: false,
                    })}
                    onConfirm={async () => {
                        if (!deleteModal.projectId || deleteModal.isDeleting) return
                        setDeleteModal((prev) => ({ ...prev, isDeleting: true }))
                        try {
                            await bannerAgentService.deleteProject(deleteModal.projectId)
                            const response = await bannerAgentService.fetchProjects()
                            const items = Array.isArray(response?.projects) ? response.projects : []
                            setProjects(items)
                            setDeleteModal({
                                isOpen: false,
                                projectId: null,
                                projectName: null,
                                isDeleting: false,
                            })
                        } catch (deleteError) {
                            const message = deleteError instanceof Error
                                ? deleteError.message
                                : 'Unable to delete project.'
                            setError(message)
                            setDeleteModal((prev) => ({ ...prev, isDeleting: false }))
                        }
                    }}
                    title="Delete Project?"
                    itemName={deleteModal.projectName || undefined}
                    itemType="project"
                    isDeleting={deleteModal.isDeleting}
                />
            ) : null}

            {isDetailOpen ? (
                <div
                    className="projects-page__detail-overlay"
                    onClick={(event) => {
                        if (event.target === event.currentTarget) {
                            handleCloseDetail()
                        }
                    }}
                >
                    <div className="projects-page__detail" role="dialog" aria-modal="true" aria-labelledby="project-detail-title">
                        <header className="projects-page__detail-header">
                            <div>
                                <h2 id="project-detail-title">{detailProject?.name || 'Project details'}</h2>
                                <p>{detailProject?.description || 'Project assets and creative history.'}</p>
                            </div>
                            <button type="button" onClick={handleCloseDetail} aria-label="Close project details">
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="M6 6l12 12M18 6l-12 12" />
                                </svg>
                            </button>
                        </header>

                        <div className="projects-page__detail-body">
                            {isDetailLoading ? (
                                <div className="projects-page__detail-state">Loading project assets...</div>
                            ) : null}
                            {!isDetailLoading && detailError ? (
                                <div className="projects-page__detail-state projects-page__detail-state--error" role="alert">
                                    {detailError}
                                </div>
                            ) : null}
                            {!isDetailLoading && !detailError && detailAssets.length === 0 ? (
                                <div className="projects-page__detail-state">No assets saved in this project yet.</div>
                            ) : null}

                            {!isDetailLoading && !detailError && detailAssets.length > 0 ? (
                                <div className="projects-page__detail-grid">
                                    {detailAssets.map((asset, index) => {
                                        const preview = getAssetPreview(asset)
                                        const assetType = getAssetType(asset)
                                        return (
                                            <article key={toSafeString(asset?.id) || `asset-${index}`} className="projects-page__detail-card">
                                                <div className="projects-page__detail-thumb">
                                                    {preview ? (
                                                        <button
                                                            type="button"
                                                            className="projects-page__detail-thumb-button"
                                                            onClick={(event) => {
                                                                event.stopPropagation()
                                                                handleOpenAssetPreview(asset)
                                                            }}
                                                            aria-label={`View ${getOptionalField(asset?.asset_name, 'asset')} in full size`}
                                                        >
                                                            {assetType === 'video' ? (
                                                                <video src={preview} muted playsInline preload="metadata" />
                                                            ) : (
                                                                <img src={preview} alt={toSafeString(asset?.asset_name) || 'Project asset'} />
                                                            )}
                                                        </button>
                                                    ) : (
                                                        <div className="projects-page__detail-thumb-placeholder">No preview</div>
                                                    )}
                                                </div>
                                                <div className="projects-page__detail-content">
                                                    <h3>{getOptionalField(asset?.asset_name, 'Untitled asset')}</h3>
                                                    <p>{getOptionalField(asset?.description, 'No description')}</p>
                                                    <div className="projects-page__detail-meta">
                                                        <span>{formatCreatedLabel(asset?.created_at)}</span>
                                                        <span>{getOptionalField(asset?.metadata?.dimensions, 'Dimensions unknown')}</span>
                                                    </div>
                                                </div>
                                            </article>
                                        )
                                    })}
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            ) : null}

            {previewAsset ? (
                <div
                    className="projects-page__preview-overlay"
                    onClick={(event) => {
                        if (event.target === event.currentTarget) {
                            setPreviewAsset(null)
                        }
                    }}
                >
                    <div className="projects-page__preview" role="dialog" aria-modal="true" aria-labelledby="asset-preview-title">
                        <header className="projects-page__preview-header">
                            <div>
                                <h3 id="asset-preview-title">{previewAsset.name}</h3>
                                <p>{previewAsset.description || 'Full-size asset preview.'}</p>
                            </div>
                            <button type="button" onClick={() => setPreviewAsset(null)} aria-label="Close preview">
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="M6 6l12 12M18 6l-12 12" />
                                </svg>
                            </button>
                        </header>
                        <div className="projects-page__preview-body">
                            <div className="projects-page__preview-image">
                                {previewAsset.type === 'video' ? (
                                    <video src={previewAsset.src} controls playsInline />
                                ) : (
                                    <img src={previewAsset.src} alt={previewAsset.name} />
                                )}
                            </div>
                            <div className="projects-page__preview-meta">
                                <span>{previewAsset.createdLabel}</span>
                                <span>{previewAsset.dimensions}</span>
                            </div>
                            <div className="projects-page__preview-actions">
                                <a
                                    href={previewAsset.src}
                                    download={previewAsset.downloadName}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="projects-page__preview-download"
                                >
                                    Download asset
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
        </section>
    )
}

export default ProjectsPage
