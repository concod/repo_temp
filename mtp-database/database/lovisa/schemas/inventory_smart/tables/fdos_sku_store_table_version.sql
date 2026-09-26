--liquibase formatted sql
--changeset swapnil.bhange:fdos_sku_store_table_version stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for fdos_sku_store_table_version

CREATE TABLE inventory_smart.fdos_sku_store_table_version (
	version_code int4 NOT NULL,
	article varchar NOT NULL,
	"date" date NULL,
	fiscal_year int4 NULL,
	it int4 NULL,
	it_dc int4 NULL,
	lw_fiscal_week int4 NULL,
	lw_fiscal_year_week int4 NULL,
	oh int4 NULL,
	oh_dc int4 NULL,
	oo int4 NULL,
	oo_dc int4 NULL,
	dc_oo_po int4 NULL,
	product_code varchar NULL,
	store_code varchar NOT NULL,
	tot_inv int4 NULL,
	total_forecast float4 NULL,
	dos float4 NULL,
	dos_oh float4 NULL,
	dos_oh_it float4 NULL,
	dos_oh_oo float4 NULL,
	store_level_prediction float4 NULL,
	store_level_actuals int4 NULL,
	size_integrity float4 NULL,
	dc_oh_oo_it_dos float4 NULL,
	dc_oh_dos float4 NULL,
	dc_oh_oo_dos float4 NULL,
	l0_name varchar NULL,
    CONSTRAINT fdos_sku_store_table_version_pk PRIMARY KEY (version_code, article, store_code)
)
PARTITION BY LIST (version_code);
