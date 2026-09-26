--liquibase formatted sql
--changeset aman.lakkoju:new_store_attributes stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for new_store_attributes

CREATE TABLE "global".new_store_attributes (
	store_code varchar NOT NULL,
	opening_date date NULL,
	sister_store_mapping_date date NULL,
	store_group_mapping_date date NULL,
	store_groups _varchar DEFAULT ARRAY[]::character varying[] NULL,
	CONSTRAINT pk PRIMARY KEY (store_code)
);
CREATE INDEX new_store_attributes_indx1 ON global.new_store_attributes USING btree (store_code);

--changeset shreyansh.pandey@impactanalytics.co:new_store_attributes stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: reservation_date column added
ALTER TABLE "global".new_store_attributes 
ADD COLUMN reservation_date DATE NULL;
--changeset laraib.ahmad@impactanalytics.co:implement_soft_delete_new_store stripComments:false splitStatements:false context:Add_is_deleted_column labels:implement_soft_delete_new_store
--comment: sync the changes with CB
ALTER TABLE global.new_store_attributes ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

--changeset aman.lakkoju:status_addition stripComments:false splitStatements:false context:Add_is_deleted_column labels:status_addition
--comment: status_addition
ALTER TABLE global.new_store_attributes ADD COLUMN IF NOT EXISTS status varchar DEFAULT null;

--changeset aman_lakkoju:data_type_update stripComments:false splitStatements:false context:Add_is_deleted_column labels:data_type_update
--comment: data_type_update
ALTER TABLE global.new_store_attributes
ALTER COLUMN status TYPE int4
USING status::int4;