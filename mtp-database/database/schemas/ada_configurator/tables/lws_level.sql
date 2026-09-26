--liquibase formatted sql
--changeset priyansh.gautam@impactanalytics.co:lws_level7 stripComments:false splitStatements:false context:Release_1_0 labels:MTP-89055
--comment: initial changeset for lws_level


CREATE TABLE IF NOT EXISTS  ada_configurator.lws_level (
	lws_id serial4 NOT NULL,
	lws_level_name varchar NOT NULL,
	created_by int4 NULL,
	created_date timestamptz DEFAULT now() NULL,
	modified_by int4 NULL,
	modified_date timestamptz DEFAULT now() NULL,
	CONSTRAINT lws_level_lws_level_name_key UNIQUE (lws_level_name),
	CONSTRAINT lws_level_pkey PRIMARY KEY (lws_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS lws_level_lws_id_lws_level_name_idx ON ada_configurator.lws_level USING btree (lws_id, lws_level_name);
