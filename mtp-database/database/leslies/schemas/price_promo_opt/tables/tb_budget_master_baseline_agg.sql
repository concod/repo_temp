--liquibase formatted sql
--changeset liquibase:tb_budget_master_baseline_agg stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_budget_master_baseline_agg

CREATE TABLE price_promo_opt.tb_budget_master_baseline_agg (
	s0_id int8 NULL,
	s1_id int8 NULL,
	channel varchar NULL,
	product_id int8 NULL,
	dates date NULL,
	units float8 NULL,
	margin float8 NULL,
	revenue float8 NULL
)
PARTITION BY RANGE (dates);


--changeset kumaran.k@impactanalytics.co:tb_budget_master_baseline_agg_v5 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: tb_budget_master_baseline_agg_v5


DROP TABLE IF EXISTS price_promo_opt.tb_budget_master_baseline_agg;
CREATE TABLE price_promo_opt.tb_budget_master_baseline_agg (
	dates date NOT NULL,
	week_start_date date NOT NULL,
	c0_id int4 NOT NULL,
	product_id int4 NOT NULL,
	sales_units float8 NULL,
	margin float8 NULL,
	revenue float8 NULL,
	CONSTRAINT tb_budget_master_bsl_agg_pkey PRIMARY KEY (dates, c0_id, product_id)
)
PARTITION BY RANGE (dates);