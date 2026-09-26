-- liquibase formatted sql
-- changeset shrinidhi.choragi@impactanalytics.co:product_time_attributes stripComments:false splitStatements:false context: db_sync labels:product_time_attributes
-- comment: initial changeset for product_time_attributes
CREATE TABLE IF NOT EXISTS "global".product_time_attributes (
	product_code varchar NOT NULL,
	attribute_name varchar NOT NULL,
	attribute_value varchar NOT NULL,
	start_time date DEFAULT '1990-01-01'::date NOT NULL,
	end_time date DEFAULT '2099-12-31'::date NOT NULL,
	product_time_attr_id bigserial NOT NULL,
	updated_by int4 NULL,
	l0_name varchar NOT NULL,
	updated_at date NULL,
	CONSTRAINT end_time_chk CHECK ((end_time <= '2099-12-31'::date)),
	CONSTRAINT product_time_attributes_check CHECK ((end_time >= start_time)),
	CONSTRAINT product_time_attributes_pk PRIMARY KEY (product_code, attribute_name, start_time, l0_name),
	CONSTRAINT start_time_chk CHECK ((start_time <= '2051-12-31'::date)),
	CONSTRAINT product_time_attributes_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE,
	CONSTRAINT product_time_attributes_updated_by_fk FOREIGN KEY (updated_by) REFERENCES "global".user_master(user_code) ON DELETE SET NULL
)
PARTITION BY LIST (l0_name);
CREATE INDEX IF NOT EXISTS product_time_attributes_indx1 ON global.product_time_attributes USING btree (start_time);
CREATE INDEX IF NOT EXISTS product_time_attributes_indx2 ON global.product_time_attributes USING btree (product_code);
CREATE UNIQUE INDEX IF NOT EXISTS product_time_attributes_un ON global.product_time_attributes USING btree (product_code, attribute_name, start_time, l0_name);