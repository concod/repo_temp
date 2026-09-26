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
	
--changeset vivek.subramanya@impactanalytics.co:forecast_kpi_table_filters_added stripComments:false splitStatements:false context:MTP-35067 labels:MTP-35067
--comment: added coord group desc and source code from MTP-35067
	
ALTER TABLE inventory_smart.forecast_kpi_table ADD rtl_coordinate_group_desc varchar NULL;
ALTER TABLE inventory_smart.forecast_kpi_table ADD source_code varchar NULL;

--changeset ishaan.singh@impactanalytics.co:forecast_kpi_table_filters_added stripComments:false splitStatements:false context:MTP-35067 labels:MTP-35067
--comment: added lw_op_oh si_nr and si_dr 
	
ALTER TABLE inventory_smart.forecast_kpi_table ADD lw_op_oh varchar NULL;
ALTER TABLE inventory_smart.forecast_kpi_table ADD si_nr varchar NULL;
ALTER TABLE inventory_smart.forecast_kpi_table ADD si_dr varchar NULL;

--changeset ishaan.singh@impactanalytics.co:forecast_kpi_table_filters_added_changed stripComments:false splitStatements:false context:MTP-35067 labels:MTP-35067_1
--comment: changed datatype lw_op_oh si_nr and si_dr to float4_1
ALTER TABLE inventory_smart.forecast_kpi_table ALTER COLUMN lw_op_oh TYPE float4 USING lw_op_oh::float4;
ALTER TABLE inventory_smart.forecast_kpi_table ALTER COLUMN si_nr TYPE float4 USING si_nr::float4;
ALTER TABLE inventory_smart.forecast_kpi_table ALTER COLUMN si_dr TYPE float4 USING si_dr::float4; 

--changeset ishaan.singh@impactanalytics.co:forecast_kpi_table_columns_added stripComments:false splitStatements:false context:Ralph_Lauren_InventorySmart labels:MTP-338
--comment: added si_nr_article,si_dr_article cols
ALTER TABLE inventory_smart.forecast_kpi_table ADD si_nr_article float8 NULL;
ALTER TABLE inventory_smart.forecast_kpi_table ADD si_dr_article float8 NULL;

