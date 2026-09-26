--liquibase formatted sql
--changeset harshita.kona@impactanalytics.co:table_views stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for table_views table

CREATE TABLE IF NOT EXISTS price_promo.table_views (
    table_view_id SERIAL PRIMARY KEY,
	table_view_name VARCHAR(100) NOT NULL,
	screen_name VARCHAR(100) NOT NULL,
	user_id INTEGER NOT NULL,
	scope price_promo.table_views_scope NOT NULL,
	table_view_config JSONB NULL,
	created_by INTEGER NOT NULL,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	updated_by INTEGER NOT NULL,
	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_personal_table_view_name 
    ON price_promo.table_views(table_view_name, user_id, scope) 
    WHERE scope = 'personal' AND is_deleted = FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_global_table_view_name 
    ON price_promo.table_views(table_view_name, scope) 
    WHERE scope = 'global' AND is_deleted = FALSE;

--changeset pranshu.pandey@impactanalytics.co:table_views_0212 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: updated table_views index to use screen_name, table_view_name, scope
DROP INDEX IF EXISTS price_promo.idx_unique_global_table_view_name;
DROP INDEX IF EXISTS price_promo.idx_unique_personal_table_view_name;

CREATE UNIQUE INDEX idx_unique_global_table_view_name 
ON price_promo.table_views USING btree (screen_name, table_view_name, scope)
WHERE (
    scope = 'global'::price_promo.table_views_scope
    AND is_deleted = false
);

CREATE UNIQUE INDEX idx_unique_personal_table_view_name 
ON price_promo.table_views USING btree (screen_name, table_view_name, user_id, scope)
WHERE (
    scope = 'personal'::price_promo.table_views_scope
    AND is_deleted = false
);