--liquibase formatted sql
--changeset raja.duraisamy@impactanalytics.co:workstream_level_mapping_update6 stripComments:false splitStatements:false context:Release_1_0 labels:MTP-42740
--comment: initial changeset for workstream_level_mapping_update

CREATE TABLE IF NOT EXISTS ada_configurator.workstream_level_mapping (
	workstream_mapping_id serial4 NOT NULL,
	workstream_level1_id int4 NULL,
	workstream_level2_id int4 NULL,
	workstream_level3_id int4 NULL,
	CONSTRAINT workstream_level_mapping_pkey PRIMARY KEY (workstream_mapping_id),
	CONSTRAINT workstream_level_mapping_workstream_level1_id_fkey FOREIGN KEY (workstream_level1_id) REFERENCES ada_configurator.workstream_level(workstream_level_id) ON DELETE CASCADE,
	CONSTRAINT workstream_level_mapping_workstream_level2_id_fkey FOREIGN KEY (workstream_level2_id) REFERENCES ada_configurator.workstream_level(workstream_level_id) ON DELETE CASCADE,
	CONSTRAINT workstream_level_mapping_workstream_level3_id_fkey FOREIGN KEY (workstream_level3_id) REFERENCES ada_configurator.workstream_level(workstream_level_id) ON DELETE CASCADE
);