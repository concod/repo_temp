--liquibase formatted sql
--changeset harshita.kona@impactanalytics.co:custom_filters stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for custom_filters

CREATE TABLE IF NOT EXISTS price_markdown.custom_filters (
    filter_id SERIAL PRIMARY KEY,
    filter_name VARCHAR(100) NOT NULL,
    description TEXT,
    scope price_markdown.custom_filters_scope NOT NULL,
    screen_name VARCHAR(100),
    is_multi_screen BOOLEAN DEFAULT FALSE,
    filter_config JSONB NOT NULL,
    created_by INTEGER NOT NULL,
    updated_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_personal_filter_name 
    ON price_markdown.custom_filters(filter_name, created_by, scope) 
    WHERE scope = 'personal' AND is_deleted = FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_global_filter_name 
    ON price_markdown.custom_filters(filter_name, scope) 
    WHERE scope = 'global' AND is_deleted = FALSE;