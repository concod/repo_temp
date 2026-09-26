--liquibase formatted sql
--changeset utkarsh.tiwari@impactanalytics.co:tb_clearance_trigger_timeframe_config stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_clearance_trigger_timeframe_config

CREATE TABLE price_markdown.tb_clearance_trigger_timeframe_config (
	timeframe_id int4 GENERATED ALWAYS AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1 NO CYCLE) NOT NULL,
	timeframe_name text NOT NULL,
	timeframe_display_name text NOT NULL,
	CONSTRAINT tb_clearance_trigger_timeframe_config_pkey PRIMARY KEY (timeframe_id)
);

--changeset utkarsh.tiwari@impactanalytics.co:tb_clearance_trigger_timeframe_config_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: update changeset for tb_clearance_trigger_timeframe_config

ALTER TABLE price_markdown.tb_clearance_trigger_timeframe_config
ADD COLUMN timeframe_value int4 NOT NULL;

ALTER TABLE price_markdown.tb_clearance_trigger_timeframe_config
ADD COLUMN timeframe_type text NOT NULL;
