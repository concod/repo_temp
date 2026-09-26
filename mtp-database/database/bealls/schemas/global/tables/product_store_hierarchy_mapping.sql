--liquibase formatted sql
--changeset praharsh.snehi@impactanalytics.co@impactanalytics.co:product_store_hierarchy_mapping_bealls_inital stripComments:false splitStatements:false context:Release_1_0 labels:briscoes_product_store_hierarchy_mapping
--comment: initial changeset for product_store_hierarchy_mapping
CREATE TABLE IF NOT EXISTS "global".product_store_hierarchy_mapping (
    l0_name varchar NULL,
    l1_name varchar NULL,
    l2_name varchar NULL,
    l3_name varchar NULL,
    channel varchar NULL,
    climate varchar NULL,
    store_code varchar NULL    
);

--changeset kamalesh.k@impactanalytics.co:product_store_hierarchy_mapping_pk_bealls_sync stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_store_hierarchy_mapping_pk
ALTER TABLE global.product_store_hierarchy_mapping ADD COLUMN IF NOT EXISTS id serial4 PRIMARY KEY;


--changeset ujjawal.singh@impactanalytics.co:product_store_hierarchy_mapping_pk_bealls_sync_01 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding columns
ALTER TABLE global.product_store_hierarchy_mapping 
Drop COLUMN IF EXISTS l0_name,
Drop COLUMN IF EXISTS l3_name,
Drop COLUMN IF EXISTS channel,
ADD COLUMN IF NOT EXISTS s0_name varchar null;

