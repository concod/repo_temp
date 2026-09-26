--liquibase formatted sql
--changeset samarjit.mazumder@impactanalytics.co:fwos_sku_store_table stripComments:false splitStatements:false context:Release_1_0 labels:briscoes_fwos_sku_store_table
--comment: initial changeset for fwos_sku_store_table

CREATE TABLE IF NOT EXISTS inventory_smart.fwos_sku_store_table (
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
	str_inv float4 NULL,
	str_oh float4 NULL,
	str_oo_unt float4 NULL,
	str_it float4 NULL,
	str_oh_oo float4 NULL,
	str_oh_it float4 NULL,
	ata int4 NULL,
	dc_oh int4 NULL,
	dc_oo int4 NULL,
	total_dc_inv int4 NULL,
	tot_str_inv float4 NULL,
	total_predicted_qty float4 NULL,
	CONSTRAINT fwos_sku_store_table_un UNIQUE (product_code, store_code)
);
