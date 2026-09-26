--liquibase formatted sql
--changeset anshuman.ghosh@impactanalytics.co:new_store_reserve_0_0_1 stripComments:false splitStatements:false context:RELEASE_1_0_0 labels:JIRA_NO 
--comment Add comment describing your change 

-- "global".new_store_reserve definition

-- Drop table

-- DROP TABLE "global".new_store_reserve;

CREATE TABLE "global".new_store_reserve (
	store_code varchar NULL,
	product_code varchar NULL,
	"size" varchar NULL,
	article varchar NULL,
	opening_date date NULL,
	reservation_date date NULL,
	original_reserved int4 NULL,
	remaining_reserved int4 NULL,
	created_at timestamptz NULL DEFAULT now(),
	approved bool NULL DEFAULT false,
	created_by varchar NULL,
	sister_store_code varchar NULL,
	editable bool NULL DEFAULT true,
	sister_store_mapping_date date NULL,
	edit_details jsonb NULL,
	store_group_mapping_date date NULL,
	store_groups _varchar NULL,
	mapped bool NULL DEFAULT false,
	feature_estimed int4 NULL
);

--rollback TYPE YOUR ROLLBACK IF POSSIBLE OR TYPE SELECT 1 ;

--liquibase formatted sql
--changeset anshuman.ghosh@impactanalytics.co:new_store_reserve_0_0_2 stripComments:false splitStatements:false context:RELEASE_1_0_1 labels:JIRA_NO 
--comment Add comment describing your change 

ALTER TABLE "global".new_store_reserve ADD forecast_estimated int4 NULL;

--rollback TYPE YOUR ROLLBACK IF POSSIBLE OR TYPE SELECT 1 ;


--liquibase formatted sql
--changeset anshuman.ghosh@impactanalytics.co:new_store_reserve_0_0_3 stripComments:false splitStatements:false context:RELEASE_1_0_2 labels:JIRA_NO 
--comment Add comment describing your change 

ALTER TABLE "global".new_store_reserve ADD store_grade varchar NULL;
ALTER TABLE "global".new_store_reserve DROP COLUMN feature_estimed;

--rollback TYPE YOUR ROLLBACK IF POSSIBLE OR TYPE SELECT 1 ;


--changeset anshuman.ghosh@impactanalytics.co:new_store_reserve_0_0_4 stripComments:false splitStatements:false context:RELEASE_1_0_3 labels:JIRA_NO 
--comment Add comment describing your change 

 ALTER TABLE "global".new_store_reserve ADD CONSTRAINT new_store_reserve_un UNIQUE (store_code, product_code, sister_store_code);

--changeset anshuman.ghosh@impactanalytics.co:new_store_reserve_0_0_5 stripComments:false splitStatements:false context:RELEASE_1_0_5 labels:JIRA_NO 
--comment Add comment describing your change 
ALTER TABLE "global".new_store_reserve ADD wos float4 NULL;
ALTER TABLE "global".new_store_reserve ADD min_stock float4 NULL;
ALTER TABLE "global".new_store_reserve ADD max_stock float4 NULL;
ALTER TABLE "global".new_store_reserve ADD channel varchar NULL;

--changeset linu.nazil@impactanalytics.co:new_store_reserve_0_0_5 stripComments:false splitStatements:false context:RELEASE_1_0_5 labels:constraints
--comment Add comment describing your change 
-- Create a GIN index on new_store_reserve.store_groups
CREATE INDEX if not exists idx_store_groups ON "global".new_store_reserve USING GIN (store_groups);
CREATE INDEX if not exists idx_store_code ON "global".new_store_reserve (store_code);


--changeset sri.harsha@impactanalytics.co:new_store_reserve_0_0_6 stripComments:false splitStatements:false context:RELEASE_1_0_6 labels:constraints
--comment Add comment describing your change 
-- Create a GIN index on new_store_reserve.mapping_code
ALTER TABLE "global".new_store_reserve ADD mapping_code int4 NULL;

--changeset manohara.gulla@impactanalytics.co:retail_facility_code stripComments:false splitStatements:false context:Release_1_0 labels:MTP-36960
--comment: adding extra column to fecilitate retail facility code changes
ALTER TABLE "global".new_store_reserve ADD COLUMN if not exists alt_store_code varchar NULL;
ALTER TABLE "global".new_store_reserve ADD COLUMN if not exists alt_sister_store_code varchar NULL;


--changeset kamalesh.k@impactanalytics.co:new_store_reserve stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: primary key for new_store_reserve

ALTER TABLE "global".new_store_reserve
DROP CONSTRAINT IF EXISTS new_store_reserve_un;

ALTER TABLE "global".new_store_reserve ALTER COLUMN store_code SET NOT NULL;
ALTER TABLE "global".new_store_reserve ALTER COLUMN product_code SET NOT NULL;
ALTER TABLE "global".new_store_reserve ALTER COLUMN sister_store_code SET NOT NULL;

ALTER TABLE "global".new_store_reserve
ADD CONSTRAINT new_store_reserve_pkey PRIMARY KEY (store_code, product_code, sister_store_code);

--changeset Piyush.kumar@impactanalytics.co:implement_soft_delete_new_store stripComments:false splitStatements:false context:Add_is_deleted_column labels:implement_soft_delete_new_store
--comment: insert is_deleted column for soft delete MTP-95506
ALTER TABLE "global".new_store_reserve ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;