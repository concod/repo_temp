--liquibase formatted sql
--changeset liquibase:tb_store_group_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_store_group with if not exists
CREATE TABLE pricesmart.tb_store_group (
	sg_id serial4 NOT NULL,
	sg_name text NULL,
	sg_grouping_type int2 DEFAULT 1 NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz NULL,
	created_by int4 DEFAULT 0 NOT NULL,
	updated_by int4 DEFAULT 0 NULL,
	is_deleted int2 DEFAULT 0 NOT NULL,
	description text NULL,
	stores_count int4 DEFAULT 0 NULL,
	is_under_processing int2 DEFAULT 0 NULL,
	CONSTRAINT store_group_pkey PRIMARY KEY (sg_id)
);
CREATE INDEX tb_store_group_sg_id_idx_1 ON pricesmart.tb_store_group USING btree (sg_id);