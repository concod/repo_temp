--liquibase formatted sql
--changeset ashish.gupta:loss_units stripComments:false splitStatements:false context:Release_1 labels:New_Req
--comment: initial changeset for loss_units
CREATE TABLE inventory_smart.loss_units (
	product_hierarchy varchar NOT NULL,
	store_code varchar NOT NULL,
	fiscal_year int2 NOT NULL,
	fiscal_week int2 NOT NULL,
	"date" date NOT NULL,
	opening_inventory int4 NULL,
	quantity int4 NULL,
	cluster_avg_sales int4 NULL,
	lost_units int4 NULL,
	line_amount float4 NULL,
	lost_sales float4 NULL,
	CONSTRAINT loss_units_un UNIQUE (product_hierarchy, store_code, date)
);
ALTER TABLE inventory_smart.loss_units ADD CONSTRAINT loss_units_store_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE;

--changeset vivek.subramanya@impactanalytics.co:loss_units_structure_change stripComments:false splitStatements:false context:Release_1_0 labels:MTP-22504
--comment: updated loss_units to accomodate the extra columns

ALTER TABLE inventory_smart.loss_units ADD oo int4 NULL;
ALTER TABLE inventory_smart.loss_units ADD it int4 NULL;
ALTER TABLE inventory_smart.loss_units ADD wos_pred float8 NULL;
ALTER TABLE inventory_smart.loss_units ADD store_name varchar NULL;

ALTER TABLE inventory_smart.loss_units DROP CONSTRAINT loss_units_store_fk;
ALTER TABLE inventory_smart.loss_units ADD CONSTRAINT loss_units_store_fk FOREIGN KEY (store_code) REFERENCES global.store_master(store_code) ON DELETE cascade not valid;


--changeset shubham.singh@impactanalytics.co:loss_units_structure_change stripComments:false splitStatements:false context:Release_1_1 labels:MTP-22588
--comment: added index
CREATE INDEX loss_units_fiscal_year_idx ON inventory_smart.loss_units (fiscal_year);
CREATE INDEX loss_units_fiscal_week_idx ON inventory_smart.loss_units (fiscal_week);

--changeset linu.nazil@impactanalytics.co:loss_units_structure_change1 stripComments:false splitStatements:false context:Release_1_1 labels:MTP-35827
--comment: backup and drop
CREATE TABLE inventory_smart.loss_units_backup AS 
SELECT * FROM inventory_smart.loss_units;
drop table if exists inventory_smart.loss_units;
--changeset linu.nazil@impactanalytics.co:loss_units_structure_change2 stripComments:false splitStatements:false context:Release_1_1 labels:MTP-35827
--comment: new table
CREATE TABLE inventory_smart.loss_units (
	product_hierarchy varchar NOT NULL,
	store_code varchar NOT NULL,
	fiscal_year int2 NOT NULL,
	fiscal_week int2 NOT NULL,
	"date" date NOT NULL,
	opening_inventory int4 NULL,
	quantity int4 NULL,
	cluster_avg_sales int4 NULL,
	lost_units int4 NULL,
	line_amount float4 NULL,
	lost_sales float4 NULL,
	oo int4 NULL,
	it int4 NULL,
	wos_pred float8 NULL,
	store_name varchar NULL,
	fiscal_year_week int4 not null,
	CONSTRAINT loss_units_un UNIQUE (product_hierarchy, store_code, date, fiscal_year_week)
)
partition by list(fiscal_year_week);
ALTER TABLE inventory_smart.loss_units ADD CONSTRAINT loss_units_store_fk FOREIGN KEY (store_code) REFERENCES global.store_master(store_code) ON DELETE cascade;
