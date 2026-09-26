--liquibase formatted sql
--changeset sreevathsa.sp@impactanalytics.co:new_store_attributes stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for new_store_attributes

CREATE TABLE IF NOT EXISTS "global".new_store_attributes (
	store_code varchar NULL,
	opening_date date NULL,
	sister_store_mapping_date date NULL,
	store_group_mapping_date date NULL,
	store_groups _varchar NULL DEFAULT ARRAY[]::character varying[],
	reservation_start_date date NULL,
	effective_date date NULL,
	temp_store_code varchar NULL,
	temp_opening_date date NULL,
	temp_legacy_store_mapping_date date NULL,
	temp_closing_date date NULL,
	temp_effective_date date NULL,
	legacy_store_code varchar NULL,
	legacy_closing_date date NULL,
	remodel_flag bool NULL
);
CREATE INDEX if not exists new_store_attributes_indx1 ON global.new_store_attributes USING btree (store_code);

--changeset shubhrant.yadav@impactanalytics.co:new_store_attributes_update_status stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:pacsun_article_inventory_dashboard_add_mandatory_columns
--comment: Add status column to new_store_attributes
ALTER TABLE global.new_store_attributes 
ADD COLUMN IF NOT EXISTS status int4 NULL;

--changeset Piyush.kumar@impactanalytics.co:implement_soft_delete_new_store stripComments:false splitStatements:false context:Add_is_deleted_column labels:implement_soft_delete_new_store
--comment: insert is_deleted column for soft delete MTP-95506
ALTER TABLE global.new_store_attributes ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

--changeset adesh@impactanalytics.co:new_store_attributes_v1 stripComments:false splitStatements:false context:new_store_attributes labels:new_store_attributes
--comment: new_store_attributes-pk-addition
ALTER TABLE global.new_store_attributes
ADD CONSTRAINT pk PRIMARY KEY (store_code);