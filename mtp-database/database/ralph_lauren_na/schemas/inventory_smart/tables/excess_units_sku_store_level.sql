--liquibase formatted sql
--changeset suryasai.gopal@impactanalytics.co:excess_units_sku_store_level stripComments:false splitStatements:false context:Release_1_0 labels:MTP-22504
--comment: initial changeset for excess_units_sku_store_level
CREATE TABLE inventory_smart.excess_units_sku_store_level (
	product_hierarchy varchar NOT NULL,
	store_code varchar NOT NULL,
	fiscal_year int2 NOT NULL,
	fiscal_week int2 NOT NULL,
	"date" date NOT NULL,
	oh int4 NULL,
	oo int4 NULL,
	it int4 NULL,
	week_qty int4 NULL,
	ros float4 NULL,
	target_wos int4 NULL,
	wos_pred float4 NULL,
	excess_inv int4 NULL,
	excess_inv_cost float4 NULL,
	tot_inv int4 NULL,
	product_code varchar NULL,
	store_name varchar NULL,
	CONSTRAINT excess_units_sku_store_level_un UNIQUE (product_code, store_code, date),
	CONSTRAINT excess_units_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE NOT VALID,
	CONSTRAINT excess_units_store_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE NOT VALID
);

--changeset linu.nazil@impactanalytics.co:excess_units_sku_store_level_structure_change1 stripComments:false splitStatements:false context:Release_1_1 labels:MTP-35827
--comment: backup and drop
CREATE TABLE inventory_smart.excess_units_sku_store_level_backup AS 
SELECT * FROM inventory_smart.excess_units_sku_store_level;
drop table if exists inventory_smart.excess_units_sku_store_level;
--changeset linu.nazil@impactanalytics.co:excess_units_sku_store_level_structure_change2 stripComments:false splitStatements:false context:Release_1_1 labels:MTP-35827
--comment: new table
CREATE TABLE inventory_smart.excess_units_sku_store_level (
	product_hierarchy varchar NOT NULL,
	store_code varchar NOT NULL,
	fiscal_year int2 NOT NULL,
	fiscal_week int2 NOT NULL,
	"date" date NOT NULL,
	oh int4 NULL,
	oo int4 NULL,
	it int4 NULL,
	week_qty int4 NULL,
	ros float4 NULL,
	target_wos int4 NULL,
	wos_pred float4 NULL,
	excess_inv int4 NULL,
	excess_inv_cost float4 NULL,
	tot_inv int4 NULL,
	product_code varchar NULL,
	store_name varchar NULL,
	fiscal_year_week int4 not null,
	CONSTRAINT excess_units_sku_store_level_un UNIQUE (product_code, store_code, date, fiscal_year_week),
	CONSTRAINT excess_units_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE NOT VALID,
	CONSTRAINT excess_units_store_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE NOT VALID
)
partition by  list(fiscal_year_week);

--changeset praharsh.snehi@impactanalytics.co:excess_units_sku_store_level_structure_change2 stripComments:false splitStatements:false context:Release_1_1 labels:MTP-35827
--comment: new column min_stock addition
ALTER TABLE inventory_smart.excess_units_sku_store_level ADD min_stock float4 NULL;