--liquibase formatted sql
--changeset mohammed.ayaz@impactanalytics.co:plan_l3_opt_master_sp,rename_table stripComments:false splitStatements:false context:MTP-48672 labels:plan_l3_opt_master_sp, rename_table
--comment: initial changeset for plan_l3_opt_master_sp, rename file to rename_table_name
CREATE TABLE if not exists assort_smart.plan_l3_opt_master_sp (
	plan_bud_opt_id serial4 NOT NULL,
	plan_code int4 NOT NULL,
	hierarchy_code text NOT NULL,
	season_code int4 NOT NULL,
	channel int4 NOT NULL,
	sub_channel int4 NOT NULL,
	launch_id int4 NOT NULL,
	optimization_level varchar NULL,
	air_ly float8 NULL DEFAULT 0.0,
	air_ty float8 NULL DEFAULT 0.0,
	aur_ly float8 NULL DEFAULT 0.0,
	aur_ty float8 NULL DEFAULT 0.0,
	imu_ly float8 NULL DEFAULT 0.0,
	imu_ty float8 NULL DEFAULT 0.0,
	cogs_ly float8 NULL DEFAULT 0.0,
	cogs_ty float8 NULL DEFAULT 0.0,
	msrp_ly float8 NULL DEFAULT 0.0,
	existing float8 NULL DEFAULT 0.0,
	budget_ly float8 NULL DEFAULT 0.0,
	budget_ty float8 NULL DEFAULT 0.0,
	margin_ly float8 NULL DEFAULT 0.0,
	revenue_ly float8 NULL DEFAULT 0.0,
	revenue_ty float8 NULL DEFAULT 0.0,
	txn_aur_ty float8 NULL DEFAULT 0.0,
	budget_diff float8 NULL DEFAULT 0.0,
	new_l3_flag varchar NULL,
	sell_through float8 NULL DEFAULT 0.0,
	penetration_ly float8 NULL DEFAULT 0.0,
	penetration_ty float8 NULL DEFAULT 0.0,
	cost_budget_diff float8 NULL DEFAULT 0.0,
	penetration_diff float8 NULL DEFAULT 0.0,
	l2_drop_budget_ly float8 NULL DEFAULT 0.0,
	l2_drop_budget_ty float8 NULL DEFAULT 0.0,
	margin_percentage float8 NULL DEFAULT 0.0,
	receipts_quantity_ly float8 NULL DEFAULT 0.0,
	receipts_quantity_op float8 NULL DEFAULT 0.0,
	receipts_quantity_ty float8 NULL DEFAULT 0.0,
	total_receipts_cost_ly float8 NULL DEFAULT 0.0,
	total_receipts_cost_ty float8 NULL DEFAULT 0.0,
	total_available_cost_ly float8 NULL DEFAULT 0.0,
	total_receipts_price_ty float8 NULL DEFAULT 0.0,
	store_eligibility_groups varchar NULL,
	total_available_quantity_ly float8 NULL DEFAULT 0.0,
	compare_type int4 NULL,
	CONSTRAINT plan_l3_opt_master_sp_pkey PRIMARY KEY (plan_bud_opt_id)
);

--changeset mohammed.ayaz@impactanalytics.co:plan_hierarchy_budget_opt_master_sp stripComments:false splitStatements:false context:MTP-48672 labels:liquibase_project_start
--comment: rename table to plan_hierarchy_budget_opt_master_sp
ALTER TABLE assort_smart.plan_l3_opt_master_sp RENAME TO plan_hierarchy_budget_opt_master_sp;

--changeset abhilash.kirtikumar@impactanalytics.co liquibase:plan_hierarchy_budget_opt_master_sp stripComments:false splitStatements:false context:MTP-70241 labels:new_column_added_to_sp
--comment: Add new columns
ALTER TABLE IF exists assort_smart.plan_hierarchy_budget_opt_master_sp
ADD COLUMN IF NOT exists msrp_ty NUMERIC NULL,
ADD COLUMN IF NOT exists margin_percentage_ty NUMERIC NULL;

--changeset mayank.bhardwaj@impactanalytics.co liquibase:plan_hierarchy_budget_opt_master_sp stripComments:false splitStatements:false context:MTP-74250 labels:imu_data_type_change_carters
--comment: data type change for imu_ty and imu_ly 
ALTER TABLE IF exists assort_smart.plan_hierarchy_budget_opt_master_sp
ALTER COLUMN imu_ly TYPE float4 USING imu_ly::float4,
ALTER COLUMN imu_ty TYPE float4 USING imu_ty::float4;

--changeset hemanth.cs@impactanalytics.co liquibase:plan_hierarchy_budget_opt_master_sp stripComments:false splitStatements:false context:MTP-86806 labels:liquibase_project_start
--comment: Add new columns
ALTER TABLE IF exists assort_smart.plan_hierarchy_budget_opt_master_sp
ADD COLUMN IF NOT exists sell_through_ly NUMERIC NULL;

--changeset mayank.bhardwaj@impactanalytics.co:dropping_launch_id_columns stripComments:false splitStatements:false context:MTP-87729 labels:column_dropped
--comment: Dropping column launch_id
ALTER TABLE IF EXISTS assort_smart.plan_hierarchy_budget_opt_master_sp
DROP COLUMN IF EXISTS launch_id;

--changeset pramodgowda.kl@impactanalytics.co:adding_bop_columns stripComments:false splitStatements:false context:MTP-9999 labels:added bop columns
--comment: Added bop columns
ALTER TABLE IF EXISTS assort_smart.plan_hierarchy_budget_opt_master_sp
    ADD COLUMN IF NOT EXISTS bop_units_ly NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS bop_units_ty NUMERIC DEFAULT 0;