--liquibase formatted sql
--changeset pulimallika.teja@impactanalytics.co :assort_smart.product_image_details stripComments:false splitStatements:false context:MTP-70241 labels:create_table
--comment: initial changeset for product_image_details

CREATE TABLE IF not exists assort_smart.product_image_details (
	image_id serial4 NOT NULL,
	records_type varchar NULL,
	hierarchy_code varchar NOT NULL,
	attribute_name varchar NOT NULL,
	attribute_value jsonb NOT NULL,
	image_url varchar NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT image_id_pk PRIMARY KEY (image_id),
	CONSTRAINT product_image_details_un UNIQUE (records_type, hierarchy_code, attribute_name, attribute_value)
);