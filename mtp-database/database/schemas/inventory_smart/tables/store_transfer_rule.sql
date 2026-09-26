
--liquibase formatted sql
--changeset liquibase:store_transfer_rule stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for store_transfer_rule

CREATE TABLE IF NOT EXISTS  inventory_smart.store_transfer_rule (
    rule_id INT  PRIMARY KEY,
    rule_name VARCHAR NOT NULL,
    channel VARCHAR,
    transfer_within VARCHAR,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT False,
    is_default BOOLEAN DEFAULT False
);

--changeset ananya.gupta:store_transfer_rule_add_updated_by_20251006 stripComments:false splitStatements:false context:command-fix labels:command-fix
--comment: store_transfer_rule
ALTER TABLE inventory_smart.store_transfer_rule ADD COLUMN IF NOT EXISTS updated_by varchar; 

--changeset ananya.gupta:alter_store_transfer_rule_auto_increment_20251014 stripComments:false splitStatements:false context:command-fix labels:command-fix
--comment: Add sequence and auto-increment behavior to rule_id in store_transfer_rule


CREATE SEQUENCE IF NOT EXISTS inventory_smart.store_transfer_rule_id_seq;
ALTER TABLE inventory_smart.store_transfer_rule
    ALTER COLUMN rule_id SET DEFAULT nextval('inventory_smart.store_transfer_rule_id_seq');
ALTER TABLE inventory_smart.store_transfer_rule 
    ALTER COLUMN is_default SET DEFAULT true;

--changeset ananya.gupta:store_transfer_rule_add_linkagecluster stripComments:false splitStatements:false context:command-fix labels:command-fix
--comment: store_transfer_rule
ALTER TABLE inventory_smart.store_transfer_rule ADD COLUMN IF NOT EXISTS linkage_cluster varchar; 
ALTER TABLE inventory_smart.store_transfer_rule ADD COLUMN IF NOT EXISTS store_groups varchar; 


