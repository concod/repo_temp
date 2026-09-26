--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_transaction_data_daily stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_transaction_data_daily

CREATE TABLE base_pricing.bp_transaction_data_daily (
	id bigserial NOT NULL,
	transaction_date date NOT NULL,
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
	CONSTRAINT bp_bp_transaction_data_daily_pkey PRIMARY KEY (transaction_date, week_start_date, product_id, store_id, segment_id)
)
PARTITION BY RANGE (week_start_date);

CREATE INDEX idx_bp_transaction_data_daily_id1 ON  base_pricing.bp_transaction_data_daily USING btree (product_id, store_id, segment_id, week_start_date);
CREATE INDEX idx_bp_transaction_data_daily_id2 ON  base_pricing.bp_transaction_data_daily USING btree (transaction_date);
CREATE INDEX idx_bp_transaction_data_daily_id3 ON  base_pricing.bp_transaction_data_daily USING btree (week_start_date);
CREATE INDEX idx_bp_transaction_data_daily_id4 ON  base_pricing.bp_transaction_data_daily USING btree (product_id);
CREATE INDEX idx_bp_transaction_data_daily_id5 ON  base_pricing.bp_transaction_data_daily USING btree (store_id);
CREATE INDEX idx_bp_transaction_data_daily_id6 ON  base_pricing.bp_transaction_data_daily USING btree (segment_id);