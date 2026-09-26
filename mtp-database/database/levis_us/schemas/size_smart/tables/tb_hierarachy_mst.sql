-- liquibase formatted sql
-- changeset akashkumar.rana@impactanalytics.co:tb_hierarachy_mst_modification_changes_01    stripComments:false splitStatements:false context:tb_hierarachy_mst_modification_changes_01 labels:tb_hierarachy_mst_modification_changes_01
-- comment: update changeset for tb_hierarachy_mst_modification

CREATE TABLE size_smart.tb_hierarachy_mst (
	id serial4 NOT NULL,
	l0_name varchar(255) NOT NULL,
	l1_name varchar(255) NULL,
	l2_name varchar(255) NULL,
	l3_name varchar(255) NULL,
	l4_name varchar(255) NULL,
	l5_name varchar(255) NULL,
	l6_name varchar(255) NULL,
	l7_name varchar(255) NULL,
	l8_name varchar(255) NULL,
	l9_name varchar(255) NULL,
	l10_name varchar(255) NULL,
	l11_name varchar(255) NULL,
	"level" int4 NOT NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT tb_hierarachy_mst_l0_name_l1_name_l2_name_l3_name_l4_name_l_key UNIQUE (l0_name, l1_name, l2_name, l3_name, l4_name, l5_name, l6_name, l7_name, l8_name, l9_name, l10_name, l11_name),
	CONSTRAINT tb_hierarachy_mst_pkey PRIMARY KEY (id),
	CONSTRAINT unique_l0_l8_l9 UNIQUE (l0_name, l8_name, l9_name)
);
CREATE INDEX idx_hierarachy_composite ON size_smart.tb_hierarachy_mst USING btree (level, l0_name, l1_name, l2_name, l3_name, l4_name, l5_name, l6_name, l7_name, l8_name, l9_name);
CREATE INDEX idx_hierarachy_mst_level_l7 ON size_smart.tb_hierarachy_mst USING btree (level, l9_name);
CREATE INDEX idx_hierarachy_mst_level_l9 ON size_smart.tb_hierarachy_mst USING btree (level, l11_name);
CREATE INDEX idx_hierarachy_paths ON size_smart.tb_hierarachy_mst USING btree (l0_name, l1_name, l3_name, l4_name, l5_name, l6_name, l7_name, l8_name, l9_name) WHERE (level = 10);
CREATE INDEX idx_hierarchy_l0 ON size_smart.tb_hierarachy_mst USING btree (l0_name);

-- changeset aaqib.khan@impactanalytics.co:size grid colum addition stripComments:false splitStatements:false context:size grid colum addition  labels:size grid colum addition 
-- comment: size grid colum addition 
ALTER TABLE size_smart.tb_hierarachy_mst
ADD COLUMN IF NOT EXISTS size_grid_name VARCHAR(255);

-- changeset akashkumar.rana@impactanalytics.co:IMAGE URL addition stripComments:false splitStatements:false context:IMAGE URL addition  labels:IMAGE URL addition 
-- comment: ADD IMAGE URL COLUMN
ALTER TABLE size_smart.tb_hierarachy_mst
ADD COLUMN image_url text NULL;

ALTER TABLE size_smart.tb_hierarachy_mst
ADD COLUMN article_version varchar(255) DEFAULT 'old'::character varying NULL;