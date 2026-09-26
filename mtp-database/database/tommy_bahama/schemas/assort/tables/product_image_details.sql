--liquibase formatted sql
--changeset liquibase:product_image_details_version_1 stripComments:false splitStatements:false context:uniqe_key_updated labels:liquibase_project_start
--comment: initial changeset for product_image_details


CREATE TABLE if not exists assort.product_image_details (
	image_id serial4 NOT NULL,
	records_type varchar NULL,
	hierarchy_code varchar NOT NULL,
	attribute_name varchar NOT NULL,
	attribute_value jsonb NOT NULL,
	image_url varchar NOT NULL,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT image_id_pk PRIMARY KEY (image_id),
	CONSTRAINT product_image_details_un UNIQUE (records_type, hierarchy_code, attribute_name, attribute_value)
);