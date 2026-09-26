--liquibase formatted sql
--changeset liquibase:store_mapping_updated_2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for store_mapping_updated_2

CREATE TABLE IF NOT EXISTS inventory_smart.store_mapping (
	mapping_id serial4 NOT NULL,
	rule_id int4 NOT NULL,
	source_store_code varchar NOT NULL,
	destination_store_code varchar NOT NULL,
	store_mapping_attributes jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT store_mapping_pk PRIMARY KEY (mapping_id, rule_id),
	CONSTRAINT destination_store_id_updated_by_fk FOREIGN KEY (destination_store_code) REFERENCES "global".store_attributes_filter(store_code),
	CONSTRAINT rule_id_updated_by_fk FOREIGN KEY (rule_id) REFERENCES inventory_smart.store_transfer_rule(rule_id),
	CONSTRAINT source_store_id_updated_by_fk FOREIGN KEY (source_store_code) REFERENCES "global".store_attributes_filter(store_code)
)
PARTITION BY LIST (rule_id);
