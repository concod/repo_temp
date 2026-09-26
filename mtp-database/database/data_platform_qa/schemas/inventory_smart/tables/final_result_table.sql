--liquibase formatted sql
--changeset ashish:final_result_table stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for final_result_table
CREATE TABLE IF NOT EXISTS inventory_smart.final_result_table (
	product_code text NOT NULL,
	store_code text NOT NULL,
	rcl_code int4 NOT NULL,
	wos float4 NULL,
	transit_time float4 NULL,
	safety_stock float4 NULL,
	min_stock float4 NULL,
	max_stock float4 NULL,
	aps float4 NULL,
	ros float4 NULL,
	st float4 NULL
);
