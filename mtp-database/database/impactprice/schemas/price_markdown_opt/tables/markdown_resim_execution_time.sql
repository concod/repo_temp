--liquibase formatted sql
--changeset liquibase:markdown_resim_execution_time stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for markdown_resim_execution_time

CREATE TABLE price_markdown_opt.markdown_resim_execution_time (
	id serial4 NOT NULL,
	user_id int4 NULL,
	strategy_id int4 NOT NULL,
	strategy_name varchar NOT NULL,
	resimulate_flag int4 NULL DEFAULT 0,
	resimulate_start_time timestamptz NULL,
	resimulate_end_time timestamptz NULL,
	insert_discount_time int4 NULL,
	ssd_temp_time int4 NULL,
	agg_temp_time int4 NULL,
	insertion_time int4 NULL,
	drop_table_time int4 NULL,
	total_time int4 NULL,
	status bool NULL DEFAULT false,
	message varchar NULL DEFAULT 'Not Finished'::character varying,
	payload_input json NULL,
	payload_output json NULL,
	action_id int4 NULL,
	end_flag int4 NULL
);