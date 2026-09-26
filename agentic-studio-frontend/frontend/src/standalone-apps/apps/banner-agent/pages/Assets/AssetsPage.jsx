import React, { useEffect, useMemo, useState } from 'react'
import Sidebar from '../../components/Sidebar/Sidebar'
import { bannerAgentService } from '../../services/bannerAgentService'
import savedAssetsIcon from '../../assets/saved-assets.png'
import './AssetsPage.scss'

const toSafeString = (value) => (typeof value === 'string' ? value.trim() : '')

const formatCreatedAt = (value) => {
    const raw = toSafeString(value)
    if (!raw) return 'Unknown date'

    const parsed = new Date(raw)
    if (Number.isNaN(parsed.getTime())) return 'Unknown date'

    return parsed.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    })
}

const getOptionalField = (value, fallback = 'N/A') => {
    const normalized = toSafeString(value)
    return normalized || fallback
}

function AssetsPage() {
    const [savedAssets, setSavedAssets] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        let isMounted = true

        const loadSavedAssets = async () => {
            setIsLoading(true)
            setError('')

            try {
                const response = await bannerAgentService.fetchSavedAssets()
                const assets = Array.isArray(response?.assets) ? response.assets : []

                if (!isMounted) return
                setSavedAssets(assets)
            } catch (loadError) {
                if (!isMounted) return
                const errorMessage = loadError instanceof Error
                    ? loadError.message
                    : 'Unable to load saved assets.'
                setError(errorMessage)
                setSavedAssets([])
            } finally {
                if (isMounted) {
                    setIsLoading(false)
                }
            }
        }

        loadSavedAssets()

        return () => {
            isMounted = false
        }
    }, [])

    const assetCards = useMemo(() => {
        return savedAssets
            .slice()
            .sort((a, b) => {
                const aTime = new Date(a?.created_at || 0).getTime()
                const bTime = new Date(b?.created_at || 0).getTime()
                return bTime - aTime
            })
            .filter((asset) => toSafeString(asset?.image_url))
            .map((asset, index) => {
                const imageUrl = toSafeString(asset?.image_url)
                return {
                    id: `${toSafeString(asset?.session_id) || 'asset'}-${index}`,
                    imageUrl,
                    prompt: getOptionalField(asset?.user_input, 'No prompt available'),
                    createdAtLabel: formatCreatedAt(asset?.created_at),
                    confidence: getOptionalField(asset?.confidence),
                    dimensions: getOptionalField(asset?.dimensions),
                    method: getOptionalField(asset?.method),
                    agentName: getOptionalField(asset?.agent_name, 'Unknown agent'),
                    sessionId: getOptionalField(asset?.session_id, 'N/A'),
                }
            })
    }, [savedAssets])

    return (
        <section className="assets-page">
            <Sidebar activeItem="Assets" />

            <main className="assets-page__main">
                <section className="assets-page__panel assets-page__panel--library">
                    <header className="assets-page__header assets-page__header--library">
                        <div>
                            <div className="assets-page__title-wrap">
                                <img src={savedAssetsIcon} alt="" aria-hidden="true" className="assets-page__title-icon" />
                                <h1>Saved Assets</h1>
                            </div>
                            <p>Recent generated images for your banner sessions</p>
                        </div>
                        <button
                            type="button"
                            className="assets-page__refresh"
                            onClick={async () => {
                                setIsLoading(true)
                                setError('')
                                try {
                                    const response = await bannerAgentService.fetchSavedAssets()
                                    setSavedAssets(Array.isArray(response?.assets) ? response.assets : [])
                                } catch (loadError) {
                                    const errorMessage = loadError instanceof Error
                                        ? loadError.message
                                        : 'Unable to refresh saved assets.'
                                    setError(errorMessage)
                                } finally {
                                    setIsLoading(false)
                                }
                            }}
                            disabled={isLoading}
                        >
                            {isLoading ? 'Refreshing...' : 'Refresh'}
                        </button>
                    </header>

                    {error ? (
                        <div className="assets-page__state assets-page__state--error" role="alert">
                            {error}
                        </div>
                    ) : null}

                    {isLoading ? (
                        <div className="assets-page__state">Loading saved assets...</div>
                    ) : null}

                    {!isLoading && !error && assetCards.length === 0 ? (
                        <div className="assets-page__state">No saved assets found yet.</div>
                    ) : null}

                    {!isLoading && assetCards.length > 0 ? (
                        <div className="assets-page__grid" aria-live="polite">
                            {assetCards.map((asset) => (
                                <article key={asset.id} className="assets-page__card">
                                    <a href={asset.imageUrl} target="_blank" rel="noopener noreferrer" className="assets-page__thumb-link">
                                        <img src={asset.imageUrl} alt={asset.prompt} loading="lazy" className="assets-page__thumb" />
                                    </a>

                                    <div className="assets-page__card-body">
                                        <p className="assets-page__prompt" title={asset.prompt}>{asset.prompt}</p>

                                        <dl className="assets-page__meta-list">
                                            <div>
                                                <dt>Created</dt>
                                                <dd>{asset.createdAtLabel}</dd>
                                            </div>
                                            <div>
                                                <dt>Confidence</dt>
                                                <dd>{asset.confidence}</dd>
                                            </div>
                                            <div>
                                                <dt>Dimensions</dt>
                                                <dd>{asset.dimensions}</dd>
                                            </div>
                                            <div>
                                                <dt>Method</dt>
                                                <dd>{asset.method}</dd>
                                            </div>
                                            <div>
                                                <dt>Agent</dt>
                                                <dd>{asset.agentName}</dd>
                                            </div>
                                            <div>
                                                <dt>Session</dt>
                                                <dd className="assets-page__session" title={asset.sessionId}>{asset.sessionId}</dd>
                                            </div>
                                        </dl>
                                    </div>
                                </article>
                            ))}
                        </div>
                    ) : null}
                </section>
            </main>
        </section>
    )
}

export default AssetsPage