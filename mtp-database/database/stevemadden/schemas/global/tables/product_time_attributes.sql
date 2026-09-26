--liquibase formatted sql
--changeset navin.chandan@impactanalytics.co:product_time_attributes stripComments:false splitStatements:false context:Release_1_0 labels:product_time_attributes
--comment: initial changeset for product_time_attributes
--rollback: SELECT 1
CREATE TABLE if NOT exists  "global".product_time_attributes (
	product_code varchar NOT NULL,
	attribute_name varchar NOT NULL,
	attribute_value varchar NOT NULL,
	start_time date NOT NULL DEFAULT '1990-01-01'::date,
	end_time date NOT NULL DEFAULT '2099-12-31'::date,
	product_time_attr_id bigserial NOT NULL,
	updated_by int4 NULL,
	updated_at timestamptz NULL,
	l0_name varchar NULL,
	CONSTRAINT end_time_chk CHECK ((end_time <= '2099-12-31'::date)),
	CONSTRAINT product_time_attributes_check CHECK ((end_time >= start_time)),
	CONSTRAINT start_time_chk CHECK ((start_time <= '2051-12-31'::date)),
	CONSTRAINT product_time_attributes_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE,
	CONSTRAINT product_time_attributes_updated_by_fk FOREIGN KEY (updated_by) REFERENCES "global".user_master(user_code) ON DELETE SET NULL
)
PARTITION BY RANGE (start_time);
CREATE INDEX l0_name_attributes_idx ON global.product_time_attributes USING btree (attribute_name);
CREATE INDEX product_time_attributes_indx1 ON global.product_time_attributes USING btree (start_time);
CREATE INDEX product_time_attributes_indx2 ON global.product_time_attributes USING btree (product_code);
CREATE UNIQUE INDEX product_time_attributes_un ON global.product_time_attributes USING btree (product_code, attribute_name, start_time, end_time);

--changeset ananya.gupta@impactanalytics.co Comments:false splitStatements:false context:Release_1_0 labels:MTP-78604
--comment: MTP-78604 - adding   primary key
ALTER TABLE "global".product_time_attributes
    DROP CONSTRAINT IF EXISTS product_time_attributes_pk;
ALTER TABLE "global".product_time_attributes ADD CONSTRAINT product_time_attributes_pk PRIMARY KEY (product_code, attribute_name, start_time, l0_name);

