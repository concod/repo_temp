--liquibase formatted sql
--changeset mayank.bhardwaj@impactanalytics.co :assort_smart.plan_hierarchy_budget_opt_master_iap stripComments:false splitStatements:false context:MTP-70241 labels:create_table
--comment: initial changeset for plan_hierarchy_budget_opt_master_iap

CREATE TABLE if not exists assort_smart.plan_hierarchy_budget_opt_master_iap (
	plan_hierarchy_budget_opt_master_id int4 NOT NULL,
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
	target float8 NULL
);

--changeset jayabharath.reddy@impactanalytics.co liquibase:plan_hierarchy_budget_opt_master_sp stripComments:false splitStatements:false context:MTP-74250 labels:new_column_added_to_iap
--comment: Add new columns
ALTER TABLE IF exists assort_smart.plan_hierarchy_budget_opt_master_iap
ADD COLUMN IF NOT exists msrp_ty NUMERIC NULL,
ADD COLUMN IF NOT exists margin_percentage_ty NUMERIC NULL;

--changeset jayabharath.reddy@impactanalytics.co liquibase:plan_hierarchy_budget_opt_master_iap_pk stripComments:false splitStatements:false context:MTP-74250 labels:added_primary_key_to_iap
--comment: Added primary key to the table
ALTER TABLE IF exists assort_smart.plan_hierarchy_budget_opt_master_iap
ADD CONSTRAINT plan_hierarchy_budget_master_iap_pkey1 PRIMARY KEY (plan_hierarchy_budget_opt_master_id);

--changeset jayabharath.reddy@impactanalytics.co liquibase:plan_hierarchy_budget_opt_master_iap_pk_set_default stripComments:false splitStatements:false context:MTP-74250 labels:added_default_value_to_iap
--comment: Added default value to the table
ALTER TABLE assort_smart.plan_hierarchy_budget_opt_master_iap ALTER COLUMN plan_hierarchy_budget_opt_master_id SET DEFAULT nextval('assort_smart.plan_hierarchy_budget_master_iap_pkey1'); 

CREATE SEQUENCE IF NOT EXISTS assort_smart.plan_hierarchy_budget_opt_mas_plan_hierarchy_budget_opt_mas_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;

--changeset jayabharath.reddy@impactanalytics.co liquibase:plan_hierarchy_budget_opt_master_iap_pk_set_default_new stripComments:false splitStatements:false context:MTP-74250 labels:added_default_value_to_iap_new
--comment: Added new default value to the table
ALTER TABLE assort_smart.plan_hierarchy_budget_opt_master_iap ALTER COLUMN plan_hierarchy_budget_opt_master_id SET DEFAULT nextval('assort_smart.plan_hierarchy_budget_opt_mas_plan_hierarchy_budget_opt_mas_seq'::regclass); 	

--changeset mayank.bhardwaj@impactanalytics.co liquibase:plan_hierarchy_budget_opt_master_iap stripComments:false splitStatements:false context:MTP-74250 labels:imu_data_type_change
--comment: data type change for imu_ty and imu_ly 
ALTER TABLE IF exists assort_smart.plan_hierarchy_budget_opt_master_iap
ALTER COLUMN imu_ly TYPE float4 USING imu_ly::float4,
ALTER COLUMN imu_ty TYPE float4 USING imu_ty::float4;

--changeset hemanth.cs@impactanalytics.co liquibase:plan_hierarchy_budget_opt_master_iap stripComments:false splitStatements:false context:MTP-86806 labels:liquibase_project_start
--comment: Add new columns
ALTER TABLE IF exists assort_smart.plan_hierarchy_budget_opt_master_iap
ADD COLUMN IF NOT exists sell_through_ly NUMERIC NULL;

--changeset mayank.bhardwaj@impactanalytics.co liquibase:drop_launch_id_column stripComments:false splitStatements:false context:MTP-87729 labels:liquibase_project_start
--comment: Drop column launch_id
ALTER TABLE IF EXISTS assort_smart.plan_hierarchy_budget_opt_master_iap
DROP COLUMN IF EXISTS launch_id;

--changeset abhilash.kirtikumar@impactanalytics.co liquibase:plan_hierarchy_budget_opt_master_iap_tb_bop_upload stripComments:false splitStatements:false context:tb_bop_upload_opti_iap labels:opti_tb_bop_upload_iap
--comment: tb_bop_upload_to_opti_iap
ALTER TABLE IF exists assort_smart.plan_hierarchy_budget_opt_master_iap
ADD COLUMN IF NOT exists bop_units_ly NUMERIC NULL,
ADD COLUMN IF NOT exists bop_units_ty NUMERIC NULL;

--changeset mayank.bhardwaj@impactanalytics.co liquibase:bop_units_ly_default_set_iap stripComments:false splitStatements:false context:MTP-87729 labels:liquibase_project_start
--comment: Set default 0 for bop_units_ly and bop_units_ty in IAP
ALTER TABLE assort_smart.plan_hierarchy_budget_opt_master_iap
ALTER COLUMN bop_units_ly SET DEFAULT 0,
ALTER COLUMN bop_units_ty SET DEFAULT 0;


--changeset ezhil.kannan@impactanalytics.co liquibase:bop_units_ly_default_set_iap_3 stripComments:false splitStatements:false context:add-index-for-join-optimize_3 labels:liquibase_project_start
--comment: Add index for join optimize
CREATE INDEX IF NOT EXISTS idx_plan_hierarchy_budget_opt_master_iap_plan_compare_hier_1
ON assort_smart.plan_hierarchy_budget_opt_master_iap (plan_code, compare_type, hierarchy_code);

--changeset ezhil.kannan@impactanalytics.co:assort_smart.plan_hierarchy_budget_opt_master_iap_perf_idx_tommy stripComments:false splitStatements:false context:aps_st_v3_perf_indexes labels:performance_index
--comment: Composite partial index for budget queries in aps-st-v3
CREATE INDEX IF NOT EXISTS idx_phbom_iap_plan_compare_opt ON assort_smart.plan_hierarchy_budget_opt_master_iap (plan_code, compare_type, optimization_level) WHERE is_active = 'YES';
