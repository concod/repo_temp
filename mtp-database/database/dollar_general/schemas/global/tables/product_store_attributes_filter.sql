--liquibase formatted sql
--changeset linu.nazil@impactanalytics.co:product_store_attributes_filter_v1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_store_attributes_filter
CREATE TABLE if not exists "global".product_store_attributes_filter (
	psa_code varchar NOT NULL,
        l0_code varchar NULL,
        l0_name varchar NULL,
        l1_code varchar NULL,
        l1_name varchar NULL,
        l3_code varchar NULL,
        l3_name varchar NULL,
        l4_code varchar NULL,
        l4_name varchar NULL,
        store_code varchar NOT NULL,
        psa_name int4 NULL,
	CONSTRAINT product_store_attributes_filter_pk PRIMARY KEY (psa_code, store_code)
);
CREATE INDEX if not exists product_store_attributes_filter_l0_name_idx ON "global".product_store_attributes_filter (l0_name);

--changeset linu.nazil@impactanalytics.co:product_store_attributes_filter_v2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: psa_name to varchar from int
ALTER TABLE "global".product_store_attributes_filter ALTER COLUMN psa_name TYPE varchar;

--changeset swapnil-bhange:product_store_attributes_filter_v2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase0074_project_start
--comment: added l0_status and allocation_status_flag columns
ALTER TABLE "global".product_store_attributes_filter ADD COLUMN l0_status varchar;
ALTER TABLE "global".product_store_attributes_filter ADD COLUMN allocation_status_flag boolean;

--changeset linu.nazil:product_store_attributes_filter_v2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase0074_project_start
--comment: added l0_status and allocation_status_flag columns
DROP INDEX "global".product_store_attributes_filter_l0_name_idx;
CREATE INDEX if not exists product_store_attributes_filter_l0_name_idx ON "global".product_store_attributes_filter (l0_name, l4_name);

--changeset linu.nazil:product_store_attributes_filter_v3 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase0074_project_start
--comment: index columns 
DROP INDEX "global".product_store_attributes_filter_l0_name_idx;
CREATE INDEX product_store_attributes_filter_l0_name_idx ON global.product_store_attributes_filter USING btree (l0_name, l4_name, store_code);

--changeset swapnil.bhange@impactanalytics.co:psaf_hash_idx stripComments:false splitStatements:false context:Release_1_0 labels:liquibase0074_project_start
--comment: hash index columns 
CREATE INDEX psaf_hash_idx ON global.product_store_attributes_filter USING hash (md5(l0_code || l1_code || l3_code || l4_code || store_code));

--changeset swapnil.bhange@impactanalytics.co:psaf_v1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase0075_project_start
--comment: added store_group 
ALTER TABLE "global".product_store_attributes_filter ADD COLUMN store_group varchar;

--changeset swapnil.bhange@impactanalytics.co:psaf_v2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase0075_project_start
--comment: renmaed store_group to store_group_description
ALTER TABLE "global".product_store_attributes_filter RENAME COLUMN store_group TO store_group_description;


--changeset linu.nazil@impactanalytics.co:product_store_attributes_filter_v4 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding store_hierarchy_level column
ALTER TABLE global.product_store_attributes_filter ADD COLUMN IF NOT EXISTS store_hierarchy_level text[] DEFAULT ARRAY[]::text[];
