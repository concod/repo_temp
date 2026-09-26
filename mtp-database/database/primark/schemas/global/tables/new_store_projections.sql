--liquibase formatted sql
--changeset aman.lakkoju:new_store_data stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for new_store_projections

CREATE TABLE IF NOT EXISTS "global".new_store_projections(
    id serial4 NOT NULL,
    store_code text NOT NULL,
    store_name text NOT NULL,
    sister_store_code text NOT NULL,
    l0_name text NULL,
    l1_name text NULL,
    primary_trait_desc text NULL,
    l2_name text NULL,
    l3_name text NULL,
    l4_name text NULL,
    l5_name text NULL,
    channel text NULL,
    multiplier  int4 NULL,
    wos int4 NULL,
    projected_units int4 NULL,
    projected_value numeric NULL,
    created_at timestamp DEFAULT now() NULL,
    updated_at timestamp DEFAULT now() NULL,
    CONSTRAINT new_store_projections_pkey PRIMARY KEY (id),
    CONSTRAINT fk_new_store_projections_store_code FOREIGN KEY (store_code) REFERENCES "global".new_store_data(store_code) ON DELETE RESTRICT ON UPDATE CASCADE
);

--changeset aman_lakkoju_:article_and_prod_desc_column_addition stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:article_and_prod_desc_column_addition
--comment: article_and_prod_desc_column_addition

ALTER TABLE global.new_store_projections  ADD COLUMN IF NOT EXISTS article varchar NULL;
ALTER TABLE global.new_store_projections ADD COLUMN IF NOT EXISTS product_description varchar NULL;

--changeset aman_lakkoju:removed_primary_trait_desc stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:removed_primary_trait_desc
--comment: removed_primary_trait_desc

ALTER TABLE global.product_store_hierarchy_mapping DROP COLUMN IF EXISTS primary_trait_desc;