--liquibase formatted sql
--changeset liquibase:tb_action_log_payload stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_action_log_payload
CREATE TABLE price_markdown.tb_action_log_payload (
	id serial4 NOT NULL,
	action_log_id int4 NOT NULL,
	payload jsonb NULL,
	CONSTRAINT ps_action_log_payload_pk PRIMARY KEY (id),
	CONSTRAINT ps_action_log_payload_fk FOREIGN KEY (action_log_id) REFERENCES price_markdown.tb_action_log_master(id)
);