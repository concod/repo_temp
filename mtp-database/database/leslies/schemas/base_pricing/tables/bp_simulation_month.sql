--liquibase formatted sql
--changeset vaibhav.singh@impactanalytics.co:bp_simulation_month_v1 stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:bp_simulation_month
--comment: changeset for base_pricing.bp_simulation_month

DROP TABLE IF EXISTS base_pricing.bp_simulation_month;

CREATE TABLE base_pricing.bp_simulation_month (
	product_id int4 NOT NULL,
	channel_id int4 NOT NULL,
	segment_id int4 NOT NULL,
	fiscal_month int4 NOT NULL,
	fiscal_month_name text NOT NULL,
	fiscal_year int4 NOT NULL,
	min_cost float4 NOT NULL,
	base_percentage float4 NOT NULL,
	sim_markup_percentage float4 NOT NULL,
	price_point float4 NOT NULL,
	sales_units float4 NOT NULL,
	elasticity_bp float4 NOT NULL,
	promo_elasticity float4 NOT NULL,
	start_date date NOT NULL,
	end_date date NOT NULL
)
PARTITION BY RANGE (start_date);
