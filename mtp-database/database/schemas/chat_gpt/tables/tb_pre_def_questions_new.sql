--liquibase formatted sql
--changeset bhargav.polavarapu@impactanalytics.co:tb_pre_def_questions_new_create stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: tb_pre_def_questions_new table creation
CREATE TABLE chat_gpt.tb_pre_def_questions_new (
	id bigserial NOT NULL,
	user_code int4 NOT NULL,
	question text NOT NULL,
	ans_query text NULL,
	remarks text NULL,
	created_by int4 NULL,
	question_id bigserial NOT NULL,
	is_active bool NULL DEFAULT true,
	prompt_id int8 NULL,
	application_code int8 NOT NULL,
	created_on timestamp NOT NULL DEFAULT now(),
	updated_on timestamp NOT NULL DEFAULT now(),
	updated_by int4 NOT NULL DEFAULT '-1'::integer,
	role_code int4 NULL,
	sort_order int4 NULL,
	CONSTRAINT tb_pre_def_questions_new_id_key UNIQUE (id),
	CONSTRAINT fk_app_new_id FOREIGN KEY (application_code) REFERENCES "global".application_master(application_code),
	CONSTRAINT fk_role_new_id FOREIGN KEY (role_code) REFERENCES "global".roles_master(role_code),
	CONSTRAINT fk_user_new_id FOREIGN KEY (user_code) REFERENCES "global".user_master(user_code)
);

--changeset sivaprasath.vadivel@impactanalytics.co:tb_pre_def_questions_new_update stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: tb_pre_def_questions_new table update
ALTER TABLE chat_gpt.tb_pre_def_questions_new ADD COLUMN IF NOT EXISTS company varchar;