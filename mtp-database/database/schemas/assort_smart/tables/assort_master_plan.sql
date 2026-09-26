--liquibase formatted sql
--changeset liquibase:assort_master_plan stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for assort_master_plan
CREATE TABLE assort_smart.assort_master_plan (
	plan_master_id serial4 NOT NULL,
	levels jsonb NOT NULL,
	attribute_value jsonb NOT NULL,
	CONSTRAINT assort_master_plan_pkey PRIMARY KEY (plan_master_id)
);
--changeset hemant.kumar@impactanalytics.co:assort_smart.assort_master_plan liquibase:assort_master_plan stripComments:false splitStatements:false context:MTP-20946 labels:liquibase_project_start
--comment: initial changeset for assort_master_plan

ALTER TABLE assort_smart.assort_master_plan ADD COLUMN IF NOT EXISTS l0_name varchar NULL;
ALTER TABLE assort_smart.assort_master_plan ADD COLUMN IF NOT EXISTS l1_name varchar NULL;
ALTER TABLE assort_smart.assort_master_plan ADD COLUMN IF NOT EXISTS channel varchar NULL;
ALTER TABLE assort_smart.assort_master_plan ADD COLUMN IF NOT EXISTS start_date date NULL;


--changeset hemant.kumar@impactanalytics.co:assort_smart.assort_master_plan_partitioning liquibase:assort_master_plan stripComments:false splitStatements:false context:restructure_master_plan labels:liquibase_project_start
--comment: initial changeset for assort_master_plan 
ALTER TABLE IF EXISTS assort_smart.assort_master_plan RENAME TO assort_master_plan_bpk;

CREATE TABLE assort_smart.assort_master_plan (
	plan_master_id serial4 NOT NULL,
	levels jsonb NOT NULL,
	attribute_value jsonb NOT NULL,
	l0_name varchar NULL,
	l1_name varchar NULL,
	channel varchar NULL,
	start_date date NULL
)
PARTITION BY LIST (l0_name);


--changeset abhilash.kirtikumar@impactanalytics.co:assort_smart.assort_master_plan liquibase:assort_master_plan stripComments:adding_new_columns splitStatements:false context:restructure_master_plan labels:liquibase_project_start
-- Comment: Added new columns and deleted unnecessary columns in assort_master_plan
ALTER TABLE assort_smart.assort_master_plan DROP COLUMN IF EXISTS levels;
ALTER TABLE assort_smart.assort_master_plan DROP COLUMN IF EXISTS attribute_value;
ALTER TABLE assort_smart.assort_master_plan ADD COLUMN IF NOT EXISTS l3_name varchar(50) NULL;
ALTER TABLE assort_smart.assort_master_plan ADD COLUMN IF NOT EXISTS age varchar(50) NULL;
ALTER TABLE assort_smart.assort_master_plan ADD COLUMN IF NOT EXISTS gender varchar(50) NULL;
ALTER TABLE assort_smart.assort_master_plan ADD COLUMN IF NOT EXISTS sub_channel varchar(50) NULL;
ALTER TABLE assort_smart.assort_master_plan ADD COLUMN IF NOT EXISTS store_code int4 NULL;
ALTER TABLE assort_smart.assort_master_plan ADD COLUMN IF NOT EXISTS st float4 NULL;
ALTER TABLE assort_smart.assort_master_plan ADD COLUMN IF NOT EXISTS "size" varchar(50) NULL;
ALTER TABLE assort_smart.assort_master_plan ADD COLUMN IF NOT EXISTS receipt_qty int4 NULL;
ALTER TABLE assort_smart.assort_master_plan ADD COLUMN IF NOT EXISTS style_number varchar(50) NULL;
ALTER TABLE assort_smart.assort_master_plan ADD COLUMN IF NOT EXISTS sales_ty float4 NULL;
ALTER TABLE assort_smart.assort_master_plan ADD COLUMN IF NOT EXISTS gross_margin_ty float4 NULL;
ALTER TABLE assort_smart.assort_master_plan ADD COLUMN IF NOT EXISTS leg_type varchar(50) NULL;
ALTER TABLE assort_smart.assort_master_plan ADD COLUMN IF NOT EXISTS "class" varchar(50) NULL;
ALTER TABLE assort_smart.assort_master_plan ADD COLUMN IF NOT EXISTS leg_length_dsc varchar(50) NULL;
ALTER TABLE assort_smart.assort_master_plan ADD COLUMN IF NOT EXISTS rtl_pricing_dsc varchar(50) NULL;
ALTER TABLE assort_smart.assort_master_plan ADD COLUMN IF NOT EXISTS sleeve_length_dsc varchar(50) NULL;
ALTER TABLE assort_smart.assort_master_plan ADD COLUMN IF NOT EXISTS sleeve_type varchar(50) NULL;
ALTER TABLE assort_smart.assort_master_plan ADD COLUMN IF NOT EXISTS article varchar(50) NULL;
ALTER TABLE assort_smart.assort_master_plan ADD COLUMN IF NOT EXISTS cluster_code_id int4 NULL;
ALTER TABLE assort_smart.assort_master_plan ADD COLUMN IF NOT EXISTS aur float4 NULL;
ALTER TABLE assort_smart.assort_master_plan ADD COLUMN IF NOT EXISTS forecasted_qty int4 NULL;
ALTER TABLE assort_smart.assort_master_plan ADD COLUMN IF NOT EXISTS actual_msrp float4 NULL;
ALTER TABLE assort_smart.assort_master_plan ADD COLUMN IF NOT EXISTS total_qty int4 NULL;
ALTER TABLE assort_smart.assort_master_plan ADD COLUMN IF NOT EXISTS eop_inventory_qty int4 NULL;
ALTER TABLE assort_smart.assort_master_plan ADD COLUMN IF NOT EXISTS fiscal_year int4 NULL;
ALTER TABLE assort_smart.assort_master_plan ADD COLUMN IF NOT EXISTS fiscal_week int4 NULL;
ALTER TABLE assort_smart.assort_master_plan ADD COLUMN IF NOT EXISTS "cost" float4 NULL;
ALTER TABLE assort_smart.assort_master_plan ADD COLUMN IF NOT EXISTS l5_name varchar(50) NULL;


--changeset abhilash.kirtikumar@impactanalytics.co:assort_smart.assort_master_plan_partitions liquibase:assort_master_plan stripComments:adding_partition_to_table splitStatements:false context:restructure_master_plan labels:liquibase_project_start
-- Comment: Added new partitions in assort_master_plan
CREATE TABLE master_plan_can PARTITION OF assort_smart.assort_master_plan FOR VALUES IN ('CAN');
CREATE TABLE master_plan_usa PARTITION OF assort_smart.assort_master_plan FOR VALUES IN ('USA');
CREATE TABLE master_plan_default PARTITION OF assort_smart.assort_master_plan DEFAULT;