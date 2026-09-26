--liquibase formatted sql
--changeset maohara.gulla@impactanalytics.co:new_store_reserve stripComments:false splitStatements:false context:victorias_secret_inventory_smart labels:MTP-55016
--comment: initial changeset for new_store_reserve
CREATE TABLE "global".new_store_reserve (
	store_code varchar NULL,
	product_code varchar NULL,
	"size" varchar NULL,
	article varchar NULL,
	opening_date date NULL,
	reservation_date date NULL,
	original_reserved int4 NULL,
	remaining_reserved int4 NULL,
	created_at timestamptz DEFAULT now() NULL,
	approved bool DEFAULT false NULL,
	created_by varchar NULL,
	sister_store_code varchar NULL,
	editable bool DEFAULT true NULL,
	sister_store_mapping_date date NULL,
	edit_details jsonb NULL,
	store_group_mapping_date date NULL,
	store_groups _varchar NULL,
	mapped bool DEFAULT false NULL,
	forecast_estimated int4 NULL,
	store_grade varchar NULL,
	wos float4 NULL,
	min_stock float4 NULL,
	max_stock float4 NULL,
	channel varchar NULL,
	mapping_code int4 NULL,
	CONSTRAINT new_store_reserve_un UNIQUE (store_code, product_code, sister_store_code)
);
CREATE INDEX idx_store_code ON global.new_store_reserve USING btree (store_code);
CREATE INDEX idx_store_groups ON global.new_store_reserve USING gin (store_groups);

--changeset manohara.gulla@impactanalytics.co:new_store_attributes stripComments:false splitStatements:false context:VS_inv_smart labels:MTP-55016
--comment: Updated Schema based on requirement
ALTER TABLE "global".new_store_reserve ADD approved_qty int4 NULL ;
ALTER TABLE "global".new_store_reserve ADD released_qty int4 NULL ;
ALTER TABLE "global".new_store_reserve ADD released bool NULL ;

--changeset manohara.gulla@impactanalytics.co:new_store_reserve_V1 stripComments:false splitStatements:false context:VS_inv_smart labels:MTP-55016
--comment: Updated Schema based on requirement
ALTER TABLE "global".new_store_reserve drop constraint if exists new_store_reserve_un;
ALTER TABLE "global".new_store_reserve ADD CONSTRAINT new_store_reserve_un UNIQUE (store_code, product_code);

--changeset anujkumar.singh@impactanalytics.co:new_store_reserve_v3 stripComments:false splitStatements:false context:Victorias_Secret_InventorySmart labels:VS-403
--comment: Adding remodel store related columns
ALTER TABLE global.new_store_reserve ADD COLUMN IF NOT EXISTS remodel_flag BOOLEAN;

--changeset anujkumar.singh@impactanalytics.co:new_store_reserve_V4 stripComments:false splitStatements:false context:Victorias_Secret_InventorySmart labels:VS-403
--comment: Adding downstream_flag column
ALTER TABLE global.new_store_reserve ADD COLUMN IF NOT EXISTS downstream_flag BOOLEAN DEFAULT FALSE;

--changeset kamalesh.k@impactanalytics.co:new_store_reserve_pkey stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: primary key for new_store_reserve

ALTER TABLE "global".new_store_reserve
DROP CONSTRAINT IF EXISTS new_store_reserve_un;

ALTER TABLE "global".new_store_reserve ALTER COLUMN store_code SET NOT NULL;
ALTER TABLE "global".new_store_reserve ALTER COLUMN product_code SET NOT NULL;

ALTER TABLE "global".new_store_reserve
ADD CONSTRAINT new_store_reserve_pkey PRIMARY KEY (store_code, product_code);

--changeset kamuju.mahaveer@impactanalytics.co:new_store_reserve_V5 stripComments:false splitStatements:false context:Victorias_Secret_InventorySmart labels:VS
--comment: Adding past_releases column column
ALTER TABLE global.new_store_reserve ADD COLUMN IF NOT EXISTS past_releases int4 DEFAULT 0  NULL;

--changeset Piyush.kumar@impactanalytics.co:implement_soft_delete_new_store stripComments:false splitStatements:false context:Add_is_deleted_column labels:implement_soft_delete_new_store
--comment: insert is_deleted column for soft delete MTP-95506
ALTER TABLE global.new_store_reserve ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;


--changeset kamuju.mahaveer@impactanalytics.co:new_store_reserve_v7 stripComments:false splitStatements:false context:Victorias_Secret_InventorySmart labels:VS
--comment: Adding past_releases column column
ALTER TABLE global.new_store_reserve ADD COLUMN IF NOT EXISTS past_releases_yest int4 DEFAULT 0  NULL;

