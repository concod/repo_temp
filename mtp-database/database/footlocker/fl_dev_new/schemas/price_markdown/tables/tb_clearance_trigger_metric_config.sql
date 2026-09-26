--liquibase formatted sql
--changeset liquibase:tb_clearance_trigger_metric_config_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_clearance_trigger_metric_config

CREATE TABLE price_markdown.tb_clearance_trigger_metric_config (
	metric_id int4 GENERATED ALWAYS AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1 NO CYCLE) NOT NULL,
	metric_name text NOT NULL,
	metric_display_name text NOT NULL,
	CONSTRAINT tb_clearance_trigger_metric_config_pkey PRIMARY KEY (metric_id)
);

--changeset liquibase:tb_clearance_trigger_metric_config_2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: updated DDL for col metric_id

ALTER TABLE price_markdown.tb_clearance_trigger_metric_config ALTER COLUMN metric_id DROP IDENTITY IF EXISTS;
ALTER TABLE price_markdown.tb_clearance_trigger_metric_config ALTER COLUMN metric_id TYPE int4;