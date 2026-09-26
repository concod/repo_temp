--liquibase formatted sql
--changeset sivaprasath.vadivel@impactanalytics.co:dimension_attributes_internal stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for dimension_attribute_mapping

CREATE TABLE chat_gpt.tb_pre_def_questions_new (
	id bigserial NOT NULL,
	user_code int4 NOT NULL,
	question text NOT NULL,
	ans_query text NULL,
	remarks text NULL,
	created_by int4 NULL,
	question_id bigserial NOT NULL,
	is_active bool DEFAULT true NULL,
	prompt_id int8 NULL,
	application_code int8 NOT NULL,
	created_on timestamp DEFAULT now() NOT NULL,
	updated_on timestamp DEFAULT now() NOT NULL,
	updated_by int4 DEFAULT '-1'::integer NOT NULL,
	role_code int4 NULL,
	sort_order int4 NULL,
	company varchar NOT NULL,
	CONSTRAINT tb_pre_def_questions_new_id_key UNIQUE (id)
);

ALTER TABLE chat_gpt.tb_pre_def_questions_new ADD CONSTRAINT fk_app_new_id FOREIGN KEY (application_code) REFERENCES "global".application_master(application_code);
ALTER TABLE chat_gpt.tb_pre_def_questions_new ADD CONSTRAINT fk_role_new_id FOREIGN KEY (role_code) REFERENCES "global".roles_master(role_code);
ALTER TABLE chat_gpt.tb_pre_def_questions_new ADD CONSTRAINT fk_user_new_id FOREIGN KEY (user_code) REFERENCES "global".user_master(user_code);