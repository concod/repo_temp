--liquibase formatted sql
--changeset mayank.bhardwaj@impactanalytics.co :assort_smart.launch_delivery_records_mapping stripComments:false splitStatements:false context:MTP-70241 labels:create_table
--comment: initial changeset for launch_delivery_records_mapping

CREATE TABLE IF not exists assort_smart.launch_delivery_records_mapping (
	id serial4 NOT NULL,
	record_id int4 NOT NULL,
	launch int4 NOT NULL,
	launch_start_date date NULL,
	launch_end_date date NULL,
	delivery int4 NOT NULL,
	delivery_start_date date NULL,
	delivery_end_date date NULL,
	"module" text NULL,
	CONSTRAINT launch_delivery_records_mapping_pkey PRIMARY KEY (id),
	CONSTRAINT launch_delivery_records_mapping_un UNIQUE (record_id, launch, delivery),
	CONSTRAINT unique_record_launch_delivery_plan UNIQUE (record_id, launch, delivery, module)
);