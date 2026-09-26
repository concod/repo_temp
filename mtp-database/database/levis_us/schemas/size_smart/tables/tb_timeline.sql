-- liquibase formatted sql
-- changeset akashkumar.rana@impactanalytics.co:tb_timeline_modifications stripComments:false splitStatements:false context:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS labels:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS 
-- comment: updated changeset for tb_timeline

CREATE TABLE  size_smart.tb_timeline (
	id serial4 NOT NULL,
	"name" varchar(255) NOT NULL,
	start_date date NOT NULL,
	end_date date NOT NULL,
	weightage float4 NOT NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT tb_timeline_id_key UNIQUE (id),
	CONSTRAINT tb_timeline_pkey PRIMARY KEY (name, id)
);
CREATE INDEX  idx_timeline_date_range ON size_smart.tb_timeline USING btree (start_date, end_date);
CREATE INDEX  idx_timeline_end_date ON size_smart.tb_timeline USING btree (end_date);
CREATE INDEX  idx_timeline_start_date ON size_smart.tb_timeline USING btree (start_date);


-- changeset akashkumar.rana@impactanalytics.co:tb_timeline_modifications_01 stripComments:false splitStatements:false context:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS-01 labels:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS-01	 
-- comment: updated changeset for tb_timeline_modifications_01

ALTER TABLE size_smart.tb_timeline 
ADD COLUMN time_value varchar(255) null;

ALTER TABLE size_smart.tb_timeline 
ADD COLUMN time_key varchar(255) null;

