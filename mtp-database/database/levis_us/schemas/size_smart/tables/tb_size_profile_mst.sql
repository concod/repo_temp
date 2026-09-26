-- liquibase formatted sql
-- changeset akashkumar.rana@impactanalytics.co:tb_size_profile_mst_modifications stripComments:false splitStatements:false context:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS labels:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS 
-- comment: updated changeset for tb_size_profile_mst

CREATE TABLE  size_smart.tb_size_profile_mst (
	id serial4 NOT NULL,
	"name" varchar(255) NOT NULL,
	rule_config_id int4 NULL,
	status varchar(255) DEFAULT 'NOT RUNNING'::character varying NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT tb_size_profile_mst_id_key UNIQUE (id),
	CONSTRAINT tb_size_profile_mst_pkey PRIMARY KEY (name),
	CONSTRAINT tb_size_profile_mst_rule_config_id_fkey FOREIGN KEY (rule_config_id) REFERENCES size_smart.tb_rule_config(id)
);
CREATE INDEX  idx_tb_size_profile_mst_id ON size_smart.tb_size_profile_mst USING btree (id);

-- changeset akashkumar.rana@impactanalytics.co:tb_size_profile_mst_modifications_01 stripComments:false splitStatements:false context:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS-01 labels:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS-01 
-- comment: updated changeset for tb_size_profile_mst_modifications_01

ALTER TABLE size_smart.tb_size_profile_mst 
ADD COLUMN description varchar(255) NULL;


-- changeset rishabh.kumar@impactanalytics.co:add_tag_column stripComments:false splitStatements:false context:add_tag_column labels:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS-01 
-- comment: add add_tag_column
ALTER TABLE size_smart.tb_size_profile_mst 
ADD COLUMN tag varchar(255) NULL;

ALTER TABLE size_smart.tb_size_profile_mst 
ADD COLUMN updated_by int4 NULL;



-- changeset akashkumar.rana@impactanalytics.co:tb_size_profile_mst_modifications_02 stripComments:false splitStatements:false context:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS-02 labels:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS-02 
-- comment: initial changeset for add constraint tb_size_profile_mst_02

ALTER TABLE size_smart.tb_size_profile_mst
ADD COLUMN hierarchy jsonb NULL;


