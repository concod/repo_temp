--liquibase formatted sql
--changeset raja.duraisamy@impactanalytics.co:oms_sp_config_filters_1 stripComments:false splitStatements:false context:dynamic_sp_config labels:dynamic_sp_implementation
--comment: Filter and join configurations for dynamic stored procedures
CREATE TABLE IF NOT EXISTS oms.oms_sp_config_filters (
    filter_id serial4 NOT NULL,
    config_id int4 NOT NULL,
    filter_type varchar(50) NOT NULL,
    filter_key varchar(255) NULL,
    filter_value text NOT NULL,
    filter_order int4 NULL,
    description text NULL,
    is_active bool NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NULL,
    created_by int4 NULL,
    updated_by int4 NULL,
    CONSTRAINT oms_sp_config_filters_pkey PRIMARY KEY (filter_id),
    CONSTRAINT fk_oms_sp_config_filters_master FOREIGN KEY (config_id) REFERENCES oms.oms_sp_config_master(config_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_oms_sp_config_filters_config_id ON oms.oms_sp_config_filters(config_id);
CREATE INDEX IF NOT EXISTS idx_oms_sp_config_filters_type ON oms.oms_sp_config_filters(config_id, filter_type, is_active);