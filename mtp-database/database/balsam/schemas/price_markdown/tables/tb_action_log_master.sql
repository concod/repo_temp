--liquibase formatted sql
--changeset liquibase:tb_action_log_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_action_log_master
CREATE TABLE price_markdown.tb_action_log_master (
	id serial4 NOT NULL,
	api_name varchar NULL,
	screen_name varchar NULL,
	created_at timestamp NULL,
	updated_at timestamp NULL,
	user_id int8 NULL,
	status int8 NULL,
	CONSTRAINT ps_action_log_master_pk PRIMARY KEY (id)
);