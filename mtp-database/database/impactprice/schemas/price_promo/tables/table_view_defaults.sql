--liquibase formatted sql
--changeset harshita.kona@impactanalytics.co:table_view_defaults stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for table_view_defaults table

CREATE TABLE IF NOT EXISTS price_promo.table_view_defaults (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    screen_name VARCHAR(100) NOT NULL,
    table_view_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (table_view_id) REFERENCES price_promo.table_views(table_view_id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_one_default_table_view_per_screen 
    ON price_promo.table_view_defaults(user_id, screen_name);