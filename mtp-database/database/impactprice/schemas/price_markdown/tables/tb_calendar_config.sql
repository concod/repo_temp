--liquibase formatted sql
--changeset liquibase:tb_calendar_config_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_calendar_config - added serial 4
CREATE TABLE price_markdown.tb_calendar_config (
	config_name varchar NOT NULL,
	calendar_config_id serial4 NOT NULL,
	pcd_type varchar NOT NULL,
	on_day varchar NOT NULL,
	total_days int4 NULL,
	calendar_type varchar NULL,
	repeat_every int4 NULL,
	repeat_frequency varchar NULL,
	repeat_on_week _text NULL,
	pcd_breakdown jsonb NULL,
	is_active int4 NOT NULL DEFAULT 1,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NULL,
	created_by int4 NULL,
	updated_by int4 NULL,
	CONSTRAINT tb_calendar_config_main_pk PRIMARY KEY (calendar_config_id),
	CONSTRAINT tb_calendar_config_un UNIQUE (config_name)
);


--changeset liquibase:tb_calendar_config_2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_calendar_config - Removed unique constraint on config_name

ALTER TABLE price_markdown.tb_calendar_config DROP CONSTRAINT tb_calendar_config_un;
