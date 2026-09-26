--liquibase formatted sql
--changeset pulimallika.teja@impactanalytics.co :assort_smart.launch_delivery_records_mapping stripComments:false splitStatements:false context:MTP-51802 labels:add_missing_cols
--comment: initial changeset for status_details



CREATE TABLE IF not exists assort_smart.launch_delivery_records_mapping (
	id serial4 NOT NULL,
	record_id int4 NOT NULL,
	launch int4 NOT NULL,
	launch_start_date date NULL,
	launch_end_date date NULL,
	delivery int4 NOT NULL,
	delivery_start_date date NULL,
	delivery_end_date date NULL,
	CONSTRAINT launch_delivery_records_mapping_pkey PRIMARY KEY (id),
	CONSTRAINT launch_delivery_records_mapping_un UNIQUE (record_id, launch, delivery)
);

--changeset ezhil.kannan@impactanalytics.co:assort_smart.launch_delivery_records_mapping_un stripComments:false splitStatements:false context:adding_new_column labels:liquibase_project_start
--comment: adding new column and constraints

ALTER TABLE assort_smart.launch_delivery_records_mapping
ADD COLUMN IF NOT EXISTS "module" TEXT NULL;

ALTER TABLE assort_smart.launch_delivery_records_mapping
DROP CONSTRAINT IF EXISTS launch_delivery_records_mapping_un;

ALTER TABLE assort_smart.launch_delivery_records_mapping
ADD CONSTRAINT launch_delivery_records_mapping_un UNIQUE (record_id, launch, delivery, "module");
