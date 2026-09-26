--liquibase formatted sql
--changeset bhargav.polavarapu@impactanalytics.co:tb_pre_def_questions_create stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: tb_pre_def_questions table creation


CREATE TABLE chat_gpt.tb_pre_def_questions (
	id bigserial NOT NULL,
	question text NOT NULL,
	ans_query text NULL,
	remarks text NULL,
	created_by int4 NULL,
	connection_id int4 NULL,
	is_active bool NULL DEFAULT true,
	prompt_id int8 NULL,
	product_id int8 NULL,
	created_on timestamp NOT NULL DEFAULT now(),
	updated_on timestamp NOT NULL DEFAULT now(),
	updated_by int4 NOT NULL DEFAULT '-1'::integer,
	CONSTRAINT tb_pre_def_questions_id_key UNIQUE (id),
	CONSTRAINT fk_connection_id FOREIGN KEY (connection_id) REFERENCES chat_gpt.tb_db_connections(id),
	CONSTRAINT tb_pre_def_questions_fk FOREIGN KEY (product_id) REFERENCES chat_gpt.tb_products(id)
);
CREATE INDEX fki_fk_connection_id ON chat_gpt.tb_pre_def_questions USING btree (connection_id);