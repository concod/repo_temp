--liquibase formatted sql
--changeset sivaprasath.vadivel@impactanalytics.co:combination_master_update stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for combination_master

CREATE TABLE monday_smart.combination_master (
	id bigserial NOT NULL,
	threshold_code int4 NOT NULL,
	kpi text NOT NULL,
	kpi_code int4 NOT NULL,
	kpi_condition text NOT NULL,
	created_on timestamp DEFAULT now() NOT NULL,
	updated_on timestamp DEFAULT now() NOT NULL,
	comparision_identifier text DEFAULT 'Absolute'::text NOT NULL,
	comparision_year_tag text DEFAULT 'TY'::text NOT NULL,
	CONSTRAINT tb_kpi_combination_new_id_key UNIQUE (id)
);


-- monday_smart.combination_master foreign keys

ALTER TABLE monday_smart.combination_master ADD CONSTRAINT fk_kpi_code_id FOREIGN KEY (kpi_code) REFERENCES monday_smart.kpis_master(kpi_code);
ALTER TABLE monday_smart.combination_master ADD CONSTRAINT fk_threshold_code_id FOREIGN KEY (threshold_code) REFERENCES monday_smart.kpi_threshold_master(id);