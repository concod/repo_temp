--liquibase formatted sql
--changeset surya.avinash@impactanalytics.co:tb_latest_inventory_v290525 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: updated schema for tb_latest_inventory

CREATE TABLE "global".tb_latest_inventory (
	product_id int4 NOT NULL,
	clearance_indicator int4 NULL,
	"date" date NULL,
	oh int4 NULL,
	it int4 NULL,
	oo int4 NULL,
	vendor_oo int4 NULL,
	total_inventory int4 NULL,
	clearance_indicator_rf int4 NULL,
	lifecycle text NULL,
	age int4 NULL,
	"ST" float4 NULL,
	clerance_eligible int4 NULL,
	store_id int4 NOT NULL,
	CONSTRAINT tb_latest_inventory_pk PRIMARY KEY (product_id, store_id, date)
);
CREATE INDEX mkd_inv_prod_store_id_idx ON global.tb_latest_inventory USING btree (product_id, store_id);

--changeset anshika.mungiya@impactanalytics.co:tb_latest_inventory_June6 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: updated schema for tb_latest_inventory_June6

ALTER TABLE "global".tb_latest_inventory
DROP CONSTRAINT tb_latest_inventory_pk;

ALTER TABLE "global".tb_latest_inventory
ADD COLUMN s0_id int4 NULL,
ADD COLUMN s0_name varchar(50) NULL,
ADD COLUMN s1_id int4 NULL,
ADD COLUMN s1_name varchar(50) NULL,
ADD COLUMN style_cuq varchar(50) NULL;

ALTER TABLE "global".tb_latest_inventory
ALTER COLUMN product_id DROP NOT NULL,
ALTER COLUMN store_id DROP NOT NULL;

ALTER TABLE "global".tb_latest_inventory
RENAME COLUMN lifecycle TO lifecycle_indicator_rf;

ALTER TABLE "global".tb_latest_inventory
ALTER COLUMN "ST" TYPE float8;

ALTER TABLE "global".tb_latest_inventory
RENAME COLUMN clerance_eligible TO clearance_eligible;


--changeset vaibhav@impactanalytics.co:tb_latest_inventory_June11 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: updated schema for tb_latest_inventory_June11

ALTER TABLE "global".tb_latest_inventory
RENAME COLUMN lifecycle_indicator_rf TO lifecycle;

--changeset harsh.singh@impactanalytics.co:tb_latest_inventory_added_pk stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added primary key to tb_latest_inventory
ALTER TABLE "global".tb_latest_inventory
    ADD CONSTRAINT tb_latest_inventory_pk PRIMARY KEY (s0_id, s1_id, product_id, date);