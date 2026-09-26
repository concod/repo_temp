--liquibase formatted sql
--changeset anshuman.ghosh@impactanalytics.co:new_store_reserve_allocation_results_0_0_1 stripComments:false splitStatements:false context:RELEASE_1_0_0 labels:JIRA_NO 
--comment Add comment describing your change 

 -- "global".new_store_reserve_allocation_results definition

-- Drop table

-- DROP TABLE "global".new_store_reserve_allocation_results;

CREATE TABLE "global".new_store_reserve_allocation_results (
	inventory_source text NULL,
	article text NULL,
	style_id text NULL,
	"size" text NULL,
	store_code text NULL,
	actual_reserved float8 NULL,
	created_at timestamptz NULL DEFAULT CURRENT_TIMESTAMP,
	released_at timestamptz NULL DEFAULT CURRENT_TIMESTAMP,
	release_status bool NULL DEFAULT false,
	allocation_name varchar NULL,
	released_by varchar NULL,
	updated_at date NULL,
	original_reserved float8 NULL,
	pack_dc_allocation jsonb NULL,
	product_code text NULL,
	dc_codes _varchar NULL
);

--rollback TYPE YOUR ROLLBACK IF POSSIBLE OR TYPE SELECT 1 ;

--changeset kamalesh.k:new_store_reserve_allocation_results stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding primary key to new_store_reserve_allocation_results table

ALTER TABLE global.new_store_reserve_allocation_results
Add column new_store_reserve_allocation_results_code serial4,
ADD CONSTRAINT new_store_reserve_allocation_results_pkey PRIMARY KEY (new_store_reserve_allocation_results_code);
