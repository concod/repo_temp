--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_baseline_sales_granular stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.bp_baseline_sales_granular

CREATE TABLE base_pricing_restaurant.bp_baseline_sales_granular (
	product_id int4 NOT NULL,
	store_id int4 NOT NULL,
	segment_id int4 NOT NULL,
	"date" date NOT NULL,
	week_start_date date NOT NULL,
	channel_id int4 NOT NULL,
	segment_cost numeric NOT NULL,
	segment_price numeric NOT NULL,
	sales_units float8 NOT NULL
)
PARTITION BY LIST (week_start_date);