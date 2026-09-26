--liquibase formatted sql
--changeset liquibase:oms_ingestion_config_master stripComments:false splitStatements:false context:Release_1_0 labels:ingestion_oms
--comment: initial changeset for ingestion_config_master

-- Unified configuration table for CTEs, configs, feature flags, and constraints
CREATE TABLE IF NOT EXISTS oms.ingestion_config_master (
    -- Primary key - Auto-incrementing unique identifier
    id SERIAL PRIMARY KEY,
    
    -- Configuration type: 'cte', 'config', 'feature_flag', 'constraint'
    config_type VARCHAR(50) NOT NULL,
    
    -- Logical grouping: 'dc_forecast', 'error_stddev', 'vendor_moq', 'general', etc.
    category VARCHAR(100),
    
    -- Unique key name (e.g., 'PRODUCT_CODE_LIST_QUERY', 'timezone')
    config_key VARCHAR(200) NOT NULL,
    
    -- The actual configuration value (SQL, JSON, string, number, boolean as text)
    config_value JSONB,
    
    -- Data type indicator: 'string', 'integer', 'boolean', 'float', 'json', 'sql'
    data_type VARCHAR(50) DEFAULT 'string',
    
    -- Human-readable description of this configuration
    description TEXT,
    
    -- Version number for tracking changes over time
    version INTEGER DEFAULT 1,
    
    -- Flag indicating if this configuration is currently active
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Timestamp when configuration was created
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure uniqueness across type, category, key, and version
    CONSTRAINT unique_config UNIQUE(config_key, version)
);

--changeset charan.reddy@impactanalytics.co:drop_data_type_column_ingestion_config_master runOnChange:false stripComments:false splitStatements:false context:Release_1_1 labels:ingestion_oms
--comment: Drop the data_type column from ingestion_config_master table as it's redundant with JSONB config_value
--rollback: ALTER TABLE oms.ingestion_config_master ADD COLUMN data_type VARCHAR(50) DEFAULT 'string';

ALTER TABLE oms.ingestion_config_master DROP COLUMN IF EXISTS data_type;
