--liquibase formatted sql
--changeset liquibase:instock_kpi_table stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for instock_kpi_table

CREATE TABLE if not EXISTS inventory_smart.instock_kpi_table (
	article text NULL,
	store_code text NULL,
	channel text NULL,
	l0_name text NULL,
	l1_name text NULL,
	l2_name text NULL,
	l3_name text NULL,
	l4_name text NULL,
	l5_name text NULL,
	oh float8 NULL,
	oo float8 NULL,
	it float8 NULL,
	last_week_sales float8 NULL,
	last_4_week_sales float8 NULL,
	last_8_week_sales float8 NULL,
	size_integrity float8 NULL,
	dc_size_integrity_oh float8 NULL,
	dc_size_integrity_oh_oo_it float8 NULL,
	wos_oh float8 NULL,
	wos_oh_it float8 NULL,
	wos_oh_it_oo float8 NULL,
	oh_dc float8 NULL,
	oo_dc float8 NULL,
	it_dc float8 NULL,
	store_flag int8 NULL
);


--changeset aman.lakkoju:Added lw_st and dc_wos_oh columns stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Added lw_st and dc_wos_oh columns

alter table inventory_smart.instock_kpi_table add column if not exists  dc_wos_oh float8 null;
alter table inventory_smart.instock_kpi_table add column if not exists  lw_st float8 null;
