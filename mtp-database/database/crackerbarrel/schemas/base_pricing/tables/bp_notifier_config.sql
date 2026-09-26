--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_notifier_config stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_notifier_config


CREATE TABLE IF NOT EXISTS
    base_pricing.bp_notifier_config (
        id SERIAL PRIMARY KEY,
        process_key VARCHAR(100) NOT NULL,
        channel_key VARCHAR(50) NOT NULL,
        setting_key VARCHAR(50) NOT NULL,
        setting_value TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (process_key, channel_key, setting_key)
    );
    
    
--changeset abhishek.singh@impactanalytics.co:bp_notifier_config_1 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_notifier_config_1

DROP TABLE IF EXISTS base_pricing.bp_notifier_config;

CREATE TABLE IF NOT EXISTS base_pricing.bp_notifier_config (
    id SERIAL PRIMARY KEY,
    category VARCHAR(100) NOT NULL DEFAULT 'global',
    process_key VARCHAR(100) NOT NULL,
    channel_key VARCHAR(50) NOT NULL,
    setting_key VARCHAR(100) NOT NULL,
    setting_value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (process_key, channel_key, setting_key)
);