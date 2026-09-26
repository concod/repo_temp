--liquibase formatted sql
--changeset pulimallika.teja@impactanalytics.co :assort_smart.sub_channel_details stripComments:false splitStatements:false context:MTP-51802 labels:add_missing_cols
--comment: initial changeset for status_details



CREATE TABLE IF not exists assort_smart.sub_channel_details (
	sub_channel_id serial4 NOT NULL,
	sub_channel_code varchar NOT NULL,
	channel_id int4 NOT NULL,
	CONSTRAINT sub_channel_details_pkey PRIMARY KEY (sub_channel_id),
	CONSTRAINT sub_channel_details_fk FOREIGN KEY (channel_id) REFERENCES assort_smart.channel_details(channel_id)
);