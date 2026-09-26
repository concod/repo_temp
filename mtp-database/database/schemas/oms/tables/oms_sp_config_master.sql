--liquibase formatted sql
--changeset raja.duraisamy@impactanalytics.co:oms_sp_config_master_1 stripComments:false splitStatements:false context:dynamic_sp_config labels:dynamic_sp_implementation
--comment: Master configuration table for dynamic stored procedures
CREATE TABLE IF NOT EXISTS oms.oms_sp_config_master (
    config_id serial4 NOT NULL,
    config_name varchar(255) NOT NULL,
    static_sp_name varchar(255) NOT NULL,
    dynamic_sp_name varchar(255) NOT NULL,
    description text NULL,
    client_code varchar(100) NOT NULL,
    use_dynamic_sp bool NOT NULL DEFAULT true,
    is_active bool NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NULL,
    created_by int4 NULL,
    updated_by int4 NULL,
    CONSTRAINT oms_sp_config_master_pkey PRIMARY KEY (config_id),
    CONSTRAINT uk_oms_sp_config_name_client UNIQUE (config_name, client_code)
);
CREATE INDEX IF NOT EXISTS idx_oms_sp_config_master_name_client ON oms.oms_sp_config_master(config_name, client_code) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_oms_sp_config_master_client ON oms.oms_sp_config_master(client_code, dynamic_sp_name) WHERE is_active = true AND use_dynamic_sp = true;

