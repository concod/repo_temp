--liquibase formatted sql
--changeset liquibase:season_product_mapping_ua stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for season_product_mapping_ua
CREATE TABLE source_smart.season_product_mapping_ua (
    mapping_id varchar(50) NOT NULL,
    season_id varchar(50) NOT NULL,
    article varchar(50) NULL,
    new_product_flag varchar(50) NULL,
    product_code varchar NULL,
    CONSTRAINT season_product_mapping_ua_pkey PRIMARY KEY (mapping_id)
);

--changeset mayank.mukundam@impactanalytics.co:season_product_mapping_ua_add_columns stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: add columns to season_product_mapping_ua
ALTER TABLE source_smart.season_product_mapping_ua ADD COLUMN is_updated bool;
ALTER TABLE source_smart.season_product_mapping_ua ADD COLUMN is_active bool;
ALTER TABLE source_smart.season_product_mapping_ua ADD COLUMN created_at timestamptz;
ALTER TABLE source_smart.season_product_mapping_ua ADD COLUMN updated_at timestamptz;

CREATE INDEX idx_season_product_mapping_ua_season_product ON source_smart.season_product_mapping_ua USING btree (season_id, product_code);

--changeset mayank.mukundam@impactanalytics.co:season_product_mapping_ua_add_primary_facility stripComments:false splitStatements:false context:Release_1_2 labels:liquibase_project_start
--comment: add primary_facility column to season_product_mapping_ua
ALTER TABLE source_smart.season_product_mapping_ua ADD COLUMN primary_facility varchar;