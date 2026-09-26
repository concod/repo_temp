--liquibase formatted sql
--changeset pulimallika.teja@impactanalytics.co :assort_smart.channel_details stripComments:false splitStatements:false context:MTP-51802 labels:add_missing_cols
--comment: initial changeset for status_details





CREATE TABLE IF not exists assort_smart.channel_details (
	channel_id serial4 NOT NULL,
	channel_code varchar NOT NULL,
	CONSTRAINT channel_details_pkey PRIMARY KEY (channel_id)
);