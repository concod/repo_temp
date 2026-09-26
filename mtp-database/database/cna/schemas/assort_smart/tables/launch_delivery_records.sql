--liquibase formatted sql
--changeset mayank.bhardwaj@impactanalytics.co :assort_smart.launch_delivery_records stripComments:false splitStatements:false context:MTP-70241 labels:create_table
--comment: initial changeset for launch_delivery_records


CREATE TABLE IF not exists assort_smart.launch_delivery_records (
	id serial4 NOT NULL,
	attribute_name varchar NOT NULL,
	order_of_display float8 NOT NULL,
	display_name varchar NULL,
	records_type varchar NOT NULL,
	CONSTRAINT launch_delivery_records_pkey PRIMARY KEY (id)
);