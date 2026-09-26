--liquibase formatted sql
--changeset liquibase:tb_latest_inventory_v2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_latest_inventory_v2 with if not exists
DROP TABLE IF EXISTS "global".tb_latest_inventory CASCADE;
CREATE TABLE "global".tb_latest_inventory (
	store_id int4 NULL,
	product_id int4 NULL,
	clearance_indicator int4 NULL,
	"date" date NULL,
	oh int4 NULL,
	it int4 NULL,
	oo int4 NULL,
	to_transfer int4 NULL,
	total_inventory int4 NULL
);
CREATE INDEX mkd_inv_prod_store_id_idx ON global.tb_latest_inventory USING btree (product_id, store_id);

-- changeset vamsi.balaga@impactanalytics.co:tb_latest_inventory_added_pk stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added primary key to tb_latest_inventory
ALTER TABLE "global"."tb_latest_inventory"
    ADD CONSTRAINT tb_latest_inventory_pk PRIMARY KEY (store_id, product_id, date);