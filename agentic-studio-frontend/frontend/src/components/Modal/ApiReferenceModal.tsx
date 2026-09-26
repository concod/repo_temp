interface ApiReferenceModalProps {
  onClose: () => void;
  agentId: string;
  userInput: string;
}

const ApiReferenceModal = ({ onClose, agentId, userInput }: ApiReferenceModalProps) => {
    const endpointValue = `curl -X POST "${import.meta.env.VITE_API_BASE_URL}api/agent/infer" \\ 
-H "Content-Type: application/json" \\ 
-H "X-API-Key: your_api_key_here" \\ 
-d '{
  "agentId": "${agentId}",
  "userInput": "${userInput}"
}'`;

    const sampleRequestValue = `curl -X POST "${import.meta.env.VITE_API_BASE_URL}api/agent/infer" \\ 
-H "Content-Type: application/json" \\ 
-H "X-API-Key: your_api_key_here" \\ 
-d '{
  "agentId": "${agentId}",
  "userInput": "${userInput}"
}'`;

    return(
        <div className="api-reference-modal">
            <div className="api-reference-modal__header">
                <div className="api-reference-modal__header-title">
                    <span className="headline-5">Agent API reference</span>
                </div>
                <div className="api-reference-modal__header-buttons" onClick={onClose} style={{ cursor: 'pointer' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M10 1.00714L8.99286 0L5 3.99286L1.00714 0L0 1.00714L3.99286 5L0 8.99286L1.00714 10L5 6.00714L8.99286 10L10 8.99286L6.00714 5L10 1.00714Z" fill="#4B5767"/>
                    </svg>
                </div>
            </div>
            <div className="api-reference-modal__body">
                <div className="api-reference-modal__body-endpoint">
                    <div className="api-reference-modal__body-endpoint-header">
                        <div className="api-reference-modal__body-endpoint-header-line"></div>
                        <div className="api-reference-modal__body-endpoint-header-title">
                            <span className="headline-5">End point</span>
                        </div>
                    </div>
                    <div className="api-reference-modal__body-endpoint-body">
                        <textarea value={endpointValue} readOnly></textarea>
                    </div>
                </div>
                
                <div className="api-reference-modal__body-endpoint">
                    <div className="api-reference-modal__body-endpoint-header">
                        <div className="api-reference-modal__body-endpoint-header-line"></div>
                        <div className="api-reference-modal__body-endpoint-header-title">
                            <span className="headline-5">Sample request</span>
                            <div className="api-reference-modal__body-endpoint-header-title-copy">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                                <path d="M5 9.16675C5 6.81008 5 5.63091 5.7325 4.89925C6.46417 4.16675 7.64333 4.16675 10 4.16675H12.5C14.8567 4.16675 16.0358 4.16675 16.7675 4.89925C17.5 5.63091 17.5 6.81008 17.5 9.16675V13.3334C17.5 15.6901 17.5 16.8692 16.7675 17.6009C16.0358 18.3334 14.8567 18.3334 12.5 18.3334H10C7.64333 18.3334 6.46417 18.3334 5.7325 17.6009C5 16.8692 5 15.6901 5 13.3334V9.16675Z" stroke="#A93BFF" stroke-width="1.5"/>
                                <path d="M5 15.8334C4.33696 15.8334 3.70107 15.57 3.23223 15.1012C2.76339 14.6323 2.5 13.9965 2.5 13.3334V8.33342C2.5 5.19091 2.5 3.61925 3.47667 2.64341C4.45333 1.66758 6.02417 1.66675 9.16667 1.66675H12.5C13.163 1.66675 13.7989 1.93014 14.2678 2.39898C14.7366 2.86782 15 3.50371 15 4.16675" stroke="#A93BFF" stroke-width="1.5"/>
                            </svg>
                            </div>
                        </div>
                    </div>
                    <div className="api-reference-modal__body-endpoint-body">
                        <textarea value={sampleRequestValue} className="body-medium"readOnly></textarea>
                    </div>
                </div>

                <div className="api-reference-modal__body-parameters">
                    <div className="api-reference-modal__body-endpoint-header">
                        <div className="api-reference-modal__body-endpoint-header-line"></div>
                        <div className="api-reference-modal__body-endpoint-header-title">
                            <span className="headline-5">Request body parameters</span>
                        </div>
                    </div>
                    <div className="api-reference-modal__body-parameters-table">
                        <div className="api-reference-modal__body-parameters-table-header">
                            <div className="parameter-col body-medium--medium">Parameter</div>
                            <div className="type-col body-medium--medium">Type</div>
                            <div className="description-col body-medium--medium">Description</div>
                        </div>
                        <div className="api-reference-modal__body-parameters-table-row">
                            <div className="parameter-col body-medium">AgentId</div>
                            <div className="type-col body-medium">String</div>
                            <div className="description-col body-medium">The unique identifier of your agent</div>
                        </div>
                        <div className="api-reference-modal__body-parameters-table-row">
                            <div className="parameter-col body-medium">userInput</div>
                            <div className="type-col body-medium">String</div>
                            <div className="description-col body-medium">The message or query to send to the agent</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ApiReferenceModal;