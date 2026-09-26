import React from 'react'
import './AssetInput.scss'

function AssetInput() {
    return (
        <form className="asset-input" onSubmit={(event) => event.preventDefault()}>
            <label htmlFor="asset-prompt" className="asset-input__sr-only">
                Ask anything to our Artist
            </label>

            <textarea
                id="asset-prompt"
                className="asset-input__textarea"
                placeholder="Ask anything to our Artist"
                rows={3}
            />

            <button type="submit" className="asset-input__send" aria-label="Send prompt">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8 5l8 7-8 7" />
                </svg>
            </button>
        </form>
    )
}

export default AssetInput