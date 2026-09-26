
--liquibase formatted sql
--changeset shrey.jaiswal@impactanalytics.co:tb_channelmst_01 stripComments:false splitStatements:false context:Release_1_0 labels:itemsmart_initial_commit
--comment: initial changeset for tb_channelmst
CREATE TABLE IF NOT EXISTS item_smart.tb_channelmst (
	id serial4 NOT NULL,
	"name" varchar NOT NULL,
	remarks text NULL,
	added_on timestamp NULL,
	is_active bool NOT NULL,
	CONSTRAINT tb_channelmst_id_key UNIQUE (id),
	CONSTRAINT tb_channelmst_pkey PRIMARY KEY (name, is_active)
);