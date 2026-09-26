--liquibase formatted sql
--changeset liquibase:store_transfer_config stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for store_transfer_config

CREATE TABLE IF NOT EXISTS inventory_smart.store_transfer_config (
    config_id INT PRIMARY KEY,
    product_code VARCHAR NOT NULL,
    optimisation_level VARCHAR NOT NULL,
    transfer_strategy VARCHAR NOT NULL,
    transfer_rule_id INT ,
    config_params JSONB NOT NULL DEFAULT '{}'::jsonb, 
    is_enabled BOOLEAN DEFAULT TRUE,
    CONSTRAINT transfer_rule_id_updated_by_fk FOREIGN KEY (transfer_rule_id) REFERENCES inventory_smart.store_transfer_rule(rule_id)
);

--changeset ananya.gupta:store_transfer_config stripComments:false splitStatements:false context:command-fix labels:command-fix
--comment: store_transfer_config

ALTER TABLE inventory_smart.store_transfer_config ADD CONSTRAINT store_transfer_config_product_code_unique UNIQUE (product_code);

--changeset ananya.gupta:alter_store_transfer_config_auto_increment_20251014 stripComments:false splitStatements:false context:command-fix labels:command-fix
--comment: Add sequence and auto-increment behavior to config_id in store_transfer_config

CREATE SEQUENCE IF NOT EXISTS inventory_smart.store_transfer_config_id_seq;
ALTER TABLE inventory_smart.store_transfer_config
    ALTER COLUMN config_id SET DEFAULT nextval('inventory_smart.store_transfer_config_id_seq');

--changeset ananya.gupta:drop_and_recreate_store_transfer_config_20251205 
--comment: Replace product_code with article (full table recreate)

ALTER TABLE inventory_smart.store_transfer_config
    DROP CONSTRAINT IF EXISTS store_transfer_config_product_code_unique;

DROP TABLE IF EXISTS inventory_smart.store_transfer_config CASCADE;


DROP SEQUENCE IF EXISTS inventory_smart.store_transfer_config_id_seq;

CREATE TABLE inventory_smart.store_transfer_config (
	config_id serial4 NOT NULL,
	article varchar NOT NULL,
	optimisation_level varchar NOT NULL,
	transfer_strategy varchar NOT NULL,
	transfer_rule_id int4 NULL,
	config_params jsonb DEFAULT '{}'::jsonb NOT NULL,
	is_enabled bool DEFAULT true NULL,
	CONSTRAINT store_transfer_config_article_unique UNIQUE (article),
	CONSTRAINT store_transfer_config_pkey PRIMARY KEY (config_id),
	CONSTRAINT transfer_rule_id_updated_by_fk FOREIGN KEY (transfer_rule_id) REFERENCES inventory_smart.store_transfer_rule(rule_id)
);

CREATE SEQUENCE IF NOT EXISTS inventory_smart.store_transfer_config_id_seq;
ALTER TABLE inventory_smart.store_transfer_config
    ALTER COLUMN config_id SET DEFAULT nextval('inventory_smart.store_transfer_config_id_seq');


