--liquibase formatted sql
--changeset manoj.solanki@impactanalytics.co:rule_master stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: is_deleted default value fix

CREATE TABLE IF NOT EXISTS data_platform.rule_master
(
    agg character varying COLLATE pg_catalog."default",
    value character varying COLLATE pg_catalog."default",
    kpis character varying COLLATE pg_catalog."default",
    "table" character varying COLLATE pg_catalog."default",
    outer_filter character varying COLLATE pg_catalog."default",
    action character varying COLLATE pg_catalog."default",
    name character varying COLLATE pg_catalog."default",
    group_by character varying COLLATE pg_catalog."default",
    inner_filter character varying COLLATE pg_catalog."default",
    module character varying COLLATE pg_catalog."default",
    threshold character varying COLLATE pg_catalog."default",
    rule character varying COLLATE pg_catalog."default",
    is_deleted boolean NOT NULL DEFAULT false,
    created_by integer,
    created_at timestamp with time zone NOT NULL,
    updated_by integer,
    updated_at timestamp with time zone,
    deleted_by integer,
    deleted_at timestamp with time zone,
    rule_display_name character varying COLLATE pg_catalog."default",
    rule_description character varying COLLATE pg_catalog."default"
);

--changeset arun.thamma@impactanalytics.co:rule_master stripComments:false splitStatements:false context:change_log labels:renamed_kpis_kpi_info
--comment: change set to rename kpis to kpi_info and create kpis

alter table data_platform.rule_master
RENAME COLUMN kpis TO kpis_info;

alter table data_platform.rule_master
add COLUMN kpis character varying;

--changeset manoj.solanki@impactanalytics.co:rule_master_fix stripComments:false splitStatements:false context:Release_1_2 labels:rule_master
--comment: type casted agg column
ALTER TABLE data_platform.rule_master ALTER COLUMN agg TYPE bool USING agg::bool;



--changeset mohammad.abdulla@impactanalytics.co:rule_master_add_column stripComments:false splitStatements:false context:Release_1_3 labels:rule_master
--comment: add column db_type, product
ALTER TABLE data_platform.rule_master ADD COLUMN db_type character varying DEFAULT 'postgresql';
ALTER TABLE data_platform.rule_master ADD COLUMN product_name character varying DEFAULT 'common';