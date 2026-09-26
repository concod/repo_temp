--liquibase formatted sql
--changeset pooja.shekar@impactanalytics.co:new_store_reserve stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
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
	CONSTRAINT new_store_reserve_un UNIQUE (store_code, product_code, sister_store_code)
);
CREATE INDEX idx_store_code ON global.new_store_reserve USING btree (store_code);
CREATE INDEX idx_store_groups ON global.new_store_reserve USING gin (store_groups);

--changeset manohara.gulla@impactanalytics.co:retail_facility_code changes stripComments:false splitStatements:false context:Release_1_0 labels:MTP-36960
--comment: adding extra column to fecilitate retail facility code changes
ALTER TABLE "global".new_store_reserve ADD COLUMN alt_store_code varchar NULL;

--changeset gokulakrishnan.nagarajan@impactanalytics.co:MTP-60096 - Add columns for new store mapped articles stripComments:false splitStatements:false context:Release_1_0 labels:MTP-60096
--comment: MTP-60096 - Add columns for new store mapped articles
ALTER TABLE "global".new_store_reserve ADD COLUMN if not exists style_description varchar NULL;
ALTER TABLE "global".new_store_reserve ADD COLUMN if not exists store_name varchar NULL;
ALTER TABLE "global".new_store_reserve ADD COLUMN if not exists style_color_id varchar NULL;
ALTER TABLE "global".new_store_reserve ADD COLUMN if not exists group_division varchar NULL;
ALTER TABLE "global".new_store_reserve ADD COLUMN if not exists division varchar NULL;
ALTER TABLE "global".new_store_reserve ADD COLUMN if not exists department varchar NULL;
ALTER TABLE "global".new_store_reserve ADD COLUMN if not exists sub_department varchar NULL;
ALTER TABLE "global".new_store_reserve ADD COLUMN if not exists class varchar NULL;
ALTER TABLE "global".new_store_reserve ADD COLUMN if not exists sub_class varchar NULL;
ALTER TABLE "global".new_store_reserve ADD COLUMN if not exists brand varchar NULL;
ALTER TABLE "global".new_store_reserve ADD COLUMN if not exists allocated_quantity int4 NULL;
ALTER TABLE "global".new_store_reserve ADD COLUMN if not exists allocation_type int4 NULL;

DROP INDEX IF EXISTS "global".idx_store_groups;

--changeset gokulakrishnan.nagarajan@impactanalytics.co:MTP-60096-Rename_columns_for_new_store_mapped_articles stripComments:false splitStatements:false context:Release_1_0 labels:MTP-60096
--comment: MTP-60096-Rename_columns_for_new_store_mapped_articles
ALTER TABLE "global".new_store_reserve RENAME COLUMN group_division TO l0_name;
ALTER TABLE "global".new_store_reserve RENAME COLUMN division TO l1_name;
ALTER TABLE "global".new_store_reserve RENAME COLUMN department TO l2_name;
ALTER TABLE "global".new_store_reserve RENAME COLUMN sub_department TO l3_name;
ALTER TABLE "global".new_store_reserve RENAME COLUMN class TO l4_name;

ALTER TABLE "global".new_store_reserve DROP COLUMN sub_class;

--changeset gokulakrishnan.nagarajan@impactanalytics.co:MTP-60096-Remove_extra_columns_for_new_store_mapped_articles stripComments:false splitStatements:false context:Release_1_0 labels:MTP-60096
--comment: MTP-60096-Remove_extra_columns_for_new_store_mapped_articles
ALTER TABLE "global".new_store_reserve DROP COLUMN IF EXISTS product_code;
ALTER TABLE "global".new_store_reserve DROP COLUMN IF EXISTS opening_date;
ALTER TABLE "global".new_store_reserve DROP COLUMN IF EXISTS reservation_date;
ALTER TABLE "global".new_store_reserve DROP COLUMN IF EXISTS original_reserved;
ALTER TABLE "global".new_store_reserve DROP COLUMN IF EXISTS remaining_reserved;
ALTER TABLE "global".new_store_reserve DROP COLUMN IF EXISTS created_at;
ALTER TABLE "global".new_store_reserve DROP COLUMN IF EXISTS approved;
ALTER TABLE "global".new_store_reserve DROP COLUMN IF EXISTS created_by;
ALTER TABLE "global".new_store_reserve DROP COLUMN IF EXISTS sister_store_code;
ALTER TABLE "global".new_store_reserve DROP COLUMN IF EXISTS editable;
ALTER TABLE "global".new_store_reserve DROP COLUMN IF EXISTS sister_store_mapping_date;
ALTER TABLE "global".new_store_reserve DROP COLUMN IF EXISTS edit_details;
ALTER TABLE "global".new_store_reserve DROP COLUMN IF EXISTS store_group_mapping_date;
ALTER TABLE "global".new_store_reserve DROP COLUMN IF EXISTS store_groups;
ALTER TABLE "global".new_store_reserve DROP COLUMN IF EXISTS mapped;
ALTER TABLE "global".new_store_reserve DROP COLUMN IF EXISTS forecast_estimated;
ALTER TABLE "global".new_store_reserve DROP COLUMN IF EXISTS store_grade;
ALTER TABLE "global".new_store_reserve DROP COLUMN IF EXISTS wos;
ALTER TABLE "global".new_store_reserve DROP COLUMN IF EXISTS min_stock;
ALTER TABLE "global".new_store_reserve DROP COLUMN IF EXISTS max_stock;
ALTER TABLE "global".new_store_reserve DROP COLUMN IF EXISTS mapping_code;
ALTER TABLE "global".new_store_reserve DROP COLUMN IF EXISTS alt_store_code;
ALTER TABLE "global".new_store_reserve DROP COLUMN IF EXISTS alt_sister_store_code;

--changeset gokulakrishnan.nagarajan@impactanalytics.co:MTP-60096-Add_columns_for_new_store_mapped_articles stripComments:false splitStatements:false context:Release_1_0 labels:MTP-60096
--comment: MTP-60096-Add_columns_for_new_store_mapped_articles
ALTER TABLE "global".new_store_reserve ADD COLUMN if not exists allocation_code varchar NULL;
ALTER TABLE "global".new_store_reserve ADD COLUMN if not exists pack_dc_allocation jsonb NULL;

--changeset gokulakrishnan.nagarajan@impactanalytics.co:MTP-60096-Update_constraints_for_new_Store_reserve stripComments:false splitStatements:false context:Release_1_0 labels:MTP-60096
--comment: MTP-60096-Update_constraints_for_new_Store_reserve
ALTER TABLE "global".new_store_reserve DROP CONSTRAINT IF EXISTS new_store_reserve_un;
ALTER TABLE "global".new_store_reserve ADD CONSTRAINT new_store_reserve_un UNIQUE (allocation_code, store_code, article, "size");

--changeset karthikeswar.saravanan@impactanalytics.co:MTP-49460 stripComments:false splitStatements:false context:Release_1_0 labels:MTP-60096
--comment: MTP-49460
ALTER TABLE "global".new_store_reserve DROP CONSTRAINT IF EXISTS new_store_reserve_un;

--changeset mohammed.huzaif@impactanalytics.co:MTP-99438-Update_constraints_for_new_Store_reserve stripComments:false splitStatements:false context:Release_1_0 labels:MTP-99438
--comment: MTP-99438 - adding unique key
ALTER TABLE "global".new_store_reserve ADD CONSTRAINT new_store_reserve_un UNIQUE (allocation_code, store_code, article, "size");

ALTER TABLE "global".new_store_reserve ADD CONSTRAINT new_store_reserve_pk PRIMARY KEY (allocation_code, store_code, article, "size");