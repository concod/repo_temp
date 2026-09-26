--liquibase formatted sql
--changeset liquibase:excess_units stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for excess_units
CREATE TABLE inventory_smart.excess_units (
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
	CONSTRAINT excess_units_un UNIQUE (product_hierarchy, store_code, date)
);
ALTER TABLE inventory_smart.excess_units ADD CONSTRAINT excess_units_store_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE;

--changeset shubham.singh@impactanalytics.co:excess_units_structure_change stripComments:false splitStatements:false context:Release_1_1 labels:MTP-23766
--comment: added index
CREATE INDEX excess_units_fiscal_year_idx ON inventory_smart.excess_units (fiscal_year);
CREATE INDEX excess_units_fiscal_week_idx ON inventory_smart.excess_units (fiscal_week);


--changeset ashish@impactanalytics.co:excess_units_drop_week_year_idx stripComments:false splitStatements:false context:Release_1_1 labels:MTP-22588
--comment: drop index
DROP INDEX IF EXISTS inventory_smart.excess_units_fiscal_week_idx;
DROP INDEX IF EXISTS inventory_smart.excess_units_fiscal_year_idx;
