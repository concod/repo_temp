--liquibase formatted sql
--changeset kumaran.k@impactanalytics.co:product_store_hierarchy_mapping_v1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_store_hierarchy_mapping_v1

DROP TABLE IF EXISTS "global".product_store_hierarchy_mapping;
CREATE TABLE "global".product_store_hierarchy_mapping (
    l0_name text NULL,
    l1_name TEXT NULL,
    manufacturer_cuq TEXT NULL,
    channel text NULL,
    CONSTRAINT pk_prod_store_hier_map PRIMARY KEY (l0_name, l1_name, manufacturer_cuq)
    );
CREATE INDEX prod_store_hier_map_idx ON "global".product_store_hierarchy_mapping USING btree (manufacturer_cuq);

--changeset siddharth.bajpai@impactanalytics.co:product_store_hierarchy_mapping_alters stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:product_store_hierarchy_mapping
--comment: ALTER statements for global.product_store_hierarchy_mapping

ALTER TABLE global.product_store_hierarchy_mapping ADD COLUMN IF NOT EXISTS country text NULL;
ALTER TABLE global.product_store_hierarchy_mapping ADD COLUMN IF NOT EXISTS l2_name text NOT NULL;
ALTER TABLE global.product_store_hierarchy_mapping DROP COLUMN IF EXISTS channel;
ALTER TABLE global.product_store_hierarchy_mapping DROP COLUMN IF EXISTS manufacturer_cuq;
ALTER TABLE global.product_store_hierarchy_mapping ALTER COLUMN l0_name SET NOT NULL;
ALTER TABLE global.product_store_hierarchy_mapping ALTER COLUMN l1_name SET NOT NULL;
ALTER TABLE global.product_store_hierarchy_mapping ALTER COLUMN l1_name TYPE text;
DROP INDEX IF EXISTS global.prod_store_hier_map_idx;
ALTER TABLE global.product_store_hierarchy_mapping DROP CONSTRAINT IF EXISTS pk_prod_store_hier_map;
ALTER TABLE global.product_store_hierarchy_mapping ADD CONSTRAINT pk_prod_store_hier_map PRIMARY KEY (l0_name, l1_name, l2_name);
CREATE INDEX prod_store_hier_map_idx ON global.product_store_hierarchy_mapping USING btree (l0_name, l1_name, l2_name);


--changeset divyasree.bingimalla@impactanalytics.co:product_store_hierarchy_mapping_alters stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:product_store_hierarchy_mapping
--comment: ALTER statements for global.product_store_hierarchy_mapping
ALTER TABLE global.product_store_hierarchy_mapping ADD COLUMN IF NOT EXISTS s1_name varchar NULL;
ALTER TABLE global.product_store_hierarchy_mapping ADD COLUMN IF NOT EXISTS s2_name varchar NULL;
ALTER TABLE global.product_store_hierarchy_mapping RENAME COLUMN country TO s0_name;
ALTER TABLE global.product_store_hierarchy_mapping DROP CONSTRAINT IF EXISTS pk_prod_store_hier_map;
