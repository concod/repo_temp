--liquibase formatted sql
--changeset liquibase:store_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for store_mapping

CREATE TABLE IF NOT EXISTS inventory_smart.store_mapping (
    mapping_id INT,
    rule_id INT NOT NULL,
    source_store_code VARCHAR NOT NULL,
    destination_store_code VARCHAR NOT NULL,
    store_mapping_attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
    CONSTRAINT store_mapping_pk PRIMARY KEY (mapping_id, rule_id),
    CONSTRAINT rule_id_updated_by_fk FOREIGN KEY (rule_id) REFERENCES inventory_smart.store_transfer_rule(rule_id),
    CONSTRAINT source_store_id_updated_by_fk FOREIGN KEY (source_store_code) REFERENCES "global".store_attributes_filter(store_code),
    CONSTRAINT destination_store_id_updated_by_fk FOREIGN KEY (destination_store_code) REFERENCES "global".store_attributes_filter(store_code)
) PARTITION BY LIST (rule_id);



--changeset ananya.gupta:alter_store_mapping_auto_increment_20251014 stripComments:false splitStatements:false context:command-fix labels:command-fix
--comment: Add sequence and auto-increment behavior to mapping_id in store_mapping

CREATE SEQUENCE IF NOT EXISTS inventory_smart.store_mapping_id_seq;
ALTER TABLE inventory_smart.store_mapping
    ALTER COLUMN mapping_id SET DEFAULT nextval('inventory_smart.store_mapping_id_seq');
