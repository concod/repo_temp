--liquibase formatted sql
--changeset liquibase:tb_budget_master_baseline stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_budget_master_baseline

CREATE TABLE price_promo_opt.tb_budget_master_baseline (
	s0_id int8 NULL,
	s1_id int8 NULL,
	channel varchar NULL,
	product_id int8 NULL,
	store_id int8 NULL,
	dates date NULL,
	units float8 NULL,
	margin float8 NULL,
	revenue float8 NULL
)
PARTITION BY RANGE (dates);


--changeset liquibase:tb_budget_master_baseline_update_07082025 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: update structure of tb_budget_master_baseline to match latest DDL

-- Step 1: Drop unwanted columns
ALTER TABLE price_promo_opt.tb_budget_master_baseline
DROP COLUMN s1_id,
DROP COLUMN channel,
DROP COLUMN store_id,
DROP COLUMN units;

-- Step 2: Change data types of existing columns (int8 -> int4)
ALTER TABLE price_promo_opt.tb_budget_master_baseline
ALTER COLUMN s0_id TYPE int4,
ALTER COLUMN product_id TYPE int4;

-- Step 3: Add new columns
ALTER TABLE price_promo_opt.tb_budget_master_baseline
ADD COLUMN s3_id int4 NOT NULL,
ADD COLUMN s3_name text NULL,
ADD COLUMN c0_name varchar NULL,
ADD COLUMN c0_id int4 NOT NULL,
ADD COLUMN c2_id int4 NULL,
ADD COLUMN customer_id int4 NULL,
ADD COLUMN sales_units float8 NULL,
ADD COLUMN s0_name text NULL,
ADD COLUMN week_start_date date NOT NULL;

-- Step 4: Ensure dates column is NOT NULL (was previously nullable)
ALTER TABLE price_promo_opt.tb_budget_master_baseline
ALTER COLUMN dates SET NOT NULL;

-- Step 5: Add primary key constraint
ALTER TABLE price_promo_opt.tb_budget_master_baseline
ADD CONSTRAINT tb_budget_master_baseline_pkey 
PRIMARY KEY (s0_id, product_id, s3_id, dates, c0_id);


--changeset kumaran.k@impactanalytics.co:tb_budget_master_baseline_v5 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: tb_budget_master_baseline_v5

DROP TABLE IF EXISTS price_promo_opt.tb_budget_master_baseline;
CREATE TABLE price_promo_opt.tb_budget_master_baseline (
	dates date NOT NULL,
	week_start_date date NOT NULL,
	c0_id int4 NOT NULL,
	s0_id int4 NOT NULL,
	s0_name text NULL,
	s3_id int4 NOT NULL,
	s3_name text NULL,
	product_id int4 NOT NULL,
	sales_units float8 NULL,
	margin float8 NULL,
	revenue float8 NULL,
	CONSTRAINT tb_budget_master_baseline_pkey PRIMARY KEY (dates, c0_id, s0_id, s3_id, product_id)
)
PARTITION BY RANGE (dates);
