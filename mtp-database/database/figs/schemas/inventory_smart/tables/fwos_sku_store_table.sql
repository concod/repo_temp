-- liquibase formatted sql
-- changeset keerthi.vardhani@impactanalytics.co:fwos_sku_store_table stripComments:false splitStatements:false context:db_sync labels:fwos_sku_store_table
-- comment: initial changeset for fwos_sku_store_table
CREATE TABLE inventory_smart.fwos_sku_store_table (
    l0_name varchar NOT NULL,
	product_code varchar NOT NULL,
	store_code varchar NOT NULL,
	wos_oh_oo_it float4 NULL,
	wos_oh_oo float4 NULL,
	wos_oh_it float4 NULL,
	wos_oh float4 NULL,
	str_dc_wos float4 NULL,
	dc_wos_oh float4 NULL,
	dc_wos_oh_oo_it float4 NULL,
	dc_wos_oh_oo float4 NULL,
	dc_wos_oh_it float4 NULL,
	str_inv int4 NULL,
	str_oh int4 NULL,
	str_oo_unt int4 NULL,
	str_it int4 NULL,
	str_oh_oo int4 NULL,
	str_oh_it int4 NULL,
	ata int4 NULL,
	dc_oh int4 NULL,
	dc_oo int4 NULL,
	total_dc_inv int4 NULL,
	tot_str_inv int4 NULL,
	total_predicted_qty float4 null,
	CONSTRAINT fwos_sku_store_table_un UNIQUE (l0_name, product_code, store_code)
) partition by list (l0_name);
