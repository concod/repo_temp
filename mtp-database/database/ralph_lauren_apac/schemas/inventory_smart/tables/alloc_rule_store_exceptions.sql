--liquibase formatted sql
--changeset subhrajit.makur@impactanalytics.co:alerts_product_level_MTP-37323 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--inventory_smart.alloc_rule_store definition


CREATE TABLE inventory_smart.alloc_rule_store_exceptions (
    rule_code INT  NOT NULL,
    validity DATERANGE NULL,
    store_code VARCHAR NOT NULL,
    is_active BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by INT NULL,
    created_by INT NULL,
    FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code)
);
ALTER TABLE inventory_smart.alloc_rule_store_exceptions ADD CONSTRAINT alloc_rule_store_exceptions_pkey PRIMARY KEY (rule_code, store_code, is_active);
ALTER TABLE inventory_smart.alloc_rule_store_exceptions ADD CONSTRAINT alloc_rule_store_exceptions_updated_by_fk FOREIGN KEY (updated_by) REFERENCES global.user_master(user_code) ON DELETE SET NULL;
ALTER TABLE inventory_smart.alloc_rule_store_exceptions ADD CONSTRAINT alloc_rule_store_exceptions_created_by_fk FOREIGN KEY (created_by) REFERENCES global.user_master(user_code) ON DELETE SET NULL;
ALTER TABLE inventory_smart.alloc_rule_store_exceptions ADD CONSTRAINT alloc_rule_store_exceptions_rule_code_fk FOREIGN KEY (rule_code) REFERENCES inventory_smart.alloc_rule_master(rule_code) ON DELETE CASCADE;

