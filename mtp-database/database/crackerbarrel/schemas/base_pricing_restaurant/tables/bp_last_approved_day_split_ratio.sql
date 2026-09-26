--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_last_approved_day_split_ratio stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.bp_last_approved_day_split_ratio


CREATE TABLE base_pricing_restaurant.bp_last_approved_day_split_ratio (
    strategy_id int4 NOT NULL,
    l2_cid int4 NOT NULL,
    brand_id int4 NOT NULL,
    dates date NOT NULL,
    week_start_date date NOT NULL,
    day_ratio_bnm float8 NOT NULL,
    day_ratio_ecom float8 NOT NULL,
    snapshot_created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    approval_date timestamp NOT NULL,
    created_by int4 NOT NULL,
    CONSTRAINT bp_last_approved_day_split_ratio_pkey PRIMARY KEY (strategy_id, l2_cid, brand_id, dates),
    CONSTRAINT bp_last_approved_day_split_ratio_strategy_fk FOREIGN KEY (strategy_id) REFERENCES base_pricing_restaurant.bp_strategy_master(strategy_id) ON DELETE CASCADE
);

CREATE INDEX idx_last_approved_day_approval_date ON base_pricing_restaurant.bp_last_approved_day_split_ratio USING btree (strategy_id, approval_date);
CREATE INDEX idx_last_approved_day_date_range ON base_pricing_restaurant.bp_last_approved_day_split_ratio USING btree (strategy_id, dates);
CREATE INDEX idx_last_approved_day_l2_brand_date ON base_pricing_restaurant.bp_last_approved_day_split_ratio USING btree (l2_cid, brand_id, dates);
CREATE INDEX idx_last_approved_day_strategy_date_l2_brand ON base_pricing_restaurant.bp_last_approved_day_split_ratio USING btree (strategy_id, dates, l2_cid, brand_id);
CREATE INDEX idx_last_approved_day_strategy_id ON base_pricing_restaurant.bp_last_approved_day_split_ratio USING btree (strategy_id);
CREATE INDEX idx_last_approved_day_week_range ON base_pricing_restaurant.bp_last_approved_day_split_ratio USING btree (strategy_id, week_start_date);


--changeset abhishek.singh@impactanalytics.co:bp_last_approved_day_split_ratio_4 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.bp_last_approved_day_split_ratio_4

-- 1. First, drop the existing primary key constraint and recreate with new columns
ALTER TABLE base_pricing_restaurant.bp_last_approved_day_split_ratio 
DROP CONSTRAINT bp_last_approved_day_split_ratio_pkey;

-- 2. Drop columns that need to be renamed or removed
ALTER TABLE base_pricing_restaurant.bp_last_approved_day_split_ratio 
DROP COLUMN l2_cid,
DROP COLUMN brand_id,
DROP COLUMN day_ratio_bnm,
DROP COLUMN day_ratio_ecom;

-- 3. Add new columns to match CB client structure
ALTER TABLE base_pricing_restaurant.bp_last_approved_day_split_ratio 
ADD COLUMN product_id int4 NOT NULL,
ADD COLUMN channel_id int4 NOT NULL,
ADD COLUMN segment_id int4 NOT NULL,
ADD COLUMN date date NOT NULL,
ADD COLUMN day_split_ratio float4 NOT NULL;

-- 5. Now drop the old dates column
ALTER TABLE base_pricing_restaurant.bp_last_approved_day_split_ratio 
DROP COLUMN dates;

-- 6. Recreate the primary key with new columns
ALTER TABLE base_pricing_restaurant.bp_last_approved_day_split_ratio 
ADD CONSTRAINT bp_last_approved_day_split_ratio_pkey 
PRIMARY KEY (strategy_id, product_id, channel_id, segment_id, week_start_date, date);

-- 7. Drop existing indexes that are no longer relevant
DROP INDEX IF EXISTS base_pricing_restaurant.idx_last_approved_day_l2_brand_date;
DROP INDEX IF EXISTS base_pricing_restaurant.idx_last_approved_day_strategy_date_l2_brand;

-- 8. Create new indexes to match CB client structure
CREATE INDEX idx_last_approved_day_date_range ON base_pricing_restaurant.bp_last_approved_day_split_ratio USING btree (strategy_id, date);
CREATE INDEX idx_last_approved_day_l0_l1_l2_l3_channel ON base_pricing_restaurant.bp_last_approved_day_split_ratio USING btree (product_id, channel_id);
CREATE INDEX idx_last_approved_day_l0_l1_l2_l3_channel_seg ON base_pricing_restaurant.bp_last_approved_day_split_ratio USING btree (product_id, channel_id, segment_id, week_start_date);