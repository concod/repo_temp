--liquibase formatted sql
--changeset ayush.keshari@impactanalytics.co:create_custom_filters_table stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for custom_filters table with scope management and unique constraints


CREATE TABLE IF NOT EXISTS price_promo.custom_filters (
    filter_id SERIAL PRIMARY KEY,
    filter_name VARCHAR(100) NOT NULL,
    description TEXT,
    scope price_promo.custom_filters_scope NOT NULL,
    screen_name VARCHAR(100),
    is_multi_screen BOOLEAN DEFAULT FALSE,
    filter_config JSONB NOT NULL,
    created_by INTEGER NOT NULL,
    updated_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Create unique indexes to enforce unique names for personal and global filters
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_personal_filter_name 
    ON price_promo.custom_filters(filter_name, created_by, scope) 
    WHERE scope = 'personal' AND is_deleted = FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_global_filter_name 
    ON price_promo.custom_filters(filter_name, scope) 
    WHERE scope = 'global' AND is_deleted = FALSE;

