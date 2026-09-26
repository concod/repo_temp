--liquibase formatted sql
--changeset sidhartha.c@impactanalytics.co:excess_units stripComments:false splitStatements:false context:Release_1_0 labels:sm_excess_units
--comment: initial changeset for excess_units

CREATE TABLE if NOT exists  inventory_smart.excess_units (
	product_hierarchy varchar NOT NULL,
	store_code varchar NOT NULL,
	fiscal_year int2 NOT NULL,
	fiscal_week int2 NOT NULL,
	"date" date NOT NULL,
	oh int4 NULL,
	oo int4 NULL,
	it int4 NULL,
	ros float4 NULL,
	target_wos int4 NULL,
	wos_pred float4 NULL,
	excess_inv int4 NULL,
	excess_inv_cost float4 NULL,
	tot_inv int4 NULL,
	CONSTRAINT excess_units_un UNIQUE (product_hierarchy, store_code, date),
	CONSTRAINT excess_units_store_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE
);
CREATE INDEX excess_units_fiscal_week_idx ON inventory_smart.excess_units USING btree (fiscal_week);
CREATE INDEX excess_units_fiscal_year_idx ON inventory_smart.excess_units USING btree (fiscal_year);

--changeset shreyas.sankpal@impactanalytics.co:excess_units_week_qty_col stripComments:false splitStatements:false context:Release_1_0 labels:sm_excess_units_week_qty
--comment: added week_qty column
ALTER TABLE inventory_smart.excess_units ADD COLUMN IF NOT EXISTS week_qty int4 NULL;


--changeset ashish@impactanalytics.co:excess_units_drop_week_year_idx stripComments:false splitStatements:false context:Release_1_1 labels:MTP-22588
--comment: drop index
DROP INDEX IF EXISTS inventory_smart.excess_units_fiscal_week_idx;
DROP INDEX IF EXISTS inventory_smart.excess_units_fiscal_year_idx;
