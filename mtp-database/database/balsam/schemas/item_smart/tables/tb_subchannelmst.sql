--liquibase formatted sql
--changeset abhimanyu.j@impactanalytics.co:tb_subchannelmst stripComments:false splitStatements:false context:Release_1_0 labels:itemsmart_initial_commit
--comment: initial changeset for tb_subchannelmst
CREATE TABLE item_smart.tb_subchannelmst (
	id serial4 NOT NULL,
	channel varchar NOT NULL,
	sub_channel varchar NOT NULL,
	remarks text NULL,
	added_on timestamp NULL,
	is_active bool NOT NULL,
	CONSTRAINT tb_subchannelmst_id_key UNIQUE (id),
	CONSTRAINT tb_subchannelmst_pkey PRIMARY KEY (channel, sub_channel, is_active)
);