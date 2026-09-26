
-- liquibase formatted sql
-- changeset akashkumar.rana@impactanalytics.co:tb_pack_min_max_modification_changes_02 stripComments:false splitStatements:false context:tb_pack_min_max_modification_changes_02 labels:tb_pack_min_max_modification_changes_02
-- comment: updated changeset for tb_pack_min_max_02


CREATE TABLE IF NOT EXISTS size_smart.tb_pack_min_max (
	l0_name text NULL,
	l1_name text NULL,
	l3_name text NULL,
	l5_name text NULL,
	display_article text NULL,
	pack_min int4 NULL,
	pack_max int4 NULL,
	created_at timestamptz NULL,
	updated_at timestamptz NULL,
	id serial4 NOT NULL,
	CONSTRAINT unique_key_tb_pack_min_max UNIQUE (l0_name, l1_name, l3_name, l5_name, display_article)
);
