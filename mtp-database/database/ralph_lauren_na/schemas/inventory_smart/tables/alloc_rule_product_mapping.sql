--liquibase formatted sql
--changeset srishti.kumari@impactanalytics.co:alerts_product_level_MTP-51967 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--inventory_smart.alloc_rule_product_mapping definition

CREATE TABLE inventory_smart.alloc_rule_product_mapping (
    article VARCHAR NOT NULL,
    rule_code INT NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by INT NULL,
    created_by INT NULL,
    PRIMARY KEY (article, rule_code, is_active),
    CONSTRAINT alloc_rule_product_mapping_updated_by_fk FOREIGN KEY (updated_by) REFERENCES global.user_master(user_code) ON DELETE SET NULL,
    CONSTRAINT alloc_rule_product_mapping_created_by_fk FOREIGN KEY (created_by) REFERENCES global.user_master(user_code) ON DELETE SET NULL,
    CONSTRAINT alloc_rule_product_mapping_rule_code_fk FOREIGN KEY (rule_code) REFERENCES inventory_smart.alloc_rule_master(rule_code) ON DELETE CASCADE,
    CONSTRAINT alloc_rule_product_mapping_unique UNIQUE (article)
);
