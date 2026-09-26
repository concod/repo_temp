--liquibase formatted sql
--changeset piyush.raj@impactanalytics.co:oms_sp_config_insert_columns_1 stripComments:false splitStatements:false context:dynamic_sp_config labels:dynamic_sp_implementation
--comment: Insert column definitions for INSERT-type dynamic stored procedures
CREATE TABLE IF NOT EXISTS oms.oms_sp_config_insert_columns (
    insert_column_id serial4 NOT NULL,
    config_id int4 NOT NULL,
    insert_column_name varchar(255) NOT NULL,
    select_expression text NOT NULL,
    column_order int4 NOT NULL,
    is_active bool NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NULL,
    created_by int4 NULL,
    updated_by int4 NULL,
    CONSTRAINT oms_sp_config_insert_columns_pkey PRIMARY KEY (insert_column_id),
    CONSTRAINT fk_oms_sp_config_insert_columns_master FOREIGN KEY (config_id) REFERENCES oms.oms_sp_config_master(config_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_oms_sp_config_insert_columns_config_id ON oms.oms_sp_config_insert_columns(config_id);
CREATE INDEX IF NOT EXISTS idx_oms_sp_config_insert_columns_active ON oms.oms_sp_config_insert_columns(config_id, is_active, column_order);
