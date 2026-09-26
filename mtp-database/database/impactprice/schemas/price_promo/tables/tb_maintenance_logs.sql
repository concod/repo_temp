--liquibase formatted sql
--changeset pranshu.pandey@impactanalytics.co:tb_maintenance_logs stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Initial changeset for price_promo.tb_maintenance_logs

CREATE TABLE IF NOT EXISTS price_promo.tb_maintenance_logs (
    id SERIAL PRIMARY KEY,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    eta_completion TIMESTAMPTZ NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ NULL
);