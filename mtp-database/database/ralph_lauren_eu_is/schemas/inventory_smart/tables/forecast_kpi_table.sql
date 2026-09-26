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

--changeset vivek.subramanya@impactanalytics.co:forecast_kpi_table_change_group_columns_to_varchar[] stripComments:false splitStatements:false context:MTP-18913 labels:RLIS-178
--comment: change product_group and store_group from varchar to varchar[]

ALTER TABLE inventory_smart.forecast_kpi_table ALTER COLUMN store_group TYPE _varchar USING store_group::_varchar;
ALTER TABLE inventory_smart.forecast_kpi_table ALTER COLUMN product_group TYPE _varchar USING product_group::_varchar;

--changeset vivek.subramanya@impactanalytics.co:forecast_kpi_table_add_wos_columns stripComments:false splitStatements:false context:MTP-18913 labels:RLIS-178
--comment: adding wos related columns

ALTER TABLE inventory_smart.forecast_kpi_table ADD total_forecast int4 NULL;
ALTER TABLE inventory_smart.forecast_kpi_table ADD ros int4 NULL;
ALTER TABLE inventory_smart.forecast_kpi_table ADD oh int4 NULL;
	

--changeset dushant.raut@impactanalytics.co:forecast_kpi_table_columns_added_1 stripComments:false splitStatements:false context:Ralph_Lauren_InventorySmart labels:MTP-33853
--comment: add identifier columns
ALTER TABLE inventory_smart.forecast_kpi_table ADD foe_year varchar NULL;
ALTER TABLE inventory_smart.forecast_kpi_table ADD season varchar NULL;

--changeset dushant.raut@impactanalytics.co:forecast_kpi_table_columns_added_aggregated_6w_forecast stripComments:false splitStatements:false context:Ralph_Lauren_InventorySmart labels:MTP-33853
--comment: added aggregated_6w_forecast column
ALTER TABLE inventory_smart.forecast_kpi_table ADD aggregated_6w_forecast float8 NULL; 

--changeset ishaan.singh@impactanalytics.co:forecast_kpi_table_columns_added stripComments:false splitStatements:false context:Ralph_Lauren_InventorySmart labels:MTP-33853
--comment: added si_nr,si_dr,lw_op_oh,si_nr_article,si_dr_article column
ALTER TABLE inventory_smart.forecast_kpi_table ADD si_nr float8 NULL;
ALTER TABLE inventory_smart.forecast_kpi_table ADD si_dr float8 NULL;
ALTER TABLE inventory_smart.forecast_kpi_table ADD lw_op_oh float8 NULL;
ALTER TABLE inventory_smart.forecast_kpi_table ADD si_nr_article float8 NULL;
ALTER TABLE inventory_smart.forecast_kpi_table ADD si_dr_article float8 NULL;

--changeset ishaan.singh@impactanalytics.co:forecast_kpi_table_column_added stripComments:false splitStatements:false context:Ralph_Lauren_InventorySmart labels:MTP-33
--comment: added rtl_zone_id new col 
ALTER TABLE inventory_smart.forecast_kpi_table ADD rtl_zone_id varchar NULL;    

