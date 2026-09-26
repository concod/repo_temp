-- liquibase formatted sql
-- changeset akashkumar.rana@impactanalytics.co:tb_store_hierarchy_mst_modifications stripComments:false splitStatements:false context:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS labels:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS 
-- comment: updated changeset for tb_store_hierarchy_mst

CREATE TABLE  size_smart.tb_store_hierarchy_mst (
	id serial4 NOT NULL,
	state varchar(255) DEFAULT ''::character varying NULL,
	district varchar(255) DEFAULT ''::character varying NULL,
	store_cluster varchar(255) DEFAULT ''::character varying NULL,
	store_grade varchar(255) DEFAULT ''::character varying NULL,
	store_name varchar(255) NOT NULL,
	store_code varchar(255) NOT NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT tb_store_hierarchy_mst_id_key UNIQUE (id),
	CONSTRAINT tb_store_hierarchy_mst_pkey PRIMARY KEY (store_name, store_code),
	CONSTRAINT unique_store_code UNIQUE (store_code)
);