--liquibase formatted sql
--changeset surya.avinash@impactanalytics.co:tb_simulation_week_mkd_v290525 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: updated schema for tb_simulation_week_mkd_v3

CREATE TABLE price_markdown_opt.tb_simulation_week_mkd (
	product_id int4  NOT NULL,
	week_start_date date NOT NULL,
	base_percentage int4 NOT NULL,
	sales_units float8 NULL,
	baseline_sales_units float8 NULL,
	elasticity float8 NULL,
	CONSTRAINT tb_simulation_week_mkd_pk PRIMARY KEY (product_id, week_start_date, base_percentage)
)
PARTITION BY RANGE (week_start_date);
CREATE INDEX idx_product_basepercentage ON price_markdown_opt.tb_simulation_week_mkd USING btree (product_id, base_percentage);
