--liquibase formatted sql
--changeset liquibase:product_store_attributes_filter stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_store_attributes_filter

CREATE TABLE IF NOT EXISTS "global".product_store_attributes_filter (
	psa_code text NOT NULL,
	l0_name text NULL,
	store_code text NOT NULL,
	psa_name varchar NULL,
	CONSTRAINT product_store_attributes_filter_pk PRIMARY KEY (psa_code, store_code),
	CONSTRAINT product_store_attributes_filter_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS product_store_attributes_filter_l0_name_idx ON global.product_store_attributes_filter USING btree (l0_name);


--changeset kaustubh.gupta:product_store_attributes_filter stripComments:false splitStatements:false context:initial_release labels:columns_rename
--comment: schema change for product_store_attributes_filter
ALTER TABLE "global".product_store_attributes_filter
RENAME COLUMN l0_name TO l2_name;

--changeset kaustubh.gupta:colums addition in product_store_attributes_filter stripComments:false splitStatements:false context:Release_1_0 labels:cols_add
--comment: added l0_name, l1_name column
ALTER TABLE global.product_store_attributes_filter 
ADD COLUMN IF NOT EXISTS l0_name varchar,
ADD COLUMN IF NOT EXISTS l1_name varchar;

--changeset aman.lakkoju:removing l2_name stripComments:false splitStatements:false context:initial_release labels:columns_rename
--comment: removing l2_name
ALTER TABLE "global".product_store_attributes_filter
drop COLUMN IF EXISTS l2_name;

--changeset linu.nazil@impactanalytics.co:product_store_attributes_filter_v3 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding store_hierarchy_level column
ALTER TABLE global.product_store_attributes_filter ADD COLUMN IF NOT EXISTS store_hierarchy_level text[] DEFAULT ARRAY[]::text[];

--changeset linu.nazil@impactanalytics.co:product_store_attributes_filter_v4 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding store_hierarchy_level column
ALTER TABLE global.product_store_attributes_filter ADD COLUMN IF NOT EXISTS region varchar NULL;

--changeset aman.lakkoju:removing_l1_name stripComments:false splitStatements:false context:initial_release labels:columns_rename
--comment: removing_l1_name
ALTER TABLE "global".product_store_attributes_filter
drop COLUMN IF EXISTS l1_name;