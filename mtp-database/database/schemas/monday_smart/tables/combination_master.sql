--liquibase formatted sql
--changeset liquibase:combination_master_create stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for combination_master
CREATE TABLE monday_smart.combination_master (
	id bigserial NOT NULL,
	threshold_code int4 NOT NULL,
	kpi text NOT NULL,
	kpi_code int4 NOT NULL,
	kpi_condition text NOT NULL,
	created_on timestamp NOT NULL DEFAULT now(),
	updated_on timestamp NOT NULL DEFAULT now(),
	comparision_identifier text NOT NULL DEFAULT 'Absolute'::text,
	comparision_year_tag text NOT NULL DEFAULT 'TY'::text,
	CONSTRAINT tb_kpi_combination_new_id_key UNIQUE (id),
	CONSTRAINT fk_kpi_code_id FOREIGN KEY (kpi_code) REFERENCES monday_smart.kpis_master(kpi_code),
	CONSTRAINT fk_threshold_code_id FOREIGN KEY (threshold_code) REFERENCES monday_smart.kpi_threshold_master(id)
);