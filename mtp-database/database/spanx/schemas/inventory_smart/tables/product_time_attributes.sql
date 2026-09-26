--liquibase formatted sql
--changeset liquibase:product_time_attributes stripComments:false splitStatements:false context:initial_release labels:liquibase_project_start
--comment: initial changeset for product_time_attributes
CREATE TABLE IF NOT EXISTS "global".product_time_attributes (
	product_code varchar NOT NULL,
	attribute_name varchar NOT NULL,
	attribute_value varchar NOT NULL,
	start_time date DEFAULT '1990-01-01'::date NOT NULL,
	end_time date DEFAULT '2099-12-31'::date NOT NULL,
	product_time_attr_id bigserial NOT NULL,
	updated_by int4 NULL,
	l0_name varchar NOT NULL,
	updated_at timestamptz NULL,
	created_at date NULL,
	created_by int4 NULL,
	CONSTRAINT end_time_chk CHECK ((end_time <= '2099-12-31'::date)),
	CONSTRAINT product_time_attributes_check CHECK ((end_time >= start_time)),
	CONSTRAINT product_time_attributes_pk PRIMARY KEY (product_code, attribute_name, start_time, l0_name),
	CONSTRAINT start_time_chk CHECK ((start_time <= '2051-12-31'::date)),
	CONSTRAINT product_time_attributes_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE,
	CONSTRAINT product_time_attributes_updated_by_fk FOREIGN KEY (updated_by) REFERENCES "global".user_master(user_code) ON DELETE SET NULL
);

--changeset kaustubh.gupta:product_time_attributes stripComments:false splitStatements:false context:initial_release labels:columns_add
--comment: schema change for product_time_attributes
ALTER TABLE "global".product_time_attributes 
ADD COLUMN created_at date,
ADD COLUMN created_by int4;

--changeset srishti.kumari:product_time_attributes stripComments:false splitStatements:false context:MTP-64793 labels:MTP-64793
--comment: end_time default value
ALTER TABLE "global".product_time_attributes ALTER COLUMN end_time SET DEFAULT '2050-12-31'::date;