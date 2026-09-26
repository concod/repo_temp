--liquibase formatted sql
--changeset sreevathsa.sp@impactanalytics.co:excess_units stripComments:false splitStatements:false context:Release_1_0 labels:pacsun_excess_units
--comment: initial changeset for excess_units

CREATE TABLE if not exists inventory_smart.excess_units (
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
	CONSTRAINT excess_units_un UNIQUE (product_hierarchy, store_code, date),
	CONSTRAINT excess_units_store_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE
);
CREATE INDEX if not exists excess_units_fiscal_week_idx ON inventory_smart.excess_units USING btree (fiscal_week);
CREATE INDEX if not exists excess_units_fiscal_year_idx ON inventory_smart.excess_units USING btree (fiscal_year);


ALTER TABLE inventory_smart.excess_units ADD COLUMN IF NOT EXISTS store_name varchar;
ALTER TABLE inventory_smart.excess_units ADD COLUMN IF NOT EXISTS fiscal_year_week varchar;
ALTER TABLE inventory_smart.excess_units ADD COLUMN IF NOT EXISTS min_stock int4;
ALTER TABLE inventory_smart.excess_units ADD COLUMN IF NOT EXISTS bop_oh int4 NULL;
ALTER TABLE inventory_smart.excess_units ADD COLUMN IF NOT EXISTS bop_it int4 NULL;
ALTER TABLE inventory_smart.excess_units ADD COLUMN IF NOT EXISTS bop_oo int4 NULL;
ALTER TABLE inventory_smart.excess_units ADD COLUMN IF NOT EXISTS style_color_description varchar NOT NULL DEFAULT '';
ALTER TABLE inventory_smart.excess_units ADD COLUMN IF NOT EXISTS l0_name varchar NOT NULL DEFAULT '';
ALTER TABLE inventory_smart.excess_units ADD COLUMN IF NOT EXISTS l1_name varchar NOT NULL DEFAULT '';
ALTER TABLE inventory_smart.excess_units ADD COLUMN IF NOT EXISTS l2_name varchar NOT NULL DEFAULT '';
ALTER TABLE inventory_smart.excess_units ADD COLUMN IF NOT EXISTS l3_id_name varchar NOT NULL DEFAULT '';
ALTER TABLE inventory_smart.excess_units ADD COLUMN IF NOT EXISTS brand varchar NULL;
ALTER TABLE inventory_smart.excess_units ADD COLUMN IF NOT EXISTS s0_name varchar NOT NULL DEFAULT '';
ALTER TABLE inventory_smart.excess_units ADD COLUMN IF NOT EXISTS s1_id_name varchar NULL;
ALTER TABLE inventory_smart.excess_units ADD COLUMN IF NOT EXISTS s2_id_name varchar NULL;
ALTER TABLE inventory_smart.excess_units ADD COLUMN IF NOT EXISTS s3_id_name varchar NULL;
ALTER TABLE inventory_smart.excess_units ADD COLUMN IF NOT EXISTS store_tier varchar NULL;
ALTER TABLE inventory_smart.excess_units ADD COLUMN IF NOT EXISTS store_code_name varchar NOT NULL DEFAULT '';
ALTER TABLE inventory_smart.excess_units ADD COLUMN IF NOT EXISTS country varchar NULL;
ALTER TABLE inventory_smart.excess_units ADD COLUMN IF NOT EXISTS fullfillment_type varchar NULL;



--changeset ashish@impactanalytics.co:excess_units_drop_week_year_idx stripComments:false splitStatements:false context:Release_1_1 labels:MTP-22588
--comment: drop index
DROP INDEX IF EXISTS inventory_smart.excess_units_fiscal_week_idx;
DROP INDEX IF EXISTS inventory_smart.excess_units_fiscal_year_idx;
