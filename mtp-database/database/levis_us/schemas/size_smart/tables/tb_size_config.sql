-- liquibase formatted sql
-- changeset akashkumar.rana@impactanalytics.co:tb_size_config_modifications stripComments:false splitStatements:false context:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS labels:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS 
-- comment: updated changeset for tb_size_config

CREATE TABLE  size_smart.tb_size_config (
	id serial4 NOT NULL,
	size_master_id int4 NOT NULL,
	source_id int4 NOT NULL,
	size_id int4 NOT NULL,
	"order" int4 NOT NULL,
	created_at timestamptz DEFAULT now() NULL,
	updated_at timestamptz DEFAULT now() NULL,
	CONSTRAINT tb_size_config_id_key UNIQUE (id),
	CONSTRAINT tb_size_config_pkey PRIMARY KEY (source_id, size_id, size_master_id),
	CONSTRAINT tb_size_config_size_id_fkey FOREIGN KEY (size_id) REFERENCES size_smart.tb_size(id),
	CONSTRAINT tb_size_config_size_master_id_fkey FOREIGN KEY (size_master_id) REFERENCES size_smart.tb_size_config_mst(id),
	CONSTRAINT tb_size_config_source_id_fkey FOREIGN KEY (source_id) REFERENCES size_smart.tb_source(id)
);
CREATE INDEX  idx_size_config_size_id ON size_smart.tb_size_config USING btree (size_id);
CREATE INDEX  idx_size_config_size_master_id ON size_smart.tb_size_config USING btree (size_master_id);
CREATE INDEX  idx_tb_size_config_size_id ON size_smart.tb_size_config USING btree (size_id);
CREATE INDEX  idx_tb_size_config_size_master_id ON size_smart.tb_size_config USING btree (size_master_id);
CREATE INDEX  idx_tb_size_config_source_id ON size_smart.tb_size_config USING btree (source_id);

-- changeset aaqib.khan@impactanalytics.co:add_planning_group stripComments:false splitStatements:false context:add_planning_group labels:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS-01 
-- comment: updated changeset for tb_size_config modifications_01

-- Drop the incorrect foreign key referencing tb_size_1
ALTER TABLE size_smart.tb_size_config 
DROP CONSTRAINT IF EXISTS tb_size_config_size_id_fkey;

-- Add the correct foreign key referencing tb_size
ALTER TABLE size_smart.tb_size_config 
ADD CONSTRAINT tb_size_config_size_id_fkey 
FOREIGN KEY (size_id) REFERENCES size_smart.tb_size(id);
