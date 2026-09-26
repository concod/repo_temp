
--liquibase formatted sql
--changeset vaibhav.singh@impactanalytics.co:bp_simulation_store_split_ratio_kvi_1610_vs stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.bp_simulation_store_split_ratio_kvi

Drop table if exists base_pricing_restaurant.bp_simulation_store_split_ratio_kvi;


CREATE TABLE base_pricing_restaurant.bp_simulation_store_split_ratio_kvi (
	product_id int4 NOT NULL,
	store_id int4 NOT NULL,
	channel_id int4 NOT NULL,
	segment_id int4 NOT NULL,
	week_start_date date NOT NULL,
	store_split_ratio float4 NOT NULL
);
CREATE INDEX bp_simulation_store_split_ratio_kvi_idx1 ON base_pricing_restaurant.bp_simulation_store_split_ratio_kvi USING btree (product_id, store_id, channel_id, segment_id, week_start_date);
CREATE INDEX bp_simulation_store_split_ratio_kvi_idx2 ON base_pricing_restaurant.bp_simulation_store_split_ratio_kvi USING btree (product_id, channel_id, segment_id);


--changeset vaibhav.singh@impactanalytics.co:bp_simulation_store_split_ratio_kvi_v2 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.bp_simulation_store_split_ratio_kvi

Drop table if exists base_pricing_restaurant.bp_simulation_store_split_ratio_kvi;

CREATE TABLE base_pricing_restaurant.bp_simulation_store_split_ratio_kvi (
	product_id int4 NOT NULL,
	store_id int4 NOT NULL,
	channel_id int4 NOT NULL,
	segment_id int4 NOT NULL,
	week_start_date date NOT NULL,
	store_split_ratio float4 NOT NULL,
	CONSTRAINT bp_simulation_store_split_ratio_kvi_prk PRIMARY KEY (product_id, store_id, segment_id, week_start_date)
)
PARTITION BY RANGE (week_start_date);
CREATE INDEX idx_bp_simulation_store_split_ratio_kvi_id1 ON base_pricing_restaurant.bp_simulation_store_split_ratio_kvi USING btree (week_start_date);
CREATE INDEX idx_bp_simulation_store_split_ratio_kvi_id2 ON base_pricing_restaurant.bp_simulation_store_split_ratio_kvi USING btree (product_id);
CREATE INDEX idx_bp_simulation_store_split_ratio_kvi_id3 ON base_pricing_restaurant.bp_simulation_store_split_ratio_kvi USING btree (store_id);
CREATE INDEX idx_bp_simulation_store_split_ratio_kvi_id4 ON base_pricing_restaurant.bp_simulation_store_split_ratio_kvi USING btree (channel_id);
CREATE INDEX idx_bp_simulation_store_split_ratio_kvi_id5 ON base_pricing_restaurant.bp_simulation_store_split_ratio_kvi USING btree (segment_id);
CREATE INDEX idx_bp_simulation_store_split_ratio_kvi_main ON base_pricing_restaurant.bp_simulation_store_split_ratio_kvi USING btree (product_id, channel_id, segment_id, week_start_date);


--changeset krithika.s@impactanalytics.co:bp_simulation_store_split_ratio_kvi_new stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_update
--comment: changeset for base_pricing_restaurant.bp_simulation_store_split_ratio_kvi

DROP INDEX IF EXISTS base_pricing_restaurant.idx_bp_simulation_store_split_ratio_kvi_id1;
DROP INDEX IF EXISTS base_pricing_restaurant.idx_bp_simulation_store_split_ratio_kvi_id2;
DROP INDEX IF EXISTS base_pricing_restaurant.idx_bp_simulation_store_split_ratio_kvi_id3;
DROP INDEX IF EXISTS base_pricing_restaurant.idx_bp_simulation_store_split_ratio_kvi_id4;
DROP INDEX IF EXISTS base_pricing_restaurant.idx_bp_simulation_store_split_ratio_kvi_id5;
DROP INDEX IF EXISTS base_pricing_restaurant.idx_bp_simulation_store_split_ratio_kvi_id6;
DROP INDEX IF EXISTS base_pricing_restaurant.idx_bp_simulation_store_split_ratio_kvi_main;

CREATE INDEX idx_bp_simulation_store_split_ratio_kvi_id1
    ON base_pricing_restaurant.bp_simulation_store_split_ratio_kvi USING btree (store_id);