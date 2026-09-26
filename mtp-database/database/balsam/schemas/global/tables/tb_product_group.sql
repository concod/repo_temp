--liquibase formatted sql
--changeset liquibase:tb_product_group_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_product_group with if not exists
CREATE TABLE "global".tb_product_group (
	pg_id serial4 NOT NULL,
	pg_name text NULL,
	pg_grouping_type int2 DEFAULT 1 NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz NULL,
	created_by int4 DEFAULT 0 NOT NULL,
	updated_by int4 DEFAULT 0 NULL,
	is_deleted int2 DEFAULT 0 NOT NULL,
	description text NULL,
	products_count int4 DEFAULT 0 NULL,
	is_under_processing int2 DEFAULT 0 NULL,
	CONSTRAINT product_group_pkey PRIMARY KEY (pg_id)
);
CREATE INDEX tb_product_group_pg_id_idx_1 ON global.tb_product_group USING btree (pg_id);
