--liquibase formatted sql
--changeset liquibase:stylecolor_facility_mapping_ua stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for stylecolor_facility_mapping_ua
CREATE TABLE source_smart.stylecolor_facility_mapping_ua (
    style_color_id varchar(50) NULL,
    facility_id int4 NULL,
    facility_tier2_eligibility varchar(50) NULL,
    product_code varchar NULL
);


--changeset mayank.mukundam@impactanalytics.co:stylecolor_facility_mapping_ua_add_columns stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: add columns to stylecolor_facility_mapping_ua
ALTER TABLE source_smart.stylecolor_facility_mapping_ua ADD COLUMN is_updated bool;
ALTER TABLE source_smart.stylecolor_facility_mapping_ua ADD COLUMN is_active bool;
ALTER TABLE source_smart.stylecolor_facility_mapping_ua ADD COLUMN created_at timestamptz;
ALTER TABLE source_smart.stylecolor_facility_mapping_ua ADD COLUMN updated_at timestamptz;

CREATE INDEX idx_stylecolor_facility_mapping_ua_style_tier2_facility ON source_smart.stylecolor_facility_mapping_ua USING btree (style_color_id, facility_tier2_eligibility, facility_id);

--changeset genuine.basil@impactanalytics.co:stylecolor_facility_mapping_ua_idx_product_code stripComments:false splitStatements:false context:Release_1_2 labels:liquibase_project_start
--comment: index on product_code for joins and filters
CREATE INDEX IF NOT EXISTS idx_sfm_ua_product_code ON source_smart.stylecolor_facility_mapping_ua (product_code);