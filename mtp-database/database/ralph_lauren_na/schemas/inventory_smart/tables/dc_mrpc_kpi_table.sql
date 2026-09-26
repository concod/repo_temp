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


--changeset vivek.subramanya@impactanalytics.co:dc_mrpc_kpi_table_change_group_columns_to_varchar[] stripComments:false splitStatements:false context:MTP-18913 labels:RLIS-178
--comment: change product_group and store_group from varchar to varchar[]

ALTER TABLE inventory_smart.dc_mrpc_kpi_table ALTER COLUMN store_group TYPE _varchar USING store_group::_varchar;
ALTER TABLE inventory_smart.dc_mrpc_kpi_table ALTER COLUMN product_group TYPE _varchar USING product_group::_varchar;

--changeset vivek.subramanya@impactanalytics.co:dc_mrpc_kpi_table_new_columns stripComments:false splitStatements:false context:MTP-27291 labels:MTP-27291
--comment: added quantities from MTP-27291,MTP-27293,MTP-27295

ALTER TABLE inventory_smart.dc_mrpc_kpi_table ADD dc_oo int4 NULL;
ALTER TABLE inventory_smart.dc_mrpc_kpi_table ADD total_allocated_qty int4 NULL;
ALTER TABLE inventory_smart.dc_mrpc_kpi_table ADD store_oo int4 NULL;
ALTER TABLE inventory_smart.dc_mrpc_kpi_table ADD store_it int4 NULL;
ALTER TABLE inventory_smart.dc_mrpc_kpi_table ADD dc_it int4 NULL;
ALTER TABLE inventory_smart.dc_mrpc_kpi_table ADD dc_csp int4 NULL;

--changeset vivek.subramanya@impactanalytics.co:dc_mrpc_kpi_table_reserve_added stripComments:false splitStatements:false context:MTP-27061 labels:MTP-27061
--comment: added quantities from MTP-27061

ALTER TABLE inventory_smart.dc_mrpc_kpi_table ADD reserved_total int4 NULL;

--changeset pooja.shekar@impactanalytics.co:dc_mrpc_kpi_table_available_dc_oh_added stripComments:false splitStatements:false context:MTP-27061 labels:MTP-27061
--comment: added quantities from MTP-27061

ALTER TABLE inventory_smart.dc_mrpc_kpi_table ADD available_dc_oh float8 NULL;

--changeset vivek.subramanya@impactanalytics.co:dc_mrpc_kpi_table_filters_added stripComments:false splitStatements:false context:MTP-35067 labels:MTP-35067
--comment: added coord group desc and source code from MTP-27061

ALTER TABLE inventory_smart.dc_mrpc_kpi_table ADD rtl_coordinate_group_desc varchar NULL;
ALTER TABLE inventory_smart.dc_mrpc_kpi_table ADD source_code varchar NULL;
