--liquibase formatted sql
--changeset sadhana.j:plan_master,column updates stripComments:false splitStatements:false context:updated-table labels:add_missing_cols
--comment: updated for plan_master
CREATE TABLE if not exists assort_smart.plan_master (
	plan_code serial4 NOT NULL,
	"name" varchar NOT NULL,
	description text NULL,
	selling_period_sdate date NOT NULL,
	selling_period_edate date NOT NULL,
	status int2 NOT NULL DEFAULT 0,
	compare_year int2 NOT NULL DEFAULT '-1'::integer,
	special_classification varchar NULL,
	is_deleted bool NOT NULL DEFAULT false,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NULL DEFAULT now(),
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
	levels jsonb NOT NULL DEFAULT '{}'::jsonb,
	parent_hierarchy_combination jsonb NULL,
	quarter int4 NULL,
	status_id int4 NULL,
	CONSTRAINT assort_plan_egs CHECK ((selling_period_edate > selling_period_sdate)),
	CONSTRAINT assort_plan_master_pkey PRIMARY KEY (plan_code)
);

--changeset jayabharath.reddy@impactanalytics.co:altered_ddl,column updates stripComments:false splitStatements:false context:updated-table labels:add_missing_cols
--comment: updated for plan_master
ALTER TABLE assort_smart.plan_master ADD plan_sub_step varchar NOT NULL;
ALTER TABLE assort_smart.plan_master ADD steps varchar NOT NULL;

--changeset rishabh.kumar@impactanalytics.co:add_columns_for_plan_steps stripComments:false splitStatements:false context:MTP-66690 labels:add_missing_cols
--comment: Add alter column for plan master
ALTER TABLE assort_smart.plan_master ADD COLUMN IF NOT exists step_id int8 NULL;
ALTER TABLE assort_smart.plan_master ADD COLUMN IF NOT exists sub_step_id int8 NULL;