--liquibase formatted sql
--changeset narendren.saravanan@impactanalytics.co:create_custom_filters_table stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for custom_filters table with scope management and unique constraints

CREATE TABLE IF NOT EXISTS price_promo.custom_filters (
    filter_id SERIAL PRIMARY KEY,
    filter_name VARCHAR(100) NOT NULL,
    description TEXT,
    scope price_promo.custom_filters_scope NOT NULL,
    screen_name VARCHAR(100),
    is_multi_screen BOOLEAN DEFAULT FALSE,
    filter_config JSONB NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
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

-- Create unique index to enforce one default filter per screen
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_default_filter_per_screen 
    ON price_promo.custom_filters(screen_name, created_by) 
    WHERE is_default = TRUE AND is_deleted = FALSE;

--changeset narendren.saravanan@impactanalytics.co:remove_is_default_column stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: remove is_default column and its unique index as default filters are now managed in custom_filters_defaults table

-- Drop the unique index for default filters per screen
DROP INDEX IF EXISTS price_promo.idx_unique_default_filter_per_screen;

-- Remove the is_default column
ALTER TABLE price_promo.custom_filters DROP COLUMN IF EXISTS is_default; 

