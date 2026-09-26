--liquibase formatted sql
--changeset vaibhav.singh@impactanalytics.co:bp_transaction_data_monthly_v1 stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:bp_transaction_data_monthly
--comment: changeset for base_pricing.bp_transaction_data_monthly

DROP TABLE IF EXISTS base_pricing.bp_transaction_data_monthly;

CREATE TABLE base_pricing.bp_transaction_data_monthly (
	fiscal_year int4 NULL,
	fiscal_month int4 NULL,
	fiscal_month_name varchar NULL,
	start_date date NOT NULL,
	end_date date NULL,
	product_id int4 NOT NULL,
	store_id int4 NOT NULL,
	channel_id int4 NULL,
	price_zone varchar NULL,
	segment_id int4 NOT NULL,
	transactions int4 NULL,
	sales_units int8 NULL,
	total_base_cost float8 NULL,
	total_additional_cost float8 NULL,
	sourced_unit_price float8 NULL,
	retail_unit_price float8 NULL,
	total_sales_price float8 NULL,
	total_revenue float8 NULL,
	total_margin float8 NULL,
	total_contri_margin float8 NULL,
	id bigserial NOT NULL,
	CONSTRAINT bp_transaction_data_monthly_pkey PRIMARY KEY (start_date, product_id, store_id, segment_id)
)
PARTITION BY RANGE (start_date);
