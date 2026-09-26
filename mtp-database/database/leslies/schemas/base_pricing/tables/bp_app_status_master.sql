--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_app_status_master stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_app_status_master
DROP TABLE IF EXISTS base_pricing.bp_app_status_master;

CREATE TABLE IF NOT EXISTS
    base_pricing.bp_app_status_master (
        id SERIAL PRIMARY KEY,
        flag_name VARCHAR(100) UNIQUE NOT NULL,
        status BOOLEAN DEFAULT FALSE,
        display_message TEXT,
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_by VARCHAR(100)
    );