--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_last_approved_week_level_simulation stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.bp_last_approved_week_level_simulation


CREATE TABLE base_pricing_restaurant.bp_last_approved_week_level_simulation (
	strategy_id int4 NOT NULL,
	product_id int4 NOT NULL,
	week_start_date date NOT NULL,
	price_point float8 NOT NULL,
	bnm_sales_units float8 NOT NULL,
	bnm_baseline_sales_units float8 NOT NULL,
	bnm_elasticity float8 NOT NULL,
	ecom_sales_units float8 NOT NULL,
	ecom_baseline_sales_units float8 NOT NULL,
	ecom_elasticity float8 NOT NULL,
	snapshot_created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	approval_date timestamp NOT NULL,
	created_by int4 NOT NULL,
	CONSTRAINT bp_last_approved_week_level_simulation_pkey PRIMARY KEY (strategy_id, product_id, week_start_date),
	CONSTRAINT bp_last_approved_week_level_simulation_strategy_fk FOREIGN KEY (strategy_id) REFERENCES base_pricing_restaurant.bp_strategy_master(strategy_id) ON DELETE CASCADE
);
CREATE INDEX idx_last_approved_week_approval_date ON base_pricing_restaurant.bp_last_approved_week_level_simulation USING btree (strategy_id, approval_date);
CREATE INDEX idx_last_approved_week_date_range ON base_pricing_restaurant.bp_last_approved_week_level_simulation USING btree (strategy_id, week_start_date);
CREATE INDEX idx_last_approved_week_product_date ON base_pricing_restaurant.bp_last_approved_week_level_simulation USING btree (product_id, week_start_date);
CREATE INDEX idx_last_approved_week_strategy_date_product ON base_pricing_restaurant.bp_last_approved_week_level_simulation USING btree (strategy_id, week_start_date, product_id);
CREATE INDEX idx_last_approved_week_strategy_id ON base_pricing_restaurant.bp_last_approved_week_level_simulation USING btree (strategy_id);


--changeset abhishek.singh@impactanalytics.co:bp_last_approved_week_level_simulation_4 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.bp_last_approved_week_level_simulation_4

-- 1. First, drop the existing primary key constraint
ALTER TABLE base_pricing_restaurant.bp_last_approved_week_level_simulation 
DROP CONSTRAINT bp_last_approved_week_level_simulation_pkey;

-- 2. Drop columns that are not in CB client structure
ALTER TABLE base_pricing_restaurant.bp_last_approved_week_level_simulation 
DROP COLUMN bnm_sales_units,
DROP COLUMN bnm_baseline_sales_units,
DROP COLUMN bnm_elasticity,
DROP COLUMN ecom_sales_units,
DROP COLUMN ecom_baseline_sales_units,
DROP COLUMN ecom_elasticity;

-- 3. Add new columns to match CB client structure
ALTER TABLE base_pricing_restaurant.bp_last_approved_week_level_simulation 
ADD COLUMN channel_id int4 NOT NULL,
ADD COLUMN segment_id int4 NOT NULL,
ADD COLUMN min_cost float4 NOT NULL,
ADD COLUMN base_percentage float4 NOT NULL,
ADD COLUMN sim_markup_percentage float4 NOT NULL,
ADD COLUMN sales_units float4 NOT NULL,
ADD COLUMN elasticity_bp float4 NOT NULL,
ADD COLUMN promo_elasticity float4 NOT NULL,
ADD COLUMN confidence text NULL;

-- 4. Modify price_point data type from float8 to float4 to match CB client
ALTER TABLE base_pricing_restaurant.bp_last_approved_week_level_simulation 
ALTER COLUMN price_point TYPE float4;

-- 5. Recreate the primary key with new columns (matching CB client)
ALTER TABLE base_pricing_restaurant.bp_last_approved_week_level_simulation 
ADD CONSTRAINT bp_last_approved_week_level_simulation_pkey 
PRIMARY KEY (strategy_id, product_id, channel_id, segment_id, week_start_date, price_point);

-- 6. Drop existing indexes that are no longer needed or need to be recreated
DROP INDEX IF EXISTS base_pricing_restaurant.idx_last_approved_week_product_date;
DROP INDEX IF EXISTS base_pricing_restaurant.idx_last_approved_week_strategy_date_product;

-- 7. Create new indexes to match CB client structure
CREATE INDEX idx_last_approved_week_main ON base_pricing_restaurant.bp_last_approved_week_level_simulation USING btree (product_id, segment_id, week_start_date) INCLUDE (channel_id, min_cost, base_percentage, price_point, sales_units, elasticity_bp, promo_elasticity, confidence);
CREATE INDEX idx_last_approved_week_prod_channel_date ON base_pricing_restaurant.bp_last_approved_week_level_simulation USING btree (product_id, channel_id, week_start_date);
CREATE INDEX idx_last_approved_week_prod_channel_seg ON base_pricing_restaurant.bp_last_approved_week_level_simulation USING btree (product_id, channel_id, segment_id);
CREATE INDEX idx_last_approved_week_prod_channel_seg_date ON base_pricing_restaurant.bp_last_approved_week_level_simulation USING btree (product_id, channel_id, segment_id, week_start_date);
CREATE INDEX idx_last_approved_week_prod_seg ON base_pricing_restaurant.bp_last_approved_week_level_simulation USING btree (product_id, segment_id);
CREATE INDEX idx_last_approved_week_prod_seg_week ON base_pricing_restaurant.bp_last_approved_week_level_simulation USING btree (product_id, segment_id, week_start_date);
CREATE INDEX idx_last_approved_week_product_date ON base_pricing_restaurant.bp_last_approved_week_level_simulation USING btree (product_id, week_start_date);
CREATE INDEX idx_last_approved_week_products ON base_pricing_restaurant.bp_last_approved_week_level_simulation USING btree (product_id);
CREATE INDEX idx_last_approved_week_segments ON base_pricing_restaurant.bp_last_approved_week_level_simulation USING btree (segment_id);
CREATE INDEX idx_last_approved_week_strategy_date_product ON base_pricing_restaurant.bp_last_approved_week_level_simulation USING btree (strategy_id, week_start_date, product_id);