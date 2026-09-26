--liquibase formatted sql
--changeset liquibase:current_finalized_promo_products stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for current_finalized_promo_products

CREATE TABLE price_promo_opt.current_finalized_promo_products (
	promo_id int4 NULL,
	product_id int4 NULL,
	recommendation_date date NULL
);
CREATE INDEX current_final_agg_promo_id_idx ON price_promo_opt.current_finalized_promo_products USING btree (promo_id);
CREATE INDEX current_final_agg_product_id_idx ON price_promo_opt.current_finalized_promo_products USING btree (product_id);

--changeset liquibase:current_finalized_promo_products_v2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for current_finalized_promo_products

ALTER TABLE price_promo_opt.current_finalized_promo_products
ADD COLUMN s0_id int4 NULL
;
ALTER TABLE price_promo_opt.current_finalized_promo_products
ADD COLUMN s1_id int4 NULL
;
CREATE INDEX current_final_agg_promo_product_channel_idx ON price_promo_opt.current_finalized_promo_products USING btree (promo_id, product_id, s0_id, s1_id);

--changeset liquibase:current_finalized_promo_products_v3 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: drop index and s1_id column, add new columns

-- Drop existing index
DROP INDEX IF EXISTS price_promo_opt.current_final_agg_promo_product_channel_idx;

-- Drop s1_id column
ALTER TABLE price_promo_opt.current_finalized_promo_products
DROP COLUMN IF EXISTS s1_id;

-- Add new columns
ALTER TABLE price_promo_opt.current_finalized_promo_products
ADD COLUMN store_id int4 NULL,
ADD COLUMN store_hierarchy varchar(255) NULL,
ADD COLUMN s3_id int4 NULL,
ADD COLUMN customer_id int2 NULL,
ADD COLUMN c0_id int2 NULL;

-- Create new indexes
CREATE INDEX current_final_promo_product_s0_s3_c0_idx ON price_promo_opt.current_finalized_promo_products USING btree (promo_id,product_id, s0_id, s3_id, c0_id);
CREATE INDEX current_final_promo_product_store_idx ON price_promo_opt.current_finalized_promo_products USING btree (promo_id, product_id, store_id);

--changeset user:current_finalized_promo_products_add_event_id stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: Add event_id column

ALTER TABLE price_promo_opt.current_finalized_promo_products
ADD COLUMN event_id int4 NULL;


