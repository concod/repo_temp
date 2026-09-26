--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:tb_action_log_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for tb_action_log_master


CREATE TABLE price_promo.tb_action_log_master (
	id serial4 NOT NULL,
	promo_ids _int4 NULL,
	screen_name varchar NOT NULL,
	processing_action varchar NOT NULL,
	processing_status int8 NOT NULL,
	created_by int8 NOT NULL,
	created_at timestamp DEFAULT now() NOT NULL,
	updated_by int8 NULL,
	updated_at timestamp NULL,
	CONSTRAINT tb_action_log_master_pk PRIMARY KEY (id)
);
CREATE INDEX idx_tb_action_log_master_operation_status ON price_promo.tb_action_log_master USING btree (processing_status);