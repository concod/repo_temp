-- liquibase formatted sql
-- changeset akashkumar.rana@impactanalytics.co:tb_rule_config_modifications_02 stripComments:false splitStatements:false context:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS-02 labels:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS-02 
-- comment: updated changeset for tb_rule_config_02


CREATE TABLE IF NOT EXISTS size_smart.tb_rule_config (
	id serial4 NOT NULL,
	"name" varchar(255) NOT NULL,
	description varchar(255) NULL,
	"type" varchar(255) NOT NULL,
	tag varchar(255) NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	levels jsonb NULL,
	created_by int4 NULL,
	CONSTRAINT tb_rule_config_name_unique UNIQUE (name),
	CONSTRAINT tb_rule_config_pkey PRIMARY KEY (id)
);


-- changeset akashkumar.rana@impactanalytics.co:tb_rule_config_modifications_03 stripComments:false splitStatements:false context:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS-03 labels:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS-03 
-- comment: updated changeset for tb_rule_config_03

ALTER TABLE size_smart.tb_rule_config
ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT FALSE;


ALTER TABLE size_smart.tb_rule_config
ADD COLUMN status VARCHAR NOT NULL DEFAULT 'Active';



-- changeset akashkumar.rana@impactanalytics.co:tb_rule_config_modifications_04 stripComments:false splitStatements:false context:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS-04 labels:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS-04 
-- comment: updated changeset for tb_rule_config_03
alter table size_smart.tb_rule_config 
drop constraint tb_rule_config_name_unique;


-- changeset akashkumar.rana@impactanalytics.co:tb_rule_config_modifications_05 stripComments:false splitStatements:false context:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS-05 labels:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS-05 
-- comment: updated changeset for tb_rule_config_03
ALTER TABLE size_smart.tb_rule_config
ADD COLUMN updated_by int4 NULL;
