--liquibase formatted sql
--changeset liquibase:facility_t2_recommendation_by_rule_style stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for facility_t2_recommendation_by_rule_style
CREATE TABLE source_smart.facility_t2_recommendation_by_rule_style (
    facility_id varchar NOT NULL,
    t2_sourcing_option_id varchar NULL,
    route_id varchar NOT NULL,
    dc_code varchar NOT NULL,
    allocated_units float8 NOT NULL,
    allocation_id uuid NOT NULL,
    style_color_id varchar NOT NULL,
    operation_id uuid NOT NULL
);
--changeset genuine.basil@impactanalytics.co:facility_t2_recommendation_by_rule_style_v1 stripComments:false splitStatements:false context:Release_1_3 labels:liquibase_project_update
--comment: added index for facility_t2_recommendation_by_rule_style
CREATE INDEX IF NOT EXISTS idx_facility_t2_alloc_op_style_dc ON source_smart.facility_t2_recommendation_by_rule_style(
    allocation_id,
    operation_id,
    style_color_id,
    dc_code
);