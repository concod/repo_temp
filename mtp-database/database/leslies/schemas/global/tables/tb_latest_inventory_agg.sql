--liquibase formatted sql
--changeset liquibase:tb_latest_inventory_agg_v2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_latest_inventory_agg_v2
DROP TABLE IF EXISTS "global".tb_latest_inventory_agg CASCADE;
CREATE TABLE "global".tb_latest_inventory_agg (
	product_id int4 NULL,
	"date" date NULL,
	oh int4 NULL,
	it int4 NULL,
	oo int4 NULL,
	total_inventory int4 NULL
);
CREATE INDEX mkd_inv_prod_idx ON global.tb_latest_inventory_agg USING btree (product_id);

-- changeset vamsi.balaga@impactanalytics.co:tb_latest_inventory_agg_added_pk stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added primary key to tb_latest_inventory_agg
ALTER TABLE "global"."tb_latest_inventory_agg"
    ADD CONSTRAINT tb_latest_inventory_agg_pk PRIMARY KEY (product_id);
