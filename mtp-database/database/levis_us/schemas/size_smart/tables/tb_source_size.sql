-- liquibase formatted sql
-- changeset akashkumar.rana@impactanalytics.co:tb_source_size_modifications stripComments:false splitStatements:false context:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS labels:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS 
-- comment: updated changeset for tb_source_size

CREATE TABLE  size_smart.tb_source_size (
	id serial4 NOT NULL,
	size_id int4 NOT NULL,
	source_id int4 NOT NULL,
	created_at timestamptz DEFAULT now() NULL,
	updated_at timestamptz DEFAULT now() NULL,
	"order" int4 NULL,
	CONSTRAINT tb_source_size_pkey PRIMARY KEY (size_id, source_id),
	CONSTRAINT tb_source_size_size_id_fkey FOREIGN KEY (size_id) REFERENCES size_smart.tb_size(id),
	CONSTRAINT tb_source_size_source_id_fkey FOREIGN KEY (source_id) REFERENCES size_smart.tb_source(id)
);
CREATE INDEX  idx_tb_source_size_size_id ON size_smart.tb_source_size USING btree (size_id);
CREATE INDEX  idx_tb_source_size_source_id ON size_smart.tb_source_size USING btree (source_id);




-- changeset akashkumar.rana@impactanalytics.co:add_planning_group stripComments:false splitStatements:false context:add_planning_group labels:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS-01 
-- comment: updated changeset for tb_size_config_mst_modifications_02
ALTER TABLE size_smart.tb_source_size
add column planning_group_name varchar null;

ALTER TABLE size_smart.tb_source_size
drop CONSTRAINT tb_source_size_pkey;

ALTER TABLE size_smart.tb_source_size
ADD CONSTRAINT tb_source_size_planning_pkey UNIQUE (size_id, source_id, planning_group_name);


-- changeset aaqib.khan@impactanalytics.co:updated_constraints stripComments:false splitStatements:false context:add_planning_group labels:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS-01 
-- comment:  updated constraints

ALTER TABLE size_smart.tb_source_size
DROP CONSTRAINT IF EXISTS tb_source_size_size_id_fkey;

ALTER TABLE size_smart.tb_source_size
ADD CONSTRAINT tb_source_size_size_id_fkey
FOREIGN KEY (size_id) REFERENCES size_smart.tb_size(id);






