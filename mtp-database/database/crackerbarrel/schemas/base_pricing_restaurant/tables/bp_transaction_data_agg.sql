--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_transaction_data_agg_5 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.bp_transaction_data_agg_new

CREATE TABLE base_pricing_restaurant.bp_transaction_data_agg (
	id bigserial NOT NULL,
	start_date date NOT NULL,
	end_date date NOT NULL,
	product_id int4 NOT NULL,
	store_id int4 NOT NULL,
	channel varchar NOT NULL,
	customer_type varchar NOT NULL,
	transactions int4 NOT NULL,
	sales_units int8 NOT NULL,
	total_base_cost float8 NOT NULL,
	total_additional_cost float8 NOT NULL,
	sourced_unit_price float8 NOT NULL,
	retail_unit_price float8 NOT NULL,
	total_sales_price float8 NOT NULL,
	total_revenue float8 NOT NULL,
	total_margin float8 NOT NULL,
	total_contri_margin float8 NOT NULL,
	CONSTRAINT bp_transaction_data_agg_pkey PRIMARY KEY (product_id, store_id, customer_type, start_date)
)
PARTITION BY RANGE (start_date);


--changeset kumaran.k@impactanalytics.co:bp_transaction_data_agg_v6 stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:tb_product_hierarchy_combination_version
--comment: Altering bp_transaction_data_agg_v6

ALTER TABLE base_pricing_restaurant.bp_transaction_data_agg
RENAME COLUMN customer_type TO segment_id;

--changeset abhishek.singh@impactanalytics.co:bp_transaction_data_agg_v7 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.bp_transaction_data_agg_v7

drop table if exists base_pricing_restaurant.bp_transaction_data_agg;


CREATE TABLE base_pricing_restaurant.bp_transaction_data_agg (
	id bigserial NOT NULL,
	start_date date NOT NULL,
	end_date date NOT NULL,
	product_id int4 NOT NULL,
	store_id int4 NOT NULL,
	channel_id int4 NOT NULL,
	segment_id int4 NOT NULL,
	transactions int4 NOT NULL,
	sales_units int8 NOT NULL,
	total_base_cost float8 NOT NULL,
	total_additional_cost float8 NOT NULL,
	sourced_unit_price float8 NOT NULL,
	retail_unit_price float8 NOT NULL,
	total_sales_price float8 NOT NULL,
	total_revenue float8 NOT NULL,
	total_margin float8 NOT NULL,
	total_contri_margin float8 NOT NULL,
	CONSTRAINT bp_transaction_data_agg_pkey PRIMARY KEY (product_id, store_id, segment_id)
);
CREATE INDEX idx_bp_transaction_data_agg_id1 ON base_pricing_restaurant.bp_transaction_data_agg USING btree (product_id, store_id, segment_id);
CREATE INDEX idx_bp_transaction_data_agg_id2 ON base_pricing_restaurant.bp_transaction_data_agg USING btree (product_id);
CREATE INDEX idx_bp_transaction_data_agg_id3 ON base_pricing_restaurant.bp_transaction_data_agg USING btree (store_id);
CREATE INDEX idx_bp_transaction_data_agg_id4 ON base_pricing_restaurant.bp_transaction_data_agg USING btree (segment_id);


--changeset krithika.s@impactanalytics.co:bp_transaction_data_agg_new stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_update
--comment: changeset for base_pricing_restaurant.bp_transaction_data_agg

DROP INDEX IF EXISTS base_pricing_restaurant.idx_bp_transaction_data_agg_id1;
DROP INDEX IF EXISTS base_pricing_restaurant.idx_bp_transaction_data_agg_id2;
DROP INDEX IF EXISTS base_pricing_restaurant.idx_bp_transaction_data_agg_id3;
DROP INDEX IF EXISTS base_pricing_restaurant.idx_bp_transaction_data_agg_id4;


CREATE INDEX idx_bp_transaction_data_agg_main
    ON base_pricing_restaurant.bp_transaction_data_agg USING btree (product_id, store_id, segment_id);
CREATE INDEX idx_bp_transaction_data_agg_id1
    ON base_pricing_restaurant.bp_transaction_data_agg USING btree (product_id);
CREATE INDEX idx_bp_transaction_data_agg_id2
    ON base_pricing_restaurant.bp_transaction_data_agg USING btree (store_id);
CREATE INDEX idx_bp_transaction_data_agg_id3
    ON base_pricing_restaurant.bp_transaction_data_agg USING btree (segment_id);


--changeset yashraj.jha@impactanalytics.co:bp_transaction_data_agg_3 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_update
--comment: changeset for base_pricing_restaurant.bp_transaction_data_agg_3
ALTER TABLE base_pricing_restaurant.bp_transaction_data_agg 
ALTER COLUMN sales_units TYPE float8;