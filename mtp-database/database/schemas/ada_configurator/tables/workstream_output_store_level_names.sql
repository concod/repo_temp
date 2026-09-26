--liquibase formatted sql
--changeset raja.duraisamy@impactanalytics.co:workstream_output_store_level_names_update7 stripComments:false splitStatements:false context:Release_1_0 labels:MTP-42740
--comment: initial changeset for workstream_output_store_level_names_update

CREATE TABLE IF NOT EXISTS ada_configurator.workstream_output_store_level_names (
	lws_level_id int4 NOT NULL,
	store_level_name varchar NOT NULL,
	hierarchy_level int4 DEFAULT 1 NULL,
	level_value _varchar NULL,
	skip_level_flag bool DEFAULT false NULL,
	CONSTRAINT workstream_output_store_level_names_lws_level_id_fkey FOREIGN KEY (lws_level_id) REFERENCES ada_configurator.lws_level(lws_id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS workstream_output_store__lws_level_id_store_level_name_idx ON ada_configurator.workstream_output_store_level_names USING btree (lws_level_id, store_level_name);
