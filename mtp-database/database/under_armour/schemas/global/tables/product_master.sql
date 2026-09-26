--liquibase formatted sql
--changeset mayank.mukundam@impactanalytics.co:product_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_master

DROP TABLE IF EXISTS "global".product_master CASCADE;

CREATE TABLE "global".product_master (
	product_code varchar NOT NULL,
	product_name varchar NOT NULL,
	product_description text NULL,
	active bool DEFAULT true NOT NULL,
	created_at timestamptz DEFAULT now() NULL,
	updated_at timestamptz DEFAULT now() NULL,
	created_by int4 NULL,
	updated_by int4 NULL,
	is_deleted bool DEFAULT false NULL,
	price float8 NULL,
	"cost" float8 NULL,
	original_price float8 NULL,
	clearance bool DEFAULT false NOT NULL,
	receipt_date date NULL,
	replacement_product_codes _varchar DEFAULT '{}'::character varying[] NULL,
	reference_product_codes _varchar DEFAULT '{}'::character varying[] NULL,
	CONSTRAINT product_master_pk PRIMARY KEY (product_code),
	CONSTRAINT product_master_created_by_fk FOREIGN KEY (created_by) REFERENCES "global".user_master(user_code) ON DELETE SET NULL,
	CONSTRAINT product_master_updated_by_fk FOREIGN KEY (updated_by) REFERENCES "global".user_master(user_code) ON DELETE SET NULL
);