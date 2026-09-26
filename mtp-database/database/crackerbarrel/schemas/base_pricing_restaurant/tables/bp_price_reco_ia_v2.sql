--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_price_reco_ia_v2 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.bp_price_reco_ia_v2


CREATE TABLE base_pricing_restaurant.bp_price_reco_ia_v2 (
	id bigserial NOT NULL,
	strategy_id int4 NOT NULL,
	product_id int4 NOT NULL,
	store_id varchar(255) NOT NULL,
	segment_id int4 NULL,
	channel_id int4 NULL,
	product_name varchar(255) NOT NULL,
	store_name varchar(255) NOT NULL,
	segment_name varchar(255) NOT NULL,
	strategy_name varchar NULL,
	opt_level_bins varchar(255) NULL,
	start_date date NOT NULL,
	end_date date NOT NULL,
	line_group varchar(100) NULL,
	size_family varchar(100) NULL,
	size_class varchar(100) NULL,
	brand_family varchar(100) NULL,
	brand_class varchar(100) NULL,
	channel varchar(100) NULL,
	zone_structure_id int4 NULL,
	zone_structure_name varchar(255) NULL,
	effective_price_zone text NULL,
	price_zone_id int4 NULL,
	price_zone_name varchar(255) NULL,
	uom varchar(50) NULL,
	"size" float8 NULL,
	"cost" float8 NULL,
	custom_family_1 varchar NULL,
	custom_family_2 varchar NULL,
	custom_class_1 varchar NULL,
	custom_class_2 varchar NULL,
	pre_price int2 DEFAULT 0 NULL,
	price_lock int2 DEFAULT 0 NULL,
	zone_exception int2 DEFAULT 0 NULL,
	derived_uom varchar(50) NULL,
	derived_size float8 NULL,
	price float8 NULL,
	base_price float8 NULL,
	price_difference float8 NULL,
	sales_units float8 NULL,
	revenue float8 NULL,
	gross_margin_dollar float8 NULL,
	gross_margin_percentage float8 NULL,
	asp float8 NULL,
	aum float8 NULL,
	promotion_applied float8 NULL,
	competitor_price json NULL,
	competitor_price_difference_dollar json NULL,
	competitor_price_difference_percentage json NULL,
	base_price_per_unit float8 NULL,
	price_change_reason text NULL,
	rules_exception jsonb NULL,
	rules_followed int4 NULL,
	old_cost float8 NULL,
	cost_changes float8 NULL,
	new_margin float8 NULL,
	"source" varchar(50) NULL,
	connection_id int4 NULL,
	product_attributes jsonb NULL,
	competitor_mode json NULL,
	competitor_comparison json NULL,
	competitor_name json NULL,
	baseline_sales float8 NULL,
	baseline_revenue float8 NULL,
	baseline_margin_dollar float8 NULL,
	baseline_margin_percentage float8 NULL,
	forecast_confidence varchar(50) NULL,
	contribution_margin_dollar float8 NULL,
	contribution_margin_percentage float8 NULL,
	baseline_contribution_margin_dollar float8 NULL,
	baseline_contribution_margin_percentage float8 NULL,
	store_ids _int4 NULL,
	product_ids _int4 NULL,
	distinct_prices _float8 NULL,
	CONSTRAINT bp_price_reco_ia_v2_pkey PRIMARY KEY (id, strategy_id),
	CONSTRAINT uq_bp_price_reco_ia_v2_unique UNIQUE (strategy_id, product_id, store_id, segment_id, channel_id),
	CONSTRAINT fk_product_current_v2 FOREIGN KEY (product_id) REFERENCES base_pricing_restaurant.bp_product_master(product_id) ON DELETE CASCADE
)
PARTITION BY LIST (strategy_id);
CREATE INDEX idx_bp_price_reco_ia_v2_product_store ON  base_pricing_restaurant.bp_price_reco_ia_v2 USING btree (product_id, store_id, segment_id);
CREATE INDEX idx_bp_price_reco_ia_v2_product_store_strategy ON  base_pricing_restaurant.bp_price_reco_ia_v2 USING btree (strategy_id, product_id, store_id, segment_id);
CREATE INDEX idx_bp_price_reco_ia_v2_strategy ON  base_pricing_restaurant.bp_price_reco_ia_v2 USING btree (strategy_id);


--changeset abhishek.singh@impactanalytics.co:bp_price_reco_ia_v2_1 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: adding price_points column to base_pricing_restaurant.bp_price_reco_ia_v2

ALTER TABLE base_pricing_restaurant.bp_price_reco_ia_v2
ADD COLUMN price_points text[] NULL;


--changeset abhishek.singh@impactanalytics.co:bp_price_reco_ia_v3 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: adding price_points column to base_pricing_restaurant.bp_price_reco_ia_v3


-- 1. Add missing columns to match CB client structure
ALTER TABLE base_pricing_restaurant.bp_price_reco_ia_v2 
ADD COLUMN actuals_sales_units float8 NULL,
ADD COLUMN actuals_revenue float8 NULL,
ADD COLUMN actuals_gross_margin_dollar float8 NULL,
ADD COLUMN actuals_gross_margin_percentage float8 NULL,
ADD COLUMN actuals_asp float8 NULL,
ADD COLUMN actuals_aum float8 NULL;

-- 2. Change price_points data type from text[] to _text (text array) to match CB client
ALTER TABLE base_pricing_restaurant.bp_price_reco_ia_v2 
ALTER COLUMN price_points TYPE _text;

-- 3. Drop the foreign key constraint that exists in Leslies but not in CB client
ALTER TABLE base_pricing_restaurant.bp_price_reco_ia_v2 
DROP CONSTRAINT fk_product_current_v2;

-- 4. Recreate indexes with ONLY clause to match CB client (for partitioned tables)
-- First drop the existing indexes
DROP INDEX IF EXISTS base_pricing_restaurant.idx_bp_price_reco_ia_v2_product_store;
DROP INDEX IF EXISTS base_pricing_restaurant.idx_bp_price_reco_ia_v2_product_store_strategy;
DROP INDEX IF EXISTS base_pricing_restaurant.idx_bp_price_reco_ia_v2_strategy;

-- Then recreate them with ONLY clause
CREATE INDEX idx_bp_price_reco_ia_v2_product_store 
ON base_pricing_restaurant.bp_price_reco_ia_v2 USING btree (product_id, store_id, segment_id);

CREATE INDEX idx_bp_price_reco_ia_v2_product_store_strategy 
ON base_pricing_restaurant.bp_price_reco_ia_v2 USING btree (strategy_id, product_id, store_id, segment_id);

CREATE INDEX idx_bp_price_reco_ia_v2_strategy 
ON base_pricing_restaurant.bp_price_reco_ia_v2 USING btree (strategy_id);


--changeset abhishek.singh@impactanalytics.co:bp_price_reco_ia_v4 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: adding price_points column to base_pricing_restaurant.bp_price_reco_ia_v4

ALTER TABLE base_pricing_restaurant.bp_price_reco_ia_v2 
ADD COLUMN IF NOT EXISTS actuals_sales_units FLOAT8 DEFAULT 0,
ADD COLUMN IF NOT EXISTS actuals_revenue FLOAT8 DEFAULT 0,
ADD COLUMN IF NOT EXISTS actuals_gross_margin_dollar FLOAT8 DEFAULT 0,
ADD COLUMN IF NOT EXISTS actuals_gross_margin_percentage FLOAT8 DEFAULT 0,
ADD COLUMN IF NOT EXISTS actuals_asp FLOAT8 DEFAULT 0,
ADD COLUMN IF NOT EXISTS actuals_aum FLOAT8 DEFAULT 0;