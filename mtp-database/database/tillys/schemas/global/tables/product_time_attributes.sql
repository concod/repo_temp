--liquibase formatted sql
--changeset gauri.nair@impactanalytics.co:product_time_attributes_tillys_feb2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts_2Feb
--comment: initial changeset for product_time_attributes_feb2
--rollback: SELECT 1

CREATE TABLE if not exists "global".product_time_attributes (
	product_code varchar NOT NULL,
	attribute_name varchar NOT NULL,
	attribute_value varchar NOT NULL,
	start_time date DEFAULT '1990-01-01'::date NOT NULL,
	end_time date DEFAULT '2099-12-31'::date NOT NULL,
	product_time_attr_id bigserial NOT NULL,
	updated_by int4 NULL,
	l0_name varchar NOT NULL,
	updated_at timestamptz NULL,
	CONSTRAINT end_time_chk CHECK ((end_time <= '2099-12-31'::date)),
	CONSTRAINT product_time_attributes_check CHECK ((end_time >= start_time)),
	CONSTRAINT product_time_attributes_pk PRIMARY KEY (product_code, attribute_name, start_time, l0_name),
	CONSTRAINT start_time_chk CHECK ((start_time <= '2051-12-31'::date)),
	CONSTRAINT product_time_attributes_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE,
	CONSTRAINT product_time_attributes_updated_by_fk FOREIGN KEY (updated_by) REFERENCES "global".user_master(user_code) ON DELETE SET NULL
)
PARTITION BY LIST (l0_name);
CREATE INDEX if not exists l0_name_attributes_idx ON global.product_time_attributes USING btree (l0_name, attribute_name);
CREATE INDEX if not exists product_time_attributes_indx1 ON global.product_time_attributes USING btree (start_time);
CREATE INDEX if not exists product_time_attributes_indx2 ON global.product_time_attributes USING btree (product_code);
CREATE UNIQUE INDEX if not exists product_time_attributes_un ON global.product_time_attributes USING btree (product_code, attribute_name, start_time, l0_name);


--changeset gauri.nair@impactanalytics.co:product_time_attributes_tillys_feb02 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts_feb02
--comment: initial changeset for product_time_attributes_vf
alter table "global".product_time_attributes add column if not exists department varchar null ;
alter table "global".product_time_attributes add column if not exists subdepartment varchar null ;
alter table "global".product_time_attributes add column if not exists class varchar null ;
alter table "global".product_time_attributes add column if not exists subclass varchar null ;
alter table "global".product_time_attributes add column if not exists style_color_desc varchar null ;
alter table "global".product_time_attributes add column if not exists color_id_name varchar null ;
alter table "global".product_time_attributes add column if not exists vendor_name varchar null ;


