--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_simulation_promo_week_with_store_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: issue fix on bp_simulation_promo_week_with_store_1

CREATE TABLE base_pricing_restaurant.bp_simulation_promo_week_with_store (
	product_id int4 NOT NULL,
	store_id int4 NOT NULL,
	channel_id int4 NOT NULL,
	segment_id int4 NOT NULL,
	week_start_date date NOT NULL,
	promo_source int4 NOT NULL,
	reference_price float4 NULL,
	weighted_promo_percent float4 NULL,
	effective_reference_price float4 NULL,
	CONSTRAINT bp_simulation_promo_week_with_store_prk PRIMARY KEY (product_id, store_id, segment_id, week_start_date)
)
PARTITION BY RANGE (week_start_date);
CREATE INDEX idx_bp_simulation_promo_week_with_store_id1 ON  base_pricing_restaurant.bp_simulation_promo_week_with_store USING btree (week_start_date);
CREATE INDEX idx_bp_simulation_promo_week_with_store_id2 ON  base_pricing_restaurant.bp_simulation_promo_week_with_store USING btree (product_id);
CREATE INDEX idx_bp_simulation_promo_week_with_store_id3 ON  base_pricing_restaurant.bp_simulation_promo_week_with_store USING btree (store_id);
CREATE INDEX idx_bp_simulation_promo_week_with_store_id5 ON  base_pricing_restaurant.bp_simulation_promo_week_with_store USING btree (segment_id);
CREATE INDEX idx_bp_simulation_promo_week_with_store_main ON  base_pricing_restaurant.bp_simulation_promo_week_with_store USING btree (product_id, store_id, segment_id, week_start_date);


--changeset krithika.s@impactanalytics.co:bp_simulation_promo_week_with_store_new stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_update
--comment: changeset for base_pricing_restaurant.bp_simulation_promo_week_with_store


DROP INDEX IF EXISTS base_pricing_restaurant.idx_bp_simulation_promo_week_with_store_id1;
DROP INDEX IF EXISTS base_pricing_restaurant.idx_bp_simulation_promo_week_with_store_id2;
DROP INDEX IF EXISTS base_pricing_restaurant.idx_bp_simulation_promo_week_with_store_id3;
DROP INDEX IF EXISTS base_pricing_restaurant.idx_bp_simulation_promo_week_with_store_id5;
DROP INDEX IF EXISTS base_pricing_restaurant.idx_bp_simulation_promo_week_with_store_main;

CREATE INDEX idx_bp_simulation_promo_week_with_store_id1
    ON base_pricing_restaurant.bp_simulation_promo_week_with_store USING btree (product_id);