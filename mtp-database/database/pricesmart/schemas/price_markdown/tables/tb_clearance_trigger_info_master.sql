--liquibase formatted sql
--changeset utkarsh.tiwari@impactanalytics.co:tb_clearance_trigger_info_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_clearance_trigger_info_master

CREATE TABLE price_markdown.tb_clearance_trigger_info_master (
	trigger_id serial4 NOT NULL,
	"name" text NOT NULL,
	description text NULL,
	product_trigger_level int4 NULL,
	store_trigger_level int4 NULL,
	created_by int4 DEFAULT 0 NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_by int4 NULL,
	updated_at timestamptz NULL,
	is_deleted bool DEFAULT false NOT NULL,
	CONSTRAINT tb_clearance_trigger_info_master_pkey PRIMARY KEY (trigger_id)
);

--changeset utkarsh.tiwari@impactanalytics.co:tb_clearance_trigger_info_master_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: tb_clearance_trigger_info_master_1.
ALTER TABLE price_markdown.tb_clearance_trigger_info_master ADD product_count int4 DEFAULT 0 NULL;
ALTER TABLE price_markdown.tb_clearance_trigger_info_master ADD store_count int4 DEFAULT 0 NULL;