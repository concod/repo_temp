--liquibase formatted sql
--changeset rishabh.swarnkar@impactanalytics.co:view_save_config_v1 stripComments:false splitStatements:false context:Release_1_0 labels:itemsmart_initial_commit
--comment: initial changeset for view_save_config

CREATE SEQUENCE item_smart.view_save_config_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;

CREATE TABLE item_smart.view_save_config (
	save_config_id int4 DEFAULT nextval('item_smart.view_save_config_id_seq'::regclass) NOT NULL,
	"name" varchar(255) NOT NULL,
	created_by int4 NULL,
	updated_by int4 NULL,
	created_date date NULL,
	updated_date date NULL,
	attribute_value jsonb NULL,
	is_active bool DEFAULT true NULL,
	is_default bool DEFAULT false NULL,
	planing_level varchar(255) NULL,
	CONSTRAINT view_save_config_pkey PRIMARY KEY (save_config_id),
	CONSTRAINT view_save_config_created_by_fkey FOREIGN KEY (created_by) REFERENCES "global".user_master(user_code),
	CONSTRAINT view_save_config_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES "global".user_master(user_code)
);

--changeset rishabh.swarnkar@impactanalytics.co:view_save_config_v2 stripComments:false splitStatements:false context:Release_1_0 labels:itemsmart_initial_commit
--comment: initial changeset for view_save_config_alter_column_query

ALTER TABLE item_smart.view_save_config
ALTER COLUMN created_date TYPE TIMESTAMP USING created_date::timestamp;

ALTER TABLE item_smart.view_save_config
ALTER COLUMN updated_date TYPE TIMESTAMP USING updated_date::timestamp;