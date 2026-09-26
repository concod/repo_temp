--liquibase formatted sql
--changeset liquibase:product_pricing_details stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_pricing_details - added serial 4

CREATE TABLE price_promo.product_pricing_details (
	product_id int4 NULL,
	currency_id int4 NULL,
	msrp float4 NULL,
	current_price float4 NULL,
	cost_usd float4 NULL,
	"cost" float4 NULL
);