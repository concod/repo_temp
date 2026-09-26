--liquibase formatted sql
--changeset manoj.solanki@impactanalytics.co:kpi_master stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: is_deleted default value fix

CREATE TABLE IF NOT EXISTS data_platform.kpi_master
(
    kpi_code character varying COLLATE pg_catalog."default",
    kpi character varying COLLATE pg_catalog."default",
    query text COLLATE pg_catalog."default",
    variable character varying COLLATE pg_catalog."default",
    "table" character varying COLLATE pg_catalog."default",
    is_deleted boolean NOT NULL DEFAULT false,
    created_by integer,
    created_at timestamp with time zone NOT NULL,
    updated_by integer,
    updated_at timestamp with time zone,
    deleted_by integer,
    deleted_at timestamp with time zone
);

--changeset arun.thamma@impactanalytics.co:kpi_master stripComments:false splitStatements:false context:change_log labels:renamed_kpi_code_column
--comment: change set to rename kpi_code to kpicode
ALTER TABLE data_platform.kpi_master
 RENAME COLUMN kpi_code TO kpicode;


--changeset mohammad.abdulla@impactanalytics.co:kpi_master_add_column stripComments:false splitStatements:false context:Release_1_3 labels:kpi_master
--comment: add column db_type, product
ALTER TABLE data_platform.kpi_master ADD COLUMN db_type character varying DEFAULT 'postregsql';
ALTER TABLE data_platform.kpi_master ADD COLUMN product_name character varying DEFAULT 'common';
