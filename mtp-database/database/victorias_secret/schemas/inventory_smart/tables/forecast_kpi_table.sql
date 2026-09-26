--liquibase formatted sql
--changeset vivek.subramanya@impactanalytics.co:forecast_kpi_table stripComments:false splitStatements:false context:MTP-18913 labels:MTP-18913
--comment: initial changeset for forecast_kpi_table

CREATE TABLE inventory_smart.forecast_kpi_table (
	l0_name varchar NULL,
	l1_name varchar NULL,
	l2_name varchar NULL,
	l3_name varchar NULL,
	l4_name varchar NULL,
	dtc_year varchar NULL,
	dtc_season varchar NULL,
	pfs_season varchar NULL,
	pfs_year varchar NULL,
	brand varchar NULL,
	channel varchar NULL,
	climate varchar NULL,
	city varchar NULL,
	region varchar NULL,
	district varchar NULL,
	state varchar NULL,
	country varchar NULL,
	qty_lw int4 NULL,
	qty_l4w int4 NULL,
	qty_l8w int4 NULL,
	fwos float4 NULL,
	size_instock_percentage float4 NULL,
	sell_thru_rate float4 NULL,
	stock_to_sales_ratio float4 NULL
);

--changeset vivek.subramanya@impactanalytics.co:forecast_kpi_table_columns_added_1 stripComments:false splitStatements:false context:MTP-18913 labels:MTP-18913
--comment: add identifier columns

ALTER TABLE inventory_smart.forecast_kpi_table ADD s1_name varchar NULL;
ALTER TABLE inventory_smart.forecast_kpi_table ADD s2_id varchar NULL;
ALTER TABLE inventory_smart.forecast_kpi_table ADD s3_name varchar NULL;
ALTER TABLE inventory_smart.forecast_kpi_table ADD s4_name varchar NULL;
ALTER TABLE inventory_smart.forecast_kpi_table ADD store_group varchar NULL;
ALTER TABLE inventory_smart.forecast_kpi_table ADD product_group varchar NULL;
