
--liquibase formatted sql
--changeset pulimallika.teja@impactanalytics.co :assort_smart.step_records_mapping stripComments:false splitStatements:false context:MTP-51802 labels:add_missing_cols
--comment: initial changeset for status_details


CREATE TABLE IF not exists assort_smart.step_records_mapping (
	id serial4 NOT NULL,
	record_id int4 NOT NULL,
	step float8 NOT NULL,
	sub_steps float8 NOT NULL,
	CONSTRAINT step_records_mapping_pkey PRIMARY KEY (id),
	CONSTRAINT step_records_mapping_un UNIQUE (record_id, step, sub_steps)
);

--changeset ezhil.kannan@impactanalytics.co :assort_smart.step_records_mapping stripComments:false splitStatements:false context:adding_new_column labels:liquibase_project_start
--comment: adding new column

ALTER TABLE assort_smart.step_records_mapping
ADD COLUMN "module" TEXT NULL;

ALTER TABLE assort_smart.step_records_mapping
DROP CONSTRAINT IF EXISTS step_records_mapping_un;

ALTER TABLE assort_smart.step_records_mapping
ADD CONSTRAINT step_records_mapping_un UNIQUE (record_id, step, sub_steps, "module");
