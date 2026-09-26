
--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_strategy_edited_prices_v3 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_strategy_edited_prices_v3

CREATE TABLE base_pricing.bp_strategy_edited_prices (
	strategy_id int4 NULL,
	product_id int4 NULL,
	user_recommended_price numeric NULL,
	store_id int4 NULL,
	price_zone_name varchar(100) NULL,
	line_group varchar(100) NULL,
	opt_level_bins varchar NULL,
	channel_id int4 NULL,
	segment_id int4 NULL
)
PARTITION BY LIST (strategy_id);