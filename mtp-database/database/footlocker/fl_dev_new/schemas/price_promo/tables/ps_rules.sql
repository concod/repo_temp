--liquibase formatted sql
--changeset liquibase:ps_rules_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for ps_rules - added serial 4

CREATE TABLE price_promo.ps_rules (
	rule_id serial4 NOT NULL,
	promo_id int4 NOT NULL,
	priority_number int4 NULL,
	discount_level int4 NULL,
	discount_type_id int4 NULL,
	discount_type varchar(100) NOT NULL,
	min_discount float8 NULL,
	max_discount float8 NULL,
	discount_type_values _int4 NULL,
	min_markdown_frequency int4 NULL,
	max_markdown_frequency int4 NULL,
	step_size int4 NULL,
	markdown_type varchar(100) NULL,
	markdown_budget float8 NULL,
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
	vf_type price_promo."vendor_funding_types" NULL,
	created_by int4 NOT NULL,
	updated_by int4 NULL,
	created_at timestamptz NOT NULL,
	updated_at timestamptz NULL,
	product_discount_level _int4 NULL,
	store_discount_level _int4 NULL,
	customer_discount_level _int4 NULL,
	maximization_parameter varchar NULL,
	CONSTRAINT ps_rule_pkey PRIMARY KEY (rule_id),
	CONSTRAINT ps_rule_ukey UNIQUE (rule_id, promo_id)
);
CREATE UNIQUE INDEX ps_rules_promo_id_idx ON price_promo.ps_rules USING btree (promo_id);
CREATE UNIQUE INDEX ps_rules_rule_id_idx ON price_promo.ps_rules USING btree (rule_id);
CREATE UNIQUE INDEX ps_rules_rule_promo_id_idx ON price_promo.ps_rules USING btree (rule_id, promo_id);

--changeset shrrayan.sheel@impactanalytics.co:ps_rules_1_chg_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: Updating the price_promo.ps_rules table to match the DEV environment schema by dropping existing columns and indexes, then recreating them
ALTER TABLE price_promo.ps_rules
    ADD COLUMN IF NOT EXISTS baseline_revenue float8 NULL,
    ADD COLUMN IF NOT EXISTS baseline_margin float8 NULL,
    ADD COLUMN IF NOT EXISTS baseline_units float8 NULL,
    ADD COLUMN IF NOT EXISTS baseline_gm_percent float8 NULL,
    ADD COLUMN IF NOT EXISTS ly_revenue float8 NULL,
    ADD COLUMN IF NOT EXISTS ly_margin float8 NULL,
    ADD COLUMN IF NOT EXISTS ly_units float8 NULL,
    ADD COLUMN IF NOT EXISTS ly_gm_percent float8 NULL,
    ADD COLUMN IF NOT EXISTS targets_edited bool DEFAULT false NULL;


--changeset chaudhari.shruti@impactanalytics.co:ps_rules_upto_discount_changes stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: Updating the price_promo.ps_rules table to add upto discount type changes
ALTER TABLE price_promo.ps_rules 
	ADD COLUMN IF NOT EXISTS min_upto_percent smallint NULL,
	ADD COLUMN IF NOT EXISTS max_upto_percent smallint NULL,
	ADD COLUMN IF NOT EXISTS products_on_max_upto_percent smallint NULL;


--changeset vamsi.balaga@impactanalytics.co:ps_rules_store_discount_level_default stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: Updating the price_promo.ps_rules table to set the default value for the store_discount_level column
ALTER TABLE price_promo.ps_rules ALTER COLUMN store_discount_level SET DEFAULT ARRAY[-200]::integer[];


--changeset harsh.singh@impactanalytics.co:ps_rules_upto_discount_changes_default stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: Updating the price_promo.ps_rules table to for the new changes for upto discount type
ALTER TABLE price_promo.ps_rules
	ADD COLUMN IF NOT EXISTS min_products_on_min_upto_percent int2 NULL,
	ADD COLUMN IF NOT EXISTS max_products_on_min_upto_percent int2 NULL,
	ADD COLUMN IF NOT EXISTS min_products_on_max_upto_percent int2 NULL,
	ADD COLUMN IF NOT EXISTS max_products_on_max_upto_percent int2 NULL;

--changeset harsh.singh@impactanalytics.co:ps_rules_upto_discount_changes_removed_extra_column stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: Updating the price_promo.ps_rules table to remove products_on_max_upto_percent column
ALTER TABLE price_promo.ps_rules
	DROP COLUMN IF EXISTS products_on_max_upto_percent;

--changeset pranshu.pandey@impactanalytics.co:ly_promo_spend stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: Updating the price_promo.ps_rules table to for ly_promo_spend and promo_spend_target columns
ALTER TABLE price_promo.ps_rules
	ADD COLUMN IF NOT EXISTS ly_promo_spend float8 NULL,
	ADD COLUMN IF NOT EXISTS promo_spend_target float8 NULL;

--changeset pranshu.pandey@impactanalytics.co:promo_spend_lift stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: Updating the price_promo.ps_rules table to for promo_spend_lift column
ALTER TABLE price_promo.ps_rules
	ADD COLUMN IF NOT EXISTS promo_spend_lift float8 NULL;

--changeset divyasree.bingimalla@impactanalytics.co:promo_spend_flexibility stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: Updating the price_promo.ps_rules table to for promo_spend_flexibity column
ALTER TABLE price_promo.ps_rules
ADD COLUMN promo_spend_flexibility text DEFAULT 'soft';