--liquibase formatted sql
--changeset priyansh.gautam@impactanalytics.co:lws_mapping6 stripComments:false splitStatements:false context:Release_1_0 labels:MTP-89055
--comment: initial changeset for lws_mapping


CREATE TABLE IF NOT EXISTS ada_configurator.lws_mapping (
	lws_mapping_mapping_id serial4 NOT NULL,
	lws_level_id int4 NULL,
	parent_lws_level_id int4 NULL,
	CONSTRAINT lws_mapping_pkey PRIMARY KEY (lws_mapping_mapping_id),
	CONSTRAINT lws_mapping_lws_level_id_fkey FOREIGN KEY (lws_level_id) REFERENCES ada_configurator.lws_level(lws_id) ON DELETE CASCADE,
	CONSTRAINT lws_mapping_parent_lws_level_id_fkey FOREIGN KEY (parent_lws_level_id) REFERENCES ada_configurator.lws_level(lws_id) ON DELETE CASCADE
);