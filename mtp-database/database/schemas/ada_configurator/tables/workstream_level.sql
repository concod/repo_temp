--liquibase formatted sql
--changeset raja.duraisamy@impactanalytics.co:workstream_level_update8 stripComments:false splitStatements:false context:Release_1_0 labels:MTP-42740
--comment: initial changeset for workstream_level_update

CREATE TABLE IF NOT EXISTS ada_configurator.workstream_level (
	workstream_level_id serial4 NOT NULL,
	workstream_level_name varchar NOT NULL,
	lws_mapping_id int4 NULL,
	created_by int4 NULL,
	created_date timestamptz DEFAULT now() NULL,
	modified_by int4 NULL,
	modified_date timestamptz DEFAULT now() NULL,
	grouping_id serial4 NOT NULL,
	CONSTRAINT workstream_level_pkey PRIMARY KEY (workstream_level_id),
	CONSTRAINT workstream_level_workstream_level_name_key UNIQUE (workstream_level_name),
	CONSTRAINT workstream_level_lws_mapping_id_fkey FOREIGN KEY (lws_mapping_id) REFERENCES ada_configurator.lws_mapping(lws_mapping_mapping_id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS workstream_level_workstream_level_id_workstream_level__idx ON ada_configurator.workstream_level USING btree (workstream_level_id, workstream_level_name);
