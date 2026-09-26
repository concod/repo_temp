--liquibase formatted sql
--changeset raja.duraisamy@impactanalytics.co:workstream_update7 stripComments:false splitStatements:false context:Release_1_0 labels:MTP-42740
--comment: initial changeset for workstream_update

CREATE TABLE IF NOT EXISTS ada_configurator.workstream (
	workstream_id serial4 NOT NULL,
	workstream_name varchar NULL,
	workstream_mapping_id int4 NULL,
	revenue_contribution int4 NULL,
	sku_count int4 DEFAULT 0 NULL,
	store_count int4 DEFAULT 0 NULL,
	training_status varchar(255) DEFAULT 'To Do'::character varying NULL,
	simulation_status varchar(255) DEFAULT 'To Do'::character varying NULL,
	accuracy_percent int4 NULL,
	coverage_percent int4 NULL,
	created_by int4 NULL,
	created_date timestamptz DEFAULT now() NULL,
	modified_by int4 NULL,
	modified_date timestamptz DEFAULT now() NULL,
	CONSTRAINT workstream_pkey PRIMARY KEY (workstream_id),
	CONSTRAINT workstream_workstream_mapping_id_fkey FOREIGN KEY (workstream_mapping_id) REFERENCES ada_configurator.workstream_level_mapping(workstream_mapping_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS workstream_workstream_mapping_id_idx ON ada_configurator.workstream USING btree (workstream_mapping_id);

