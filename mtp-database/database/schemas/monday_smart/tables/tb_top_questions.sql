--liquibase formatted sql
--changeset sivaprasath.vadivel:tb_top_questions stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_top_questions

CREATE TABLE monday_smart.tb_top_questions (
	id bigserial NOT NULL,
	question text NOT NULL,
	sort_order int4 NOT NULL,
	company varchar NOT NULL,
	created_at timestamp DEFAULT now() NOT NULL,
	updated_at timestamp DEFAULT now() NOT NULL,
	is_active bool DEFAULT true NOT NULL,
	CONSTRAINT tb_top_quesetions_id_key UNIQUE (id)
);