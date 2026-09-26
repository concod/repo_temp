--liquibase formatted sql
--changeset liquibase:tb_strategy_actuals_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_strategy_actuals  - created index
CREATE TABLE price_markdown.tb_strategy_actuals (
	strategy_id int4 NULL,
	lw_recommended_offer_percentage float8 NULL,
	lw_clearance_discount float8 NULL,
	lw_effective_price_point float8 NULL,
	lw_sales_units float8 NULL,
	lw_revenue float8 NULL,
	lw_gm_dollar float8 NULL,
	lw_gm_percent numeric NULL,
	lw_aur numeric NULL,
	lw_aum numeric NULL,
	lw_st_percent numeric NULL,
	lw_inventory numeric NULL,
	lw_markdown_dollar float8 NULL,
	till_date_recommended_offer_percentage float8 NULL,
	till_date_clearance_discount float8 NULL,
	till_date_effective_price_point float8 NULL,
	till_date_sales_units float8 NULL,
	till_date_revenue float8 NULL,
	till_date_gm_dollar float8 NULL,
	till_date_gm_percent numeric NULL,
	till_date_aur numeric NULL,
	till_date_aum numeric NULL,
	till_date_st_percent numeric NULL,
	till_date_inventory numeric NULL,
	till_date_markdown_dollar float8 NULL
);
CREATE INDEX stg_act_idx ON price_markdown.tb_strategy_actuals USING btree (strategy_id);