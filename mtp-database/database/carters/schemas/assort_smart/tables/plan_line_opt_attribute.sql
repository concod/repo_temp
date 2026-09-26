--liquibase formatted sql
--changeset rishabh.kumar@impactanalytics.co:add_table_for_line_attr stripComments:false splitStatements:false context:MTP-70120 labels:initial_verison
--comment: Add table for line attributes
CREATE TABLE IF NOT EXISTS assort_smart.plan_line_opt_attribute (
    id BIGSERIAL PRIMARY KEY,
    plan_code BIGINT,
    hierarchy_code VARCHAR,
    final_level VARCHAR,
    attribute_name VARCHAR,
    attribute_value VARCHAR
);

CREATE INDEX idx_plan_line_opt_attribute_plan_code 
ON assort_smart.plan_line_opt_attribute(plan_code);
