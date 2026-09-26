-- liquibase formatted sql
-- changeset akashkumar.rana@impactanalytics.co:tb_size_config_mst_modifications stripComments:false splitStatements:false context:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS labels:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS 
-- comment: updated changeset for tb_size_config_mst

CREATE TABLE  size_smart.tb_size_config_mst (
	id serial4 NOT NULL,
	"name" varchar NOT NULL,
	hash varchar NOT NULL,
	created_at timestamptz DEFAULT now() NULL,
	updated_at timestamptz DEFAULT now() NULL,
	CONSTRAINT tb_size_config_mst_id_key UNIQUE (id),
	CONSTRAINT tb_size_config_mst_name_key UNIQUE (name),
	CONSTRAINT tb_size_config_mst_pkey PRIMARY KEY (hash)
);

-- changeset akashkumar.rana@impactanalytics.co:tb_size_config_mst_modifications_01 stripComments:false splitStatements:false context:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS-01 labels:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS-01 
-- comment: updated changeset for tb_size_profile_mst_modifications_01

ALTER TABLE size_smart.tb_size_config_mst 
DROP CONSTRAINT tb_size_config_mst_name_key;	

ALTER TABLE size_smart.tb_size_config_mst 
DROP CONSTRAINT tb_size_config_mst_pkey;	

ALTER TABLE size_smart.tb_size_config_mst 
ADD CONSTRAINT tb_size_config_mst_hash_name_key UNIQUE (hash, name);

-- changeset akashkumar.rana@impactanalytics.co:add_planning_group stripComments:false splitStatements:false context:add_planning_group labels:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS-01 
-- comment: updated changeset for tb_size_config_mst_modifications_02
ALTER TABLE size_smart.tb_size_config_mst 
add column planning_group_name varchar null;


ALTER TABLE size_smart.tb_size_config_mst
drop CONSTRAINT tb_size_config_mst_hash_name_key;

ALTER TABLE size_smart.tb_size_config_mst
ADD CONSTRAINT tb_size_config_mst_name_pg_hash_key 
UNIQUE (name, planning_group_name, hash);

ALTER TABLE size_smart.tb_size_config_mst 
ADD COLUMN updated_by int4 NULL;

-- changeset aaqib.khan@impactanalytics.co:add_planning_group stripComments:false splitStatements:false context:add_planning_group labels:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS-01 
-- comment: updated changeset for tb_size_config_mst_modifications_03
-- Drop the incorrect composite unique constraint
ALTER TABLE size_smart.tb_size_config_mst 
DROP CONSTRAINT IF EXISTS tb_size_config_mst_name_pg_hash_key;

-- Add the correct unique constraint on hash
ALTER TABLE size_smart.tb_size_config_mst 
ADD CONSTRAINT tb_size_config_mst_hash_key UNIQUE (hash);

-- changeset aaqib.khan@impactanalytics.co:add_size_range_order stripComments:false splitStatements:false context:add_size_range_order labels:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS-04 
-- comment: updated changeset for tb_size_config_mst_modifications_04
ALTER TABLE size_smart.tb_size_config_mst
ADD COLUMN size_range_order jsonb NULL;
