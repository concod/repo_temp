--liquibase formatted sql
--changeset anish.a@impactanalytics.co:fwos_sku_store_table_version_tillys stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts
--comment: initial changeset for fwos_sku_store_table_version_tillys
-- inventory_smart.fwos_sku_store_table_version definition

-- Drop table

-- DROP TABLE inventory_smart.fwos_sku_store_table_version;
CREATE TABLE inventory_smart.fwos_sku_store_table_version (
	version_code int4 NOT NULL,
	article varchar NULL,
	"date" date NULL,
	fiscal_year int4 NULL,
	it float8 NULL,
	it_dc float8 NULL,
	lw_fiscal_week int4 NULL,
	lw_fiscal_year_week int4 NULL,
	oh float8 NULL,
	oh_dc float8 NULL,
	oo float8 NULL,
	oo_dc float8 NULL,
	product_code varchar NULL,
	store_code varchar NULL,
	tot_inv float8 NULL,
	total_forecast float8 NULL,
	wos float8 NULL,
	wos_oh float8 NULL,
	wos_oh_it float8 NULL,
	wos_oh_oo float8 NULL,
	store_level_prediction float8 NULL,
	store_level_actuals int4 NULL,
	size_integrity float8 NULL,
	dc_oh_oo_it_wos float8 NULL,
	dc_oh_wos float8 NULL,
	dc_oh_oo_wos float8 NULL,
	CONSTRAINT fwos_sku_store_table_version_un_key UNIQUE (version_code, product_code, store_code),
	CONSTRAINT fwos_sku_store_table_version_code_fk FOREIGN KEY (version_code) REFERENCES "global"."versioning"(version_code) ON DELETE CASCADE
)
PARTITION BY LIST (version_code);