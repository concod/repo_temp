--liquibase formatted sql
--changeset liquibase:kpi_threshold_master_create stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for kpi_threshold_master_create
CREATE TABLE monday_smart.kpi_threshold_master (
	id bigserial NOT NULL,
	color text NOT NULL,
	color_code int4 NOT NULL,
	boolean_identifier text NOT NULL,
	boolean_code int4 NULL,
	user_code int4 NOT NULL,
	role_code int4 NOT NULL,
	module_code int4 NOT NULL,
	created_on timestamp NOT NULL DEFAULT now(),
	updated_on timestamp NOT NULL DEFAULT now(),
	timeline text NOT NULL DEFAULT 'LW'::text,
	formulae text NOT NULL DEFAULT ''::text,
	CONSTRAINT tb_kpi_threshold_new_id_key UNIQUE (id),
	CONSTRAINT fk_role_kpi_new_id FOREIGN KEY (role_code) REFERENCES "global".roles_master(role_code),
	CONSTRAINT fk_user_kpi_new_id FOREIGN KEY (user_code) REFERENCES "global".user_master(user_code)
);