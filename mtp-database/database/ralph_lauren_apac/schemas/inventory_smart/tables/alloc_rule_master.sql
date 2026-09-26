--liquibase formatted sql
--changeset subhrajit.makur@impactanalytics.co:alerts_product_level_MTP-37323 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--inventory_smart.alloc_rule_master definition

CREATE TABLE inventory_smart.alloc_rule_master (
    rule_code INT PRIMARY KEY NOT NULL,
    rule_name VARCHAR NOT NULL,
    validity DATERANGE NULL,
    is_active BOOLEAN NOT NULL,
    is_default BOOLEAN NOT NULL,
    rule_definitions VARCHAR NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by INT NULL,
    created_by INT NULL
);
ALTER TABLE inventory_smart.alloc_rule_master ADD CONSTRAINT alloc_rule_master_updated_by_fk FOREIGN KEY (updated_by) REFERENCES global.user_master(user_code) ON DELETE SET NULL;
ALTER TABLE inventory_smart.alloc_rule_master ADD CONSTRAINT alloc_rule_master_created_by_fk FOREIGN KEY (created_by) REFERENCES global.user_master(user_code) ON DELETE SET NULL;


--changeset srishti.kumari@impactanalytics.co:added_rule_definitions_jsonb_column stripComments:false splitStatements:false context:MTP-47081 labels:MTP-47081
--added rule_definitions_jsonb MTP-47081
ALTER TABLE inventory_smart.alloc_rule_master ADD COLUMN rule_definitions_jsonb JSONB DEFAULT '{}'::jsonb NOT null;


--changeset gautam.baruah@impactanalytics.co:added_alter_commands_for_rule_code_name stripComments:false splitStatements:false context:Release_1_1 labels:Release_1_1
--comment: added alter commands for rule_code and rule_name
ALTER TABLE inventory_smart.alloc_rule_master ADD CONSTRAINT unique_rule_name UNIQUE (rule_name);
CREATE SEQUENCE if not exists inventory_smart.alloc_rule_master_alloc_rule_inventory_id_seq;
ALTER TABLE inventory_smart.alloc_rule_master ALTER COLUMN rule_code SET DEFAULT nextval('inventory_smart.alloc_rule_master_alloc_rule_inventory_id_seq'); 

