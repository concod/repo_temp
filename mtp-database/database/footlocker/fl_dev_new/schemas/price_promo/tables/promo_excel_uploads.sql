--liquibase formatted sql
--changeset narendren.saravanan@impactanalytics.co:create_promo_excel_uploads_table_20 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Create promo_excel_uploads table

CREATE TABLE IF NOT EXISTS price_promo.promo_excel_uploads (
    user_id INTEGER NOT NULL,
    session_id VARCHAR(255) NOT NULL,
    session_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    PRIMARY KEY (user_id, session_id)
);
