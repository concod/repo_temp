--liquibase formatted sql
--changeset pranshu.pandey@impactanalytics.co:tb_maintenance_restricted_apis stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Initial changeset for price_promo.tb_maintenance_restricted_apis

CREATE TABLE IF NOT EXISTS price_promo.tb_maintenance_restricted_apis (
    api_endpoint TEXT PRIMARY KEY,
    is_restricted BOOLEAN NOT NULL DEFAULT TRUE
);