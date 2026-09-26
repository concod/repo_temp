--liquibase formatted sql
--changeset srishti.kumari@impactanalytics.co:alerts_product_level_MTP-51967 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--inventory_smart.alloc_rule_type_mapping definition


CREATE TABLE inventory_smart.alloc_rule_type_mapping (
    rule_code INT NOT NULL,
    rule_type INT NOT NULL,
    rule_definitions JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by INT NULL,
    created_by INT NULL,
    PRIMARY KEY (rule_code, rule_type, is_active),
    CONSTRAINT alloc_rule_type_mapping_updated_by_fk
        FOREIGN KEY (updated_by) 
        REFERENCES global.user_master(user_code) 
        ON DELETE SET NULL,
    CONSTRAINT alloc_rule_type_mapping_created_by_fk
        FOREIGN KEY (created_by) 
        REFERENCES global.user_master(user_code) 
        ON DELETE SET NULL,
    CONSTRAINT alloc_rule_type_mappings_rule_code_fk
        FOREIGN KEY (rule_code) 
        REFERENCES inventory_smart.alloc_rule_master(rule_code) 
        ON DELETE CASCADE
);