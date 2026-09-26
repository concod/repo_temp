--liquibase formatted sql
--changeset himansh.bhardwaj:product_store_attributes_filter_version stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_store_attributes_filter_version

CREATE TABLE "global".product_store_attributes_filter_version (
    version_code int4 NOT NULL,
    psa_code text NOT NULL,
    store_code text NOT NULL,
    l0_name text NULL,
    l1_name text NULL,
    l2_name text NULL,
    psa_name text NULL,
    store_grade text NULL,
    store_cluster text NULL,
    store_name text NULL,
    l0_id text NULL,
    l1_id text NULL,
    l2_id text NULL,
    store_hierarchy_level text[] DEFAULT ARRAY[]::text[],
    CONSTRAINT product_store_attributes_filter_version_pk PRIMARY KEY (version_code, psa_code, store_code)
)
PARTITION BY LIST (version_code);

-- global.product_store_attributes_filter_version foreign keys

ALTER TABLE "global".product_store_attributes_filter_version ADD CONSTRAINT product_store_attributes_filter_version_code_fk FOREIGN KEY (version_code) REFERENCES "global"."versioning"(version_code) ON DELETE CASCADE;

-- Indexes
CREATE INDEX product_store_attributes_filter_version_l0_name_idx ON "global".product_store_attributes_filter_version (l0_name, l1_name, l2_name);

--changeset himansh.bhardwaj:adding country_id and franchise_name to psaf stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding country_id and franchise_name
ALTER TABLE global.product_store_attributes_filter_version
ADD COLUMN IF NOT EXISTS country_id varchar NOT NULL DEFAULT 'NC',
ADD COLUMN IF NOT EXISTS franchise_name varchar NOT NULL DEFAULT 'NF';

--changeset himansh.bhardwaj:automatically filling 'psa_name' in store_hierarchy stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: automatically filling 'psa_name' in store_hierarchy
ALTER TABLE global.product_store_attributes_filter_version 
ALTER COLUMN store_hierarchy_level SET DEFAULT ARRAY['psa_name']::text[];

--changeset himansh.bhardwaj:dropping_not_null_constraints_and_def_values stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: dropping_not_null_constraints_and_def_values
ALTER TABLE global.product_store_attributes_filter_version 
ALTER COLUMN country_id DROP DEFAULT,
ALTER COLUMN country_id DROP NOT NULL,
ALTER COLUMN franchise_name DROP DEFAULT,
ALTER COLUMN franchise_name DROP NOT NULL,
ALTER COLUMN store_hierarchy_level DROP DEFAULT;