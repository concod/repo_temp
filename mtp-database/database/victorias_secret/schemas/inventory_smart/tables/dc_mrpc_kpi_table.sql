--liquibase formatted sql
--changeset vivek.subramanya@impactanalytics.co:dc_mrpc_kpi_table stripComments:false splitStatements:false context:MTP-18913 labels:MTP-18913
--comment: initial changeset for dc_mrpc_kpi_table

CREATE TABLE inventory_smart.dc_mrpc_kpi_table (
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
	store_oh int4 NULL,
	dc_oh int4 NULL,
	dc_oh_cost int4 NULL,
	store_oh_cost int4 NULL,
	mrpc int4 NULL,
	mrpc_cost int4 NULL
);

--changeset vivek.subramanya@impactanalytics.co:dc_mrpc_kpi_table_csp_added stripComments:false splitStatements:false context:MTP-18913 labels:MTP-18913
--comment: add csp column

alter table inventory_smart.dc_mrpc_kpi_table add column csp int4 null;

--changeset vivek.subramanya@impactanalytics.co:dc_mrpc_kpi_table_columns_added_1 stripComments:false splitStatements:false context:MTP-18913 labels:MTP-18913
--comment: add identifier columns

ALTER TABLE inventory_smart.dc_mrpc_kpi_table ADD s1_name varchar NULL;
ALTER TABLE inventory_smart.dc_mrpc_kpi_table ADD s2_id varchar NULL;
ALTER TABLE inventory_smart.dc_mrpc_kpi_table ADD s3_name varchar NULL;
ALTER TABLE inventory_smart.dc_mrpc_kpi_table ADD s4_name varchar NULL;
ALTER TABLE inventory_smart.dc_mrpc_kpi_table ADD store_group varchar NULL;
ALTER TABLE inventory_smart.dc_mrpc_kpi_table ADD product_group varchar NULL;
