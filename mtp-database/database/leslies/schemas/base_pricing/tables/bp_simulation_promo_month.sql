--liquibase formatted sql
--changeset vaibhav.singh@impactanalytics.co:bp_simulation_promo_month_v1 stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:bp_simulation_promo_month
--comment: changeset for base_pricing.bp_simulation_promo_month

DROP TABLE IF EXISTS base_pricing.bp_simulation_promo_month;

CREATE TABLE base_pricing.bp_simulation_promo_month (
	product_id int4 NOT NULL,
	channel_id int4 NOT NULL,
	segment_id int4 NOT NULL,
	fiscal_month int4 NOT NULL,
	fiscal_month_name text NOT NULL,
	fiscal_year int4 NOT NULL,
	promo_source int4 NOT NULL,
	reference_price float4 NULL,
	weighted_promo_percent float4 NULL,
	effective_reference_price float4 NULL,
	start_date date NOT NULL,
	end_date date NOT NULL
)
PARTITION BY RANGE (start_date);
