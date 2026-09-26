--liquibase formatted sql
--changeset mohan.krishna@impactanalytics.co:product_channel_discount_guardrails_version_v3  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for product_channel_discount_guardrails_version 

CREATE TABLE if not exists price_promo_opt.product_channel_discount_guardrails_version (
	product_id int4 NOT NULL,
	s0_id int4 NOT NULL,
	s1_id int4 NOT NULL,
	suggested_min_discount int4 NULL,
	suggested_max_discount int4 NULL,
	effective_start_date date NOT NULL,
	effective_end_date date NOT NULL,
	version_code int4 NOT NULL,
	effective_start_week int4 NULL,
	effective_end_week int4 NULL,
	l4w_sales float8 NULL,
	l4w_discount_pct float8 NULL,
	l4w_cost float8 NULL,
	l4w_baseline_margin float8 NULL,
	l4w_baseline_margin_pct float8 NULL,
	ly_effective_sales float8 NULL,
	ly_effective_discount_pct float8 NULL,
	ly_cost float8 NULL,
	ly_baseline_margin float8 NULL,
	ly_baseline_margin_pct float8 NULL,
	avg_elasticity float8 NULL,
	flag varchar NULL,
	CONSTRAINT product_channel_discount_guardrails_version_key PRIMARY KEY (product_id, s0_id, s1_id, effective_start_date, effective_end_date, version_code)
)
PARTITION BY LIST (version_code);


--changeset mohan.krishna.co:product_channel_discount_guardrails_version_1 stripComments:false splitStatements:false context:Release_1_0 labels:product_channel_discount_guardrails_version
--comment: Add channel column to product_channel_discount_guardrails_version
ALTER TABLE price_promo_opt.product_channel_discount_guardrails_version
	ADD COLUMN if not exists  channel varchar NULL;
ALTER TABLE price_promo_opt.product_channel_discount_guardrails_version
	RENAME COLUMN flag TO "Flag";
