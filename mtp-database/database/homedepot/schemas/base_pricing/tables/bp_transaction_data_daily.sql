--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_transaction_data_daily_v2 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_transaction_data_daily_v2

CREATE TABLE base_pricing.bp_transaction_data_daily (
	id bigserial NOT NULL,
	transaction_date date NOT NULL,
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
	CONSTRAINT bp_bp_transaction_data_daily_pkey PRIMARY KEY (transaction_date, product_id, store_id, customer_type)
)
PARTITION BY RANGE (transaction_date);