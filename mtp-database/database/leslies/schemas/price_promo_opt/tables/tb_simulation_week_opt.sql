--liquibase formatted sql
--changeset vaibhav.singh@impactanalytics.co:tb_simulation_week_opt_v2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_simulation_week_opt

Drop table if exists price_promo_opt.tb_simulation_week_opt;

CREATE TABLE price_promo_opt.tb_simulation_week_opt (
	product_id int4 NULL,
	s0_id int4 NULL,
	c2_id int4 NULL,
	week_start_date date NULL,
	base_percentage float8 NULL,
	sales_units float8 NULL,
	baseline_sales_units float8 NULL,
	elasticity float8 NULL
)
PARTITION BY RANGE (week_start_date);
CREATE INDEX tb_simulation_week_opt_idx ON price_promo_opt.tb_simulation_week_opt USING btree (product_id, week_start_date, s0_id, c2_id);