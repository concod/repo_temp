--liquibase formatted sql
--changeset liquibase:product_time_attributes stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_time_attributes
CREATE TABLE "global".product_time_attributes (
	product_code varchar NOT NULL,
	attribute_name varchar NOT NULL,
	attribute_value varchar NOT NULL,
	start_time date NOT NULL DEFAULT '1990-01-01'::date,
	end_time date NOT NULL DEFAULT '2099-12-31'::date,
	product_time_attr_id bigserial NOT NULL,
	CONSTRAINT product_time_attributes_check CHECK ((end_time >= start_time)),
	CONSTRAINT product_time_attributes_pk PRIMARY KEY (product_code, attribute_name, start_time, end_time)
)
PARTITION BY RANGE (start_time);
CREATE INDEX product_time_attributes_indx1 ON global.product_time_attributes USING btree (start_time);
CREATE INDEX product_time_attributes_indx2 ON global.product_time_attributes USING btree (attribute_name);
ALTER TABLE "global".product_time_attributes ADD CONSTRAINT product_time_attributes_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE;
ALTER TABLE "global".product_time_attributes ADD CONSTRAINT start_time_chk CHECK ((start_time <= '2051-12-31'::date));
ALTER TABLE "global".product_time_attributes ADD CONSTRAINT end_time_chk CHECK ((end_time <= '2099-12-31'::date));


--changeset kailash.yadav@impactanalytics.co:product_time_attributes stripComments:false splitStatements:false context:change_log labels:updated_by_column_add
--comment: change set to add column updated_by

ALTER TABLE "global".product_time_attributes ADD updated_by int4 NULL;
ALTER TABLE "global".product_time_attributes ADD CONSTRAINT product_time_attributes_updated_by_fk FOREIGN KEY (updated_by) REFERENCES global.user_master(user_code) ON DELETE SET NULL;


--changeset kailash.yadav@impactanalytics.co:product_time_attributes_partiion_l0_name stripComments:false splitStatements:false context:change_log labels:l0_name_partition_add
--comment: product_time_attributes_partiion_l0_name
DROP TABLE IF EXISTS "global".product_time_attributes_bkp;
CREATE TABLE "global".product_time_attributes_bkp
AS SELECT * FROM "global".product_time_attributes
;
DROP TABLE "global".product_time_attributes;
CREATE TABLE "global".product_time_attributes (
	product_code varchar NOT NULL,
	attribute_name varchar NOT NULL,
	attribute_value varchar NOT NULL,
	start_time date NOT NULL DEFAULT '1990-01-01'::date,
	end_time date NOT NULL DEFAULT '2099-12-31'::date,
	product_time_attr_id bigserial NOT NULL,
	updated_by int4 NULL,
	l0_name varchar NOT NULL,
	CONSTRAINT end_time_chk CHECK ((end_time <= '2099-12-31'::date)),
	CONSTRAINT product_time_attributes_check CHECK ((end_time >= start_time)),
	CONSTRAINT product_time_attributes_pk PRIMARY KEY (product_code, attribute_name, start_time, l0_name),
	CONSTRAINT start_time_chk CHECK ((start_time <= '2051-12-31'::date))
)
PARTITION BY LIST (l0_name);
CREATE INDEX product_time_attributes_indx1 ON  global.product_time_attributes USING btree (start_time);
CREATE INDEX product_time_attributes_indx2 ON  global.product_time_attributes USING btree (product_code);
CREATE UNIQUE INDEX product_time_attributes_un ON global.product_time_attributes USING btree (product_code, attribute_name, start_time, l0_name);
-- "global".product_time_attributes foreign keys
ALTER TABLE "global".product_time_attributes ADD CONSTRAINT product_time_attributes_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE;
ALTER TABLE "global".product_time_attributes ADD CONSTRAINT product_time_attributes_updated_by_fk FOREIGN KEY (updated_by) REFERENCES "global".user_master(user_code) ON DELETE SET NULL;

--changeset swapnil.bhange:product_time_attributes_partiion_updated_at stripComments:false splitStatements:false context:change_log labels:001
--comment: changeset to add updated_at column
ALTER TABLE "global".product_time_attributes ADD column if not exists updated_at date NULL;

--changeset linu.nazil:product_time_attributes_partiion_v2 stripComments:false splitStatements:false context:change_log labels:product_status_list_sp_optimization
--comment: changeset to add new index for product_status_list sp.
CREATE INDEX if not exists l0_name_attributes_idx ON global.product_time_attributes USING btree (l0_name, attribute_name);

--changeset akshay.jain:product_time_attributes_updated_at stripComments:false splitStatements:false context:first_commit labels:product_time_attributes_updated_at_1
--comment: changed datatype of updated at column to timestamp
alter table global.product_time_attributes ALTER column updated_at type timestamptz;

--changeset ashish:product_time_attributes_partiion_v2 stripComments:false splitStatements:false context:change_log labels:product_status_list_sp_optimization
--comment: changeset to add new index for product_status_list sp.
DROP INDEX IF EXISTS global.l0_name_attributes_idx;
CREATE INDEX if not exists l0_name_attributes_idx ON global.product_time_attributes USING btree (l0_name, attribute_name);
