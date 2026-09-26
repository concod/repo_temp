--liquibase formatted sql
--changeset liquibase:instock_kpi_vs_intl stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for instock_kpi

DROP TABLE IF EXISTS inventory_smart.instock_kpi_table;

CREATE TABLE IF NOT EXISTS inventory_smart.instock_kpi_table (
	article varchar NOT NULL,
	store_code varchar NOT NULL,
	oh int4 NULL,
	oo int4 NULL,
	it int4 NULL,
	wip int4 NULL,
	last_week_sales float4 NULL,
	last_4_week_sales float4 NULL,
	last_8_week_sales float4 NULL,
	wos_oh float4 NULL,
	wos_oh_it float4 NULL,
	wos_oh_it_oo float4 NULL,
	accuracy_bucket varchar NULL,
	store_tier varchar NULL,
	store_name varchar NULL,
	store_category varchar NULL,
	store_flag int4 NULL,
	s1_name varchar NULL,
	s3_name varchar NULL,
	s4_name varchar NULL,
	l0_name varchar NULL,
	l3_name varchar NULL,
	l4_name varchar NULL,
	l5_name varchar NULL,
	l6_name varchar NULL,
	l7_name varchar NULL,
	collection varchar NULL,
	masterstyle_descr varchar NULL,
	subbrand_code_desc varchar NULL,
	product_lifecycle varchar NULL,
	channel varchar NULL,
	oh_dc float4 NULL,
	oo_dc float4 NULL,
	it_dc float4 NULL,
	size_integrity_oh float4 NULL,
	size_integrity_oh_oo_it float4 NULL,
	outbound_size_integrity_oh float4 NULL,
	outbound_size_integrity_oh_oo_it float4 NULL,
	us_dc_flag int4 NULL,
	CONSTRAINT instock_kpi_table_pk PRIMARY KEY (article, store_code),
	CONSTRAINT instock_kpi_table_store_code_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE
);

