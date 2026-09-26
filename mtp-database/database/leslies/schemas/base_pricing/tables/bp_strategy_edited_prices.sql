--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_strategy_edited_prices_10 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_strategy_edited_prices_10

CREATE TABLE base_pricing.bp_strategy_edited_prices (
	strategy_id int4 NULL,
	product_id int4 NULL,
	user_recommended_price numeric NULL,
	store_id int4 NULL,
	price_zone_name varchar(100) NULL,
	line_group varchar(100) NULL,
	opt_level_bins varchar NULL,
	channel_id int4 NULL,
	segment_id int4 NULL,
	"comments" text NULL
)
PARTITION BY LIST (strategy_id);


--changeset krithika.s@impactanalytics.co:bp_strategy_edited_prices_1 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: adding effective_price_zone, price_lock, zone_exception columns to base_pricing.bp_strategy_edited_prices

ALTER TABLE base_pricing.bp_strategy_edited_prices
ADD COLUMN IF NOT EXISTS effective_price_zone VARCHAR(100) NULL,
ADD COLUMN IF NOT EXISTS price_lock INT2 DEFAULT 0 NULL,
ADD COLUMN IF NOT EXISTS zone_exception INT2 DEFAULT 0 NULL;
