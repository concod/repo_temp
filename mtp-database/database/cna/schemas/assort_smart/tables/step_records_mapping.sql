--liquibase formatted sql
--changeset mayank.bhardwaj@impactanalytics.co :assort_smart.step_records_mapping stripComments:false splitStatements:false context:MTP-70241 labels:create_table
--comment: initial changeset for step_records_mapping

CREATE TABLE if not exists assort_smart.step_records_mapping (
	id serial4 NOT NULL,
	record_id int4 NOT NULL,
	step float8 NOT NULL,
	sub_steps float8 NOT NULL,
	"module" text NULL,
	CONSTRAINT step_records_mapping_pkey PRIMARY KEY (id),
	CONSTRAINT step_records_mapping_un UNIQUE (record_id, step, sub_steps),
	CONSTRAINT unique_step_record UNIQUE (record_id, step, sub_steps, module)
);
