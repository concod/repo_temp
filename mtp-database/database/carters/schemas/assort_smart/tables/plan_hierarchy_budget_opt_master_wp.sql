--liquibase formatted sql
--changeset mayank.bhardwaj@impactanalytics.co:Create_WP_Table_for_plan  stripComments:false splitStatements:false context:MTP-70241 labels:Crete WP table for plan_hierarchy_budget_opt_master_Wp
--comment: MTP-60223 Create IAP table for plan_hierarchy_budget_opt_master_wp

CREATE TABLE if not exists assort_smart.plan_hierarchy_budget_opt_master_wp (
	plan_code int4 NULL,
	is_active text NULL,
	optimization_level text NULL,
	carryover_flag text NULL,
	compare_type int4 NULL,
	new_l3_flag bool NULL,
	penetration_ly numeric NULL,
	margin_percentage numeric NULL,
	sell_through numeric NULL,
	txn_aur_ly numeric NULL,
	txn_aur_ty numeric NULL,
	aur_ly numeric NULL,
	aur_ty numeric NULL,
	air_ly numeric NULL,
	air_ty numeric NULL,
	imu_ly int4 NULL,
	imu_ty int4 NULL,
	cogs_ly numeric NULL,
	margin_ly numeric NULL,
	msrp_ly numeric NULL,
	receipts_quantity_ly numeric NULL,
	total_receipts_cost_ly numeric NULL,
	existing text NULL,
	revenue_ly numeric NULL,
	budget_ly numeric NULL,
	total_available_cost_ly numeric NULL,
	total_available_quantity_ly numeric NULL,
	receipts_price_per_unit numeric NULL,
	penetration_ty numeric NULL,
	cogs_ty numeric NULL,
	l2_launch_budget_ly numeric NULL,
	l2_launch_budget_ty numeric NULL,
	budget_ty numeric NULL,
	receipts_quantity_ty numeric NULL,
	total_receipts_price_ty numeric NULL,
	total_receipts_cost_ty numeric NULL,
	budget_diff numeric NULL,
	cost_budget_diff numeric NULL,
	penetration_diff numeric NULL,
	sales_ty numeric NULL,
	sales_ly numeric NULL,
	gross_margin_ty numeric NULL,
	gross_margin_ly numeric NULL,
	sales_units_ty numeric NULL,
	sales_units_ly numeric NULL,
	revenue_ty numeric NULL,
	store_eligibility_groups text NULL,
	default_budget_ty numeric NULL,
	default_receipts_quantity_ty numeric NULL,
	default_sales_ty numeric NULL,
	default_sales_units_ty numeric NULL,
	default_gross_margin_ty numeric NULL,
	default_cogs_ty numeric NULL,
	l3_name text NULL,
	hierarchy_code text NULL,
	channel int4 NULL,
	sub_channel int4 NULL,
	launch_id int4 NULL,
	season_code int4 NULL,
	receipts_price_per_unit_ly numeric NULL,
	target float8 NULL,
	plan_hierarchy_budget_opt_master_id int4 DEFAULT nextval('assort_smart.plan_hierarchy_budget_opt_mas_plan_hierarchy_budget_opt_mas_seq'::regclass) NOT NULL,
	CONSTRAINT plan_hierarchy_budget_master_wp_pkey1 PRIMARY KEY (plan_hierarchy_budget_opt_master_id)
);

--changeset abhilash.kirtikumar@impactanalytics.co liquibase:plan_hierarchy_budget_opt_master_wp stripComments:false splitStatements:false context:MTP-70241 labels:new_column_added_to_wp
--comment: Add new columns
ALTER TABLE IF exists assort_smart.plan_hierarchy_budget_opt_master_wp
ADD COLUMN IF NOT exists msrp_ty NUMERIC NULL,
ADD COLUMN IF NOT exists margin_percentage_ty NUMERIC NULL;

--changeset mayank.bhardwaj@impactanalytics.co liquibase:plan_hierarchy_budget_opt_master_wp stripComments:false splitStatements:false context:MTP-74250 labels:imu_data_type_change_carters
--comment: data type change for imu_ty and imu_ly 
ALTER TABLE IF exists assort_smart.plan_hierarchy_budget_opt_master_wp
ALTER COLUMN imu_ly TYPE float4 USING imu_ly::float4,
ALTER COLUMN imu_ty TYPE float4 USING imu_ty::float4;

--changeset hemanth.cs@impactanalytics.co liquibase:plan_hierarchy_budget_opt_master_wp stripComments:false splitStatements:false context:MTP-86806 labels:liquibase_project_start
--comment: Add new columns
ALTER TABLE IF exists assort_smart.plan_hierarchy_budget_opt_master_wp
ADD COLUMN IF NOT exists sell_through_ly NUMERIC NULL;	

--changeset mayank.bhardwaj@impactanalytics.co:dropping_launch_id_columns stripComments:false splitStatements:false context:MTP-87729 labels:column_dropped
--comment: Dropping column launch_id
ALTER TABLE IF EXISTS assort_smart.plan_hierarchy_budget_opt_master_wp
DROP COLUMN IF EXISTS launch_id;

--changeset pramodgowda.kl@impactanalytics.co:adding_bop_columns stripComments:false splitStatements:false context:MTP-9999 labels:added bop columns
--comment: Added bop columns
ALTER TABLE IF EXISTS assort_smart.plan_hierarchy_budget_opt_master_wp
    ADD COLUMN IF NOT EXISTS bop_units_ly NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS bop_units_ty NUMERIC DEFAULT 0;