--liquibase formatted sql
--changeset liquibase:store_time_attributes stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for store_time_attributes
CREATE TABLE "global".store_time_attributes (
	store_code varchar NOT NULL,
	attribute_name varchar NOT NULL,
	attribute_value varchar NOT NULL,
	start_time date NOT NULL DEFAULT '1990-01-01'::date,
	end_time date NOT NULL DEFAULT '2045-12-31'::date,
	store_time_attr_id bigserial NOT NULL,
	CONSTRAINT store_time_attributes_check CHECK ((end_time >= start_time))
)
PARTITION BY RANGE (start_time);
CREATE INDEX store_time_attributes_indx ON global.store_time_attributes USING btree (start_time);
CREATE INDEX store_time_attributes_indx1 ON global.store_time_attributes USING btree (attribute_name);
CREATE UNIQUE INDEX store_time_attributes_store_code_idx ON global.store_time_attributes USING btree (store_code, attribute_name, start_time, end_time);
ALTER TABLE "global".store_time_attributes ADD CONSTRAINT store_time_attributes_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE;
ALTER TABLE "global".store_time_attributes ADD CONSTRAINT start_time_chk CHECK ((start_time <= '2051-12-31'::date));
ALTER TABLE "global".store_time_attributes ADD CONSTRAINT end_time_chk CHECK ((end_time <= '2099-12-31'::date));


--changeset kailash.yadav@impactanalytics.co:product_mapping_product_store stripComments:false splitStatements:false context:change_log labels:updated_by_column_add
--comment: change set to add column updated_by

ALTER TABLE "global".store_time_attributes ADD updated_by int4 NULL;

ALTER TABLE "global".store_time_attributes ADD CONSTRAINT store_time_attributes_updated_by_fk FOREIGN KEY (updated_by) REFERENCES global.user_master(user_code) ON DELETE SET NULL;

--changeset akshay.jain:store_time_attributes_updated_at stripComments:false splitStatements:false context:first_commit labels:store_time_attributes_updated_at_1
--comment: changed datatype of updated at column to timestamp
alter table global.store_time_attributes ADD COLUMN IF NOT EXISTS updated_at timestamptz;

