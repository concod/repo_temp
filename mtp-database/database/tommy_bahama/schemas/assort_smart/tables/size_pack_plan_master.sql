--liquibase formatted sql
--changeset pulimallika.teja@impactanalytics.co:assort_smart.size_pack_plan_master stripComments:false splitStatements:false context:MTP-75019 labels:create_table
--comment: initial changeset for size_pack_plan_master

CREATE TABLE  if not exists assort_smart.size_pack_plan_master (
	"name" varchar NOT NULL,
	description text NULL,
	selling_period_sdate date NOT NULL,
	selling_period_edate date NOT NULL,
	status int2 DEFAULT 0 NOT NULL,
	compare_year int2 DEFAULT '-1'::integer NOT NULL,
	special_classification varchar NULL,
	is_deleted bool DEFAULT false NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NULL,
	created_by int4 NULL,
	updated_by int4 NULL,
	hierarchy_level varchar NOT NULL,
	hierarchy_code text NOT NULL,
	record_type varchar NULL,
	channel_id int4 NULL,
	sub_channel_id int4 NULL,
	"year" varchar NULL,
	season_name varchar NULL,
	season_code varchar NULL,
	levels jsonb DEFAULT '{}'::jsonb NOT NULL,
	parent_hierarchy_combination jsonb NULL,
	quarter int4 NULL,
	status_id int4 NULL,
	steps varchar NULL,
	plan_sub_step varchar NULL,
	size_pack_plan_master_id serial4 NOT NULL,
	CONSTRAINT assort_plan_egs CHECK ((selling_period_edate > selling_period_sdate)),
	CONSTRAINT size_pack_plan_master_pkey PRIMARY KEY (size_pack_plan_master_id)
);

--changeset rishabh.kumar@impactanalytics.co:add_s1_name_column stripComments:false splitStatements:false context:MTP-78060 labels:alter_table
--comment: Add s1_name column to size_pack_plan_master table
ALTER TABLE assort_smart.size_pack_plan_master ADD COLUMN IF NOT EXISTS s1_name varchar NULL;