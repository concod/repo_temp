--liquibase formatted sql
--changeset vivek.subramanya@impactanalytics.co:instock_kpi_table stripComments:false splitStatements:false context:MTP-18913 labels:MTP-18913
--comment: initial changeset for instock_kpi_table

CREATE TABLE inventory_smart.instock_kpi_table (
	oh_flag int4 NULL,
	"date" date NULL,
	l0_name varchar NULL,
	l1_name varchar NULL,
	l2_name varchar NULL,
	l3_name varchar NULL,
	l4_name varchar NULL,
	pfs_season varchar NULL,
	pfs_year varchar NULL,
	dtc_season varchar NULL,
	dtc_year varchar NULL,
	brand varchar NULL,
	channel varchar NULL,
	state varchar NULL,
	district varchar NULL,
	climate varchar NULL,
	country varchar NULL,
	city varchar NULL,
	region varchar NULL
);

--changeset vivek.subramanya@impactanalytics.co:instock_kpi_table_columns_added_1 stripComments:false splitStatements:false context:MTP-18913 labels:MTP-18913
--comment: add identifier columns

ALTER TABLE inventory_smart.instock_kpi_table ADD s1_name varchar NULL;
ALTER TABLE inventory_smart.instock_kpi_table ADD s2_id varchar NULL;
ALTER TABLE inventory_smart.instock_kpi_table ADD s3_name varchar NULL;
ALTER TABLE inventory_smart.instock_kpi_table ADD s4_name varchar NULL;
ALTER TABLE inventory_smart.instock_kpi_table ADD store_group varchar NULL;
ALTER TABLE inventory_smart.instock_kpi_table ADD product_group varchar NULL;

--changeset vivek.subramanya@impactanalytics.co:instock_kpi_table_change_group_columns_to_varchar[] stripComments:false splitStatements:false context:MTP-18913 labels:RLIS-178
--comment: change product_group and store_group from varchar to varchar[]

ALTER TABLE inventory_smart.instock_kpi_table ALTER COLUMN product_group TYPE _varchar USING product_group::_varchar;
ALTER TABLE inventory_smart.instock_kpi_table ALTER COLUMN store_group TYPE _varchar USING store_group::_varchar;

--changeset dushant.raut@impactanalytics.co:instock_kpi_table_columns_added_1 stripComments:false splitStatements:false context:Ralph_Lauren_InventorySmart labels:MTP-33853
--comment: add identifier columns

ALTER TABLE inventory_smart.instock_kpi_table ADD foe_year varchar NULL;
ALTER TABLE inventory_smart.instock_kpi_table ADD season varchar NULL;

--changeset ishaan.singh@impactanalytics.co:instock_kpi_table_columns_added stripComments:false splitStatements:false context:Ralph_Lauren_InventorySmart labels:MTP-338
--comment: added rtl_zone_id
ALTER TABLE inventory_smart.instock_kpi_table ADD rtl_zone_id varchar NULL;

--changeset sidhartha.c@impactanalytics.co:instock_kpi_table_dropped_climate_coln stripComments:false splitStatements:false context:Ralph_Lauren_InventorySmart_apac__ labels:MTP-37135
--comment: dropped_climate_column
ALTER TABLE inventory_smart.instock_kpi_table 
DROP COLUMN climate,
DROP COLUMN foe_year;

--changeset sidhartha.c@impactanalytics.co:kpi_tables_add stripComments:false splitStatements:false context:Ralph_Lauren_InventorySmart_apac_3 labels:MTP-37135
--comment: added 2 columns
ALTER TABLE inventory_smart.instock_kpi_table 
ADD forecasting_channel varchar NULL,
ADD retail_region varchar NULL;


--changeset sidhartha.c@impactanalytics.co:kpi_tables_add_ stripComments:false splitStatements:false context:Ralph_Lauren_InventorySmart_apac_4 labels:MTP-37135
--comment: added year
ALTER TABLE inventory_smart.instock_kpi_table 
ADD year varchar NULL;