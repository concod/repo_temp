--liquibase formatted sql
--changeset DB@impactanalytics.co:tb_simulation_week_opt stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for tb_simulation_week_opt


CREATE TABLE price_promo_opt.tb_simulation_week_opt (
	product_id int4 NOT NULL,
	week_start_date date NOT NULL,
	base_percentage int4 NULL,
	sales_units float8 NULL,
	baseline_sales_units float8 NULL,
	elasticity float8 NULL
)
PARTITION BY RANGE (week_start_date);
CREATE INDEX idx_product_basepercentage ON price_promo_opt.tb_simulation_week_opt (product_id,base_percentage);