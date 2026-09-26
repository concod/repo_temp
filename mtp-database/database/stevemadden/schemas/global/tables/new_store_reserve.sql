--liquibase formatted sql
--changeset manohara.gulla@impactanalytics.co:new_store_reserve stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment:  new_store_reserve intial setup
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
	forecast_estimated int4 NULL,
	store_grade varchar NULL,
	wos float4 NULL,
	min_stock float4 NULL,
	max_stock float4 NULL,
	channel varchar NULL,
	mapping_code int4 NULL,
    alt_store_code varchar NULL,
	CONSTRAINT new_store_reserve_un UNIQUE (store_code, product_code, sister_store_code)
);
CREATE INDEX idx_store_code ON global.new_store_reserve USING btree (store_code);
CREATE INDEX idx_store_groups ON global.new_store_reserve USING gin (store_groups);

--changeset manohara.gulla@impactanalytics.co:retail_facility_code stripComments:false splitStatements:false context:Release_1_0 labels:MTP-36960
--comment: adding extra column to fecilitate retail facility code changes
ALTER TABLE "global".new_store_reserve ADD COLUMN if not exists alt_store_code varchar NULL;
ALTER TABLE "global".new_store_reserve ADD COLUMN if not exists alt_sister_store_code varchar NULL;

--changeset ananya.gupta@impactanalytics.co:MTP-78604-fix splitStatements:false context:Release_1_0 labels:MTP-78604
--comment: Fixing primary key constraint on new_store_reserve

ALTER TABLE "global".new_store_reserve
    DROP CONSTRAINT IF EXISTS new_store_reserve_pk;
ALTER TABLE "global".new_store_reserve ADD CONSTRAINT new_store_reserve_pk PRIMARY KEY (store_code, product_code, sister_store_code);
