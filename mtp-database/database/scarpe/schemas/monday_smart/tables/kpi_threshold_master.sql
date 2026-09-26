--liquibase formatted sql
--changeset sivaprasath.vadivel@impactanalytics.co:dimension_attributes_internal stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for dimension_attribute_mapping


CREATE TABLE monday_smart.kpi_threshold_master (
	id bigserial NOT NULL,
	color text NOT NULL,
	color_code int4 NOT NULL,
	boolean_identifier text NOT NULL,
	boolean_code int4 NULL,
	user_code int4 NOT NULL,
	role_code int4 NOT NULL,
	module_code int4 NOT NULL,
	created_on timestamp DEFAULT now() NOT NULL,
	updated_on timestamp DEFAULT now() NOT NULL,
	timeline text DEFAULT 'LW'::text NOT NULL,
	formulae text DEFAULT ''::text NOT NULL,
	CONSTRAINT tb_kpi_threshold_new_id_key UNIQUE (id)
);


ALTER TABLE monday_smart.kpi_threshold_master ADD CONSTRAINT fk_role_kpi_new_id FOREIGN KEY (role_code) REFERENCES "global".roles_master(role_code);
ALTER TABLE monday_smart.kpi_threshold_master ADD CONSTRAINT fk_user_kpi_new_id FOREIGN KEY (user_code) REFERENCES "global".user_master(user_code);