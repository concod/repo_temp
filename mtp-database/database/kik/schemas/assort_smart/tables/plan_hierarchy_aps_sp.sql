--liquibase formatted sql
--changeset mayank.bhardwaj@impactanalytics.co :assort_smart.plan_hierarchy_aps_sp stripComments:false splitStatements:false context:MTP-70241 labels:create_table
--comment: initial changeset for plan_hierarchy_aps_sp

CREATE TABLE IF not exists assort_smart.plan_hierarchy_aps_sp (
	plan_hierarchy_aps_id serial4 NOT NULL,
	plan_code int4 NOT NULL,
	hierarchy_code text NOT NULL,
	season_code int4 NOT NULL,
	channel int4 NOT NULL,
	sub_channel int4 NOT NULL,
	launch_id int4 NOT NULL,
	moq float8 DEFAULT 0.0 NULL,
	st_ly float8 DEFAULT 0.0 NULL,
	st_ty float8 DEFAULT 0.0 NULL,
	aps_ly float8 DEFAULT 0.0 NULL,
	aps_ty float8 DEFAULT 0.0 NULL,
	max_cc float8 DEFAULT 0.0 NULL,
	min_cc float8 DEFAULT 0.0 NULL,
	cc_ly float8 DEFAULT 0.0 NULL,
	qty_ly float8 DEFAULT 0.0 NULL,
	qty_ty float8 DEFAULT 0.0 NULL,
	sales_unit_ly float8 DEFAULT 0.0 NULL,
	sales_unit_ty float8 DEFAULT 0.0 NULL,
	constraint_aps_ty float8 DEFAULT 0.0 NULL,
	all_door_cc float8 DEFAULT 0.0 NULL,
	cc_threshold float8 DEFAULT 0.0 NULL,
	avg_wk_cnt_ly float8 DEFAULT 0.0 NULL,
	avg_wk_cnt_ty float8 DEFAULT 0.0 NULL,
	forecast_units_ly float8 DEFAULT 0.0 NULL,
	forecast_units_ty float8 DEFAULT 0.0 NULL,
	min_cc_threshold float8 DEFAULT 0.0 NULL,
	all_door_cc_enabled bool NULL,
	compare_type int4 NULL,
	CONSTRAINT plan_hierarchy_aps_sp_pkey PRIMARY KEY (plan_hierarchy_aps_id)
);

--changeset mayank.bhardwaj@impactanalytics.co:plan_hierarchy_aps_sp stripComments:false splitStatements:false context:MTP-70241 labels:new_column_added
--comment: column add to plan_hierarchy_aps_sp
ALTER TABLE assort_smart.plan_hierarchy_aps_sp 
ADD COLUMN IF NOT EXISTS is_edited bool DEFAULT false NOT NULL;

--changeset mayank.bhardwaj@impactanalytics.co:assort_smart.plan_hierarchy_aps_sp_drop_launch_id stripComments:false splitStatements:false context:MTP-51802 labels:drop_launch_id
--comment: drop launch_id column from plan_hierarchy_aps_sp

ALTER TABLE assort_smart.plan_hierarchy_aps_sp
DROP COLUMN IF EXISTS launch_id;

--changeset ezhil.kannan@impactanalytics.co:assort_smart.plan_hierarchy_aps_sp_plan_code_idx stripComments:false splitStatements:false context:aps_st_v3_perf_indexes labels:performance_index
--comment: Add plan_code index for DELETE/SELECT performance in aps-st-v3
CREATE INDEX IF NOT EXISTS idx_plan_hierarchy_aps_sp_plan_code ON assort_smart.plan_hierarchy_aps_sp (plan_code);