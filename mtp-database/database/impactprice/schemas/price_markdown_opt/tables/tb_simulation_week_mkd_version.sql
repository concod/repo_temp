--liquibase formatted sql
--changeset siddharth.bajpai@impactanalytics.co:tb_simulation_week_mkd_version_20251216 stripComments:false splitStatements:false context:Release_1_0 labels:tb_simulation_week_mkd
--comment: Create tb_simulation_week_mkd_version table

CREATE TABLE IF NOT EXISTS price_markdown_opt.tb_simulation_week_mkd_version (
	product_id int4 NOT NULL,
	simulation_week_start_date date NOT NULL,
	base_percentage int4 NOT NULL,
	sales_units float8 NOT NULL,
	baseline_sales_units float8 NOT NULL,
	elasticity float8 NOT NULL,
	s0_id int4 NOT NULL,
	s1_id int4 NOT NULL,
	version_code int4 NOT NULL,
	CONSTRAINT tb_simulation_week_mkd_version_pk PRIMARY KEY (product_id, simulation_week_start_date, base_percentage, s0_id, s1_id, version_code)
)
PARTITION BY LIST (version_code);
CREATE INDEX idx_product_basepercentage_version ON price_markdown_opt.tb_simulation_week_mkd_version USING btree (product_id, base_percentage);

