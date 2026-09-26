--liquibase formatted sql
--changeset liquibase:ps_rules_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for ps_rules - added serial 4
CREATE TABLE price_promo.ps_rules (
	rule_id serial4 NOT NULL,
	promo_id int4 NOT NULL,
	discount_level int4 NOT NULL,
	discount_type varchar(100) NOT NULL,
	min_discount float8 NULL,
	max_discount float8 NULL,
	min_markdown_frequency int4 NULL,
	max_markdown_frequency int4 NULL,
	step_size int4 NULL,
	markdown_type varchar(100) NULL,
	markdown_budget float8 NULL,
	discount_type_id int4 NULL,
	discount_type_values _float8 NULL,
	gross_margin_target float8 NULL,
	gross_margin_lift int4 NULL,
	gross_margin_priority int4 NULL,
	revenue_target float8 NULL,
	revenue_lift float8 NULL,
	revenue_priority int2 NULL,
	units_target int4 NULL,
	units_lift float8 NULL,
	units_priority int2 NULL,
	gross_margin_percent_target float8 NULL,
	gross_margin_percent_lift int4 NULL,
	gross_margin_percent_priority int4 NULL,
	opt_discount_type_id int4 NULL,
	min_eff_percent float8 NULL,
	max_eff_percent float8 NULL,
	discount_segment int4 NULL,
	competitive_price int4 NULL,
	margin_below int4 NULL,
	vf_fixed_amount float8 NULL,
	vf_per_unit float8 NULL,
	vf_type int4 NULL,
	created_by int4 NOT NULL,
	updated_by int4 NULL,
	created_at timestamptz NOT NULL,
	updated_at timestamptz NULL,
	CONSTRAINT ps_rule_pkey PRIMARY KEY (rule_id)
);
CREATE UNIQUE INDEX ps_rules_promo_id_idx ON price_promo.ps_rules USING btree (promo_id);


--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:ps_rules_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: Updating the price_promo.ps_rules table to match the DEV environment schema by dropping existing columns and indexes, then recreating them

-- Drop existing constraints and indexes that need to be replaced
ALTER TABLE price_promo.ps_rules
    DROP CONSTRAINT IF EXISTS ps_rule_ukey;

DROP INDEX IF EXISTS ps_rules_rule_id_idx;
DROP INDEX IF EXISTS ps_rules_promo_id_idx;
DROP INDEX IF EXISTS ps_rules_rule_promo_id_idx;

-- Drop columns that are not in the DEV environment
ALTER TABLE price_promo.ps_rules
    DROP COLUMN IF EXISTS discount_type_id,
    DROP COLUMN IF EXISTS discount_type_values,
    DROP COLUMN IF EXISTS gross_margin_target,
    DROP COLUMN IF EXISTS gross_margin_lift,
    DROP COLUMN IF EXISTS gross_margin_priority,
    DROP COLUMN IF EXISTS revenue_target,
    DROP COLUMN IF EXISTS revenue_lift,
    DROP COLUMN IF EXISTS revenue_priority,
    DROP COLUMN IF EXISTS units_target,
    DROP COLUMN IF EXISTS units_lift,
    DROP COLUMN IF EXISTS units_priority,
    DROP COLUMN IF EXISTS gross_margin_percent_target,
    DROP COLUMN IF EXISTS gross_margin_percent_lift,
    DROP COLUMN IF EXISTS gross_margin_percent_priority,
    DROP COLUMN IF EXISTS min_eff_percent,
    DROP COLUMN IF EXISTS max_eff_percent,
    DROP COLUMN IF EXISTS discount_segment,
    DROP COLUMN IF EXISTS competitive_price,
    DROP COLUMN IF EXISTS margin_below,
    DROP COLUMN IF EXISTS vf_fixed_amount,
    DROP COLUMN IF EXISTS vf_per_unit,
    DROP COLUMN IF EXISTS vf_type;

-- Add missing columns to match DEV environment
ALTER TABLE price_promo.ps_rules
    ADD COLUMN IF NOT EXISTS priority_number int4 NULL,
    ADD COLUMN IF NOT EXISTS discount_type_id int4 NULL,
    ADD COLUMN IF NOT EXISTS discount_type_values _int4 NULL,
    ADD COLUMN IF NOT EXISTS step_size int4 NULL,
    ADD COLUMN IF NOT EXISTS markdown_type varchar(100) NULL,
    ADD COLUMN IF NOT EXISTS markdown_budget float8 NULL,
    ADD COLUMN IF NOT EXISTS gross_margin_target float8 NULL,
    ADD COLUMN IF NOT EXISTS gross_margin_lift int4 NULL,
    ADD COLUMN IF NOT EXISTS gross_margin_priority int4 NULL,
    ADD COLUMN IF NOT EXISTS revenue_target float8 NULL,
    ADD COLUMN IF NOT EXISTS revenue_lift float8 NULL,
    ADD COLUMN IF NOT EXISTS revenue_priority int2 NULL,
    ADD COLUMN IF NOT EXISTS units_target int4 NULL,
    ADD COLUMN IF NOT EXISTS units_lift float8 NULL,
    ADD COLUMN IF NOT EXISTS units_priority int2 NULL,
    ADD COLUMN IF NOT EXISTS gross_margin_percent_target float8 NULL,
    ADD COLUMN IF NOT EXISTS gross_margin_percent_lift int4 NULL,
    ADD COLUMN IF NOT EXISTS gross_margin_percent_priority int4 NULL,
    ADD COLUMN IF NOT EXISTS opt_discount_type_id int4 NULL,
    ADD COLUMN IF NOT EXISTS min_eff_percent float8 NULL,
    ADD COLUMN IF NOT EXISTS max_eff_percent float8 NULL,
    ADD COLUMN IF NOT EXISTS discount_segment int4 NULL,
    ADD COLUMN IF NOT EXISTS competitive_price int4 NULL,
    ADD COLUMN IF NOT EXISTS margin_below int4 NULL,
    ADD COLUMN IF NOT EXISTS vf_fixed_amount float8 NULL,
    ADD COLUMN IF NOT EXISTS vf_per_unit float8 NULL,
    ADD COLUMN IF NOT EXISTS vf_type int4 NULL;

-- Add the unique constraint to match DEV environment
ALTER TABLE price_promo.ps_rules
    ADD CONSTRAINT ps_rule_ukey UNIQUE (rule_id, promo_id);

-- Recreate indexes to match DEV environment
CREATE UNIQUE INDEX idx_ps_rules_promo_id_1
    ON price_promo.ps_rules USING btree (promo_id);

--changeset shrrayan.sheel@impactanalytics.co:added_maximization_parameter_coloumn stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: added maximization_parameter types column to ps_rules of type varchar
ALTER TABLE price_promo.ps_rules ADD COLUMN IF NOT EXISTS maximization_parameter varchar NULL;

