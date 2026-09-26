--liquibase formatted sql
--changeset liquibase:tb_clearance_trigger_timeframe_config_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_clearance_trigger_timeframe_config

CREATE TABLE price_markdown.tb_clearance_trigger_timeframe_config (
	timeframe_id int4 GENERATED ALWAYS AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1 NO CYCLE) NOT NULL,
	timeframe_name text NOT NULL,
	timeframe_display_name text NOT NULL,
	timeframe_value int4 NOT NULL,
	timeframe_type text NOT NULL,
	CONSTRAINT tb_clearance_trigger_timeframe_config_pkey PRIMARY KEY (timeframe_id)
);

--changeset liquibase:tb_clearance_trigger_timeframe_config_2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: updated DDL for col timeframe_id

ALTER TABLE price_markdown.tb_clearance_trigger_timeframe_config ALTER COLUMN timeframe_id DROP IDENTITY IF EXISTS;
ALTER TABLE price_markdown.tb_clearance_trigger_timeframe_config ALTER COLUMN timeframe_id TYPE int4;