--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_transaction_data_weekly_v6 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.bp_transaction_data_weekly_v6

DROP TABLE IF EXISTS base_pricing_restaurant.bp_transaction_data_weekly CASCADE;
CREATE TABLE base_pricing_restaurant.bp_transaction_data_weekly (
	id bigserial NOT NULL,
	week_start_date date NOT NULL,
	product_id int4 NOT NULL,
	store_id int4 NOT NULL,
	channel varchar NOT NULL,
	price_zone varchar NULL,
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
	CONSTRAINT bp_transaction_data_weekly_pkey PRIMARY KEY (week_start_date, product_id, store_id, customer_type)
)
PARTITION BY RANGE (week_start_date);


--changeset kumaran.k@impactanalytics.co:bp_transaction_data_weekly_v7 stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:tb_product_hierarchy_combination_version
--comment: Altering bp_transaction_data_weekly_v7

ALTER TABLE base_pricing_restaurant.bp_transaction_data_weekly
RENAME COLUMN customer_type TO segment_id;

ALTER TABLE base_pricing_restaurant.bp_transaction_data_weekly
ALTER COLUMN segment_id TYPE INT4
USING segment_id::INT4;


--changeset abhishek.singh@impactanalytics.co:bp_transaction_data_weekly_v8 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.bp_transaction_data_weekly_v8

drop table if exists base_pricing_restaurant.bp_transaction_data_weekly;

CREATE TABLE base_pricing_restaurant.bp_transaction_data_weekly (
	id bigserial NOT NULL,
	week_start_date date NOT NULL,
	product_id int4 NOT NULL,
	store_id int4 NOT NULL,
	channel_id int4 NOT NULL,
	price_zone varchar NULL,
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
	CONSTRAINT bp_transaction_data_weekly_pkey PRIMARY KEY (week_start_date, product_id, store_id, segment_id)
)
PARTITION BY RANGE (week_start_date);
CREATE INDEX idx_bp_transaction_data_weekly_id1 ON base_pricing_restaurant.bp_transaction_data_weekly USING btree (product_id, store_id, segment_id, week_start_date);
CREATE INDEX idx_bp_transaction_data_weekly_id2 ON base_pricing_restaurant.bp_transaction_data_weekly USING btree (week_start_date);
CREATE INDEX idx_bp_transaction_data_weekly_id3 ON base_pricing_restaurant.bp_transaction_data_weekly USING btree (product_id);
CREATE INDEX idx_bp_transaction_data_weekly_id4 ON base_pricing_restaurant.bp_transaction_data_weekly USING btree (store_id);
CREATE INDEX idx_bp_transaction_data_weekly_id5 ON base_pricing_restaurant.bp_transaction_data_weekly USING btree (segment_id);


--changeset krithika.s@impactanalytics.co:bp_transaction_data_weekly_new stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_update
--comment: changeset for base_pricing_restaurant.bp_transaction_data_weekly

DROP INDEX IF EXISTS base_pricing_restaurant.idx_bp_transaction_data_weekly_id1;
DROP INDEX IF EXISTS base_pricing_restaurant.idx_bp_transaction_data_weekly_id2;
DROP INDEX IF EXISTS base_pricing_restaurant.idx_bp_transaction_data_weekly_id3;
DROP INDEX IF EXISTS base_pricing_restaurant.idx_bp_transaction_data_weekly_id4;
DROP INDEX IF EXISTS base_pricing_restaurant.idx_bp_transaction_data_weekly_id5;

CREATE INDEX idx_bp_transaction_data_weekly_main
    ON base_pricing_restaurant.bp_transaction_data_weekly USING btree (product_id, store_id, segment_id);
CREATE INDEX idx_bp_transaction_data_weekly_id1
    ON base_pricing_restaurant.bp_transaction_data_weekly USING btree (product_id);
CREATE INDEX idx_bp_transaction_data_weekly_id2
    ON base_pricing_restaurant.bp_transaction_data_weekly USING btree (store_id);
CREATE INDEX idx_bp_transaction_data_weekly_id3
    ON base_pricing_restaurant.bp_transaction_data_weekly USING btree (segment_id);



--changeset yashraj.jha@impactanalytics.co:bp_transaction_data_weekly_3 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_update
--comment: changeset for base_pricing_restaurant.bp_transaction_data_weekly_3
ALTER TABLE base_pricing_restaurant.bp_transaction_data_weekly 
ALTER COLUMN sales_units TYPE float8;