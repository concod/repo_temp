--liquibase formatted sql
--changeset aiyush.prasad:new_store_attributes stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for new_store_attributes

CREATE TABLE "global".new_store_attributes (
	store_code varchar NOT NULL,
	opening_date date NULL,
	sister_store_mapping_date date NULL,
	store_group_mapping_date date NULL,
	store_groups _varchar DEFAULT ARRAY[]::character varying[] NULL,
    is_deleted BOOLEAN DEFAULT false,
	CONSTRAINT pk PRIMARY KEY (store_code)
);
CREATE INDEX new_store_attributes_indx1 ON global.new_store_attributes USING btree (store_code);

--changeset aiyush.prasad@impactanalytics.co:add_column stripComments:false splitStatements:false context:add_column labels:add_column
--comment: add_column
ALTER TABLE global.new_store_attributes ADD COLUMN IF NOT EXISTS reservation_start_date date NULL;
--changeset aiyush.prasad@impactanalytics.co:add_column1 stripComments:false splitStatements:false context:add_column labels:add_column
--comment: add_column
ALTER TABLE global.new_store_attributes ADD COLUMN IF NOT EXISTS status int2 NULL;