--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_store_group_10 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_store_group_10

CREATE TABLE base_pricing.bp_store_group (
	store_group_id int4 GENERATED ALWAYS AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1 NO CYCLE) NOT NULL,
	store_group_name text NULL,
	sg_grouping_type int2 DEFAULT 1 NULL,
	stores_count int4 DEFAULT 0 NULL,
	description text NULL,
	is_deleted int2 DEFAULT 0 NOT NULL,
	is_under_processing int2 DEFAULT 0 NULL,
	created_by int4 NULL,
	created_at timestamptz NULL,
	updated_by int4 NULL,
	updated_at timestamptz NULL,
	total_inventory int4 DEFAULT 0 NOT NULL,
	CONSTRAINT bp_store_group_pkey PRIMARY KEY (store_group_id)
);