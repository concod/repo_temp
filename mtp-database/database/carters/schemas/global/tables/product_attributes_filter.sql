--liquibase formatted sql
--changeset liquibase:product_attributes_filter stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_attributes_filter
CREATE TABLE "global".product_attributes_filter (
	product_code varchar NOT NULL,
	product_name varchar NOT NULL,
	product_description text NULL,
	price float8 NULL,
	"cost" float8 NULL,
	original_price float8 NULL,
	active bool NOT NULL,
	clearance bool NOT NULL,
	receipt_date date NULL,
	created_at timestamptz NULL,
	updated_at timestamptz NULL,
	created_by int4 NULL,
	updated_by int4 NULL,
	replacement_product_codes _varchar NULL,
	reference_product_codes _varchar NULL,
	is_deleted bool NULL,
	l0_name varchar NOT NULL,
	l1_name varchar NOT NULL,
	l2_name varchar NOT NULL,
	l3_name varchar NULL,
	l4_name varchar NULL,
	article varchar NOT NULL,
	asset_url varchar NULL,
	brand varchar NULL,
	clearance_start_date date NULL,
	color varchar NOT NULL,
	dtc_season varchar NULL,
	dtc_year varchar NULL,
	l0_id varchar NOT NULL,
	l1_id varchar NOT NULL,
	l2_id varchar NOT NULL,
	l3_id varchar NOT NULL,
	l4_id varchar NOT NULL,
	pfs_season varchar NULL,
	pfs_year varchar NULL,
	product_bucket_code int8 NOT NULL,
	product_channel varchar NULL,
	product_life_cycle varchar NULL,
	"size" varchar NOT NULL,
	size_name varchar NOT NULL,
	sku varchar NULL,
	"style" varchar NULL,
	style_color_id varchar NOT NULL,
	upc varchar NULL,
	vendor varchar NULL,
	CONSTRAINT product_attributes_filter_pk PRIMARY KEY (product_code, l0_name)
)
PARTITION BY LIST (l0_name);
CREATE INDEX product_attributes_filter_l0_name_idx ON global.product_attributes_filter USING btree (l0_name);
CREATE INDEX product_attributes_filter_product_code_idx ON global.product_attributes_filter USING btree (product_code);
ALTER TABLE "global".product_attributes_filter ADD CONSTRAINT product_attributes_filter_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE;


--changeset ankit.soni@impactanalytics.co:product_attributes_filter stripComments:false splitStatements:false context:add_l5_name_id_gender_subclass labels:l5_name_id_gender_subclass
--comment: added column l5_name, l5_id, gender and subclass
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS l5_name varchar NULL ;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS l5_id varchar NULL ;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS gender varchar NULL ;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS subclass varchar NOT NULL ;

--changeset akshay.jain@impactanalytics.co:product_attributes_filter stripComments:false splitStatements:false context:style_description_added labels:style_description_added
--comment: style_description_added
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS style_description text NULL ;

--changeset ashish@impactanalytics.co:product_attributes_filter_rcl_hash stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_attributes_filter_rcl_hash
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS rcl_hash jsonb DEFAULT '{}'::jsonb NOT NULL;

--changeset ankit.soni@impactanalytics.co:product_attributes_filterchange1 stripComments:false splitStatements:false context:add_season_collection_seltd_szs_dsc labels:season_collection_seltd_szs_dsc
--comment: added column season, collection, seltd_szs_dsc
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS season varchar NOT NULL ;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS collection varchar NOT NULL ;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS seltd_szs_dsc varchar NULL ;
--changeset shrinidhi.choragi@impactanalytics.co:product_attributes_filter stripComments:false splitStatements:false context:add class column labels:class column addition
--comment: added column class
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS class varchar NOT NULL ;

--changeset shrinidhi.choragi@impactanalytics.co:product_attributes_filter_ph_master_columns stripComments:false splitStatements:false context:added columns needed for ph_master labels:added columns needed for ph_master
--comment: added columns needed for ph_master
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS item_group_desc varchar NOT NULL ;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS sty_primary_occsn_end_use_dsc varchar NOT NULL ;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS product_life_cycle varchar NOT NULL ;

--changeset shameel.zeshan@impactanalytics.co:product_attributes_filter_ph_master_columns stripComments:false splitStatements:false context:added columns needed for ph_master labels:added columns needed for ph_master
--comment: added columns needed for ph_master
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS planned_clearance_date date NOT NULL ;

--changeset shrinidhi.choragi:launch_date addition stripComments:false splitStatements:false context:added columns needed for ph_master labels:added column launch_date 
--comment: added column launch_date for ph_master
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS launch_date date NOT NULL ;

--changeset linu.nazil:clearance_date addition stripComments:false splitStatements:false context:added columns needed for ph_master labels:added column launch_date 
--comment: added column launch_date for ph_master
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS clearance_flag int NULL ;

--changeset linu.nazil:product_attributes_filter_psa_codes stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_attributes_filter_psa_codes
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS psa_codes _varchar DEFAULT '{}'::character varying[] NOT NULL;

--changeset ashish@impactanalytics.co:paf_hash_combine_idx stripComments:false splitStatements:false context:Release_1_0 labels:CI-137
--comment: initial changeset for paf_hash_combine_idx
CREATE INDEX paf_hash_combine_idx ON global.product_attributes_filter USING btree (l0_name, l1_name, product_code, rcl_hash) where active and not is_deleted;

-- changeset shameel.zeshan:paf stripComments:false splitStatements:false context:db_sync labels:delete columns 
-- comment: deleting columns that are not needed
ALTER TABLE "global".product_attributes_filter DROP COLUMN IF EXISTS sub_styles CASCADE;


--changeset ankit.soni@impactanalytics.co:product_attributes_filter_add_missing_columns stripComments:false splitStatements:false context:product_attributes_filter_add_missing_columns labels:product_attributes_filter_add_missing_columns
--comment: Added missing columns from DB
ALTER TABLE "global".product_attributes_filter 
ADD COLUMN IF NOT EXISTS active_ladder_flg boolean NOT NULL,
ADD COLUMN IF NOT EXISTS age varchar NOT NULL,
ADD COLUMN IF NOT EXISTS availability_dt_id date NOT NULL,
ADD COLUMN IF NOT EXISTS class_id varchar NOT NULL,
ADD COLUMN IF NOT EXISTS clearance_date date NOT NULL,
ADD COLUMN IF NOT EXISTS collection_id varchar NOT NULL,
ADD COLUMN IF NOT EXISTS country_product varchar NOT NULL,
ADD COLUMN IF NOT EXISTS dailysoopp float8 NOT NULL,
ADD COLUMN IF NOT EXISTS dailysou float8 NOT NULL,
ADD COLUMN IF NOT EXISTS flex_space_strategy varchar NOT NULL,
ADD COLUMN IF NOT EXISTS floorset_date date NOT NULL,
ADD COLUMN IF NOT EXISTS hang_fold_cd varchar NOT NULL,
ADD COLUMN IF NOT EXISTS in_stock_pct float8 NOT NULL,
ADD COLUMN IF NOT EXISTS item_group_id varchar NOT NULL,
ADD COLUMN IF NOT EXISTS l10_id varchar NOT NULL,
ADD COLUMN IF NOT EXISTS l11_id varchar NOT NULL,
ADD COLUMN IF NOT EXISTS leg_length_dsc varchar NOT NULL,
ADD COLUMN IF NOT EXISTS leg_type varchar NOT NULL,
ADD COLUMN IF NOT EXISTS msrp float8 NOT NULL,
ADD COLUMN IF NOT EXISTS ordering varchar NOT NULL,
ADD COLUMN IF NOT EXISTS osv_flag varchar NOT NULL,
ADD COLUMN IF NOT EXISTS planning_level_dsc varchar NOT NULL,
ADD COLUMN IF NOT EXISTS pln_clearance_dt_id date NOT NULL,
ADD COLUMN IF NOT EXISTS primary_vendor_cd varchar NOT NULL,
ADD COLUMN IF NOT EXISTS primary_vendor_dsc varchar NOT NULL,
ADD COLUMN IF NOT EXISTS prod_initiative varchar NOT NULL,
ADD COLUMN IF NOT EXISTS prod_sku_key varchar NOT NULL,
ADD COLUMN IF NOT EXISTS prod_sty_body_fiber_1_dsc varchar NOT NULL,
ADD COLUMN IF NOT EXISTS prod_sz_key varchar NOT NULL,
ADD COLUMN IF NOT EXISTS product_strategy varchar NOT NULL,
ADD COLUMN IF NOT EXISTS replenishment_status varchar NOT NULL,
ADD COLUMN IF NOT EXISTS reportable_season_dsc varchar NOT NULL,
ADD COLUMN IF NOT EXISTS rtl_pricing_dsc varchar NOT NULL,
ADD COLUMN IF NOT EXISTS rtl_prnt_sty_cd varchar NOT NULL,
ADD COLUMN IF NOT EXISTS rtl_prnt_sty_dsc varchar NOT NULL,
ADD COLUMN IF NOT EXISTS rtl_prnt_sty_id varchar NOT NULL,
ADD COLUMN IF NOT EXISTS rtl_released_flg varchar NOT NULL,
ADD COLUMN IF NOT EXISTS rtl_shared_exclusive_dsc varchar NOT NULL,
ADD COLUMN IF NOT EXISTS season_id varchar NOT NULL,
ADD COLUMN IF NOT EXISTS season_yr_cd varchar NOT NULL,
ADD COLUMN IF NOT EXISTS season_yr_dsc varchar NOT NULL,
ADD COLUMN IF NOT EXISTS sleeve_length_dsc varchar NOT NULL,
ADD COLUMN IF NOT EXISTS sleeve_type varchar NOT NULL,
ADD COLUMN IF NOT EXISTS strtgy_lnch_dt_id date NOT NULL,
ADD COLUMN IF NOT EXISTS sty_primary_color_fam_cd varchar NOT NULL,
ADD COLUMN IF NOT EXISTS sty_print_pattern_cd varchar NOT NULL,
ADD COLUMN IF NOT EXISTS sty_secondary_occsn_end_use_dsc varchar NOT NULL,
ADD COLUMN IF NOT EXISTS subclass_id varchar NOT NULL,
ADD COLUMN IF NOT EXISTS sz_rng_cd varchar NOT NULL,
ADD COLUMN IF NOT EXISTS upc_nbr varchar NOT NULL,
ADD COLUMN IF NOT EXISTS workstream varchar NOT NULL;

--changeset ashish@impactanalytics.co:paf_hash_combine_idx2 stripComments:false splitStatements:false context:Release_1_0 labels:CI-137
--comment: initial changeset for paf_hash_combine_idx2
DROP INDEX IF EXISTS global.paf_hash_combine_idx;
CREATE INDEX paf_hash_combine_idx ON global.product_attributes_filter USING btree (l0_name, l1_name, l2_name, l3_name, product_code, rcl_hash) WHERE (active AND (NOT is_deleted));

--changeset ankit.soni@impactanalytics.co:product_attributes_filter_add_columns_2025_03_05 stripComments:false splitStatements:false context:product_attributes_filter_add_columns_2025_03_05 labels:product_attributes_filter_add_columns_2025_03_05
--comment: Added 3 columns for Itemsmart
ALTER TABLE "global".product_attributes_filter 
ADD COLUMN IF NOT EXISTS rplnsh_flg varchar NOT NULL,
ADD COLUMN IF NOT EXISTS clr_cd int8 NOT NULL,
ADD COLUMN IF NOT EXISTS sz_rng_dsc varchar NOT NULL;

--changeset ashish:paf_hash_combine_idx_v3 stripComments:false splitStatements:false context:Release_1_0 labels:CI-137
--comment: initial changeset for paf_hash_combine_idx
DROP INDEX IF EXISTS global.paf_hash_combine_idx;
CREATE INDEX IF NOT EXISTS paf_hash_combine_idx ON global.product_attributes_filter USING btree (l0_name, l1_name, l2_name, l3_name, product_code) where active and not is_deleted;

--changeset madhumitha.s@impactanalytics.co:paf_article_combine_idx_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding index

create index IF NOT EXISTS paf_article_combine_idx on
 global.product_attributes_filter
	using btree (l0_name,
article, product_code)
where
(active
	and (not is_deleted));

--changeset aakash.deep@impactanalytics.co:product_attributes_filter_add_exclsv_chnl_desc stripComments:false splitStatements:false context:product_attributes_filter_add_exclsv_chnl_desc labels:product_attributes_filter_add_exclsv_chnl_desc
--comment: adding new columnn in DB exclsv chnl desc
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS exclsv_chnl_dsc varchar NULL ;

--changeset aakash.deep@impactanalytics.co:paf_change_clr_cd_to_varchar stripComments:false splitStatements:false context:paf_change_clr_cd_to_varchar labels:paf_change_clr_cd_to_varchar
--comment: Changing data type of clr_cd from int8 to varchar
ALTER TABLE "global".product_attributes_filter 
ALTER COLUMN clr_cd TYPE varchar USING clr_cd::varchar;

--changeset surendra.babu@impactanalytics.co:paf_article_idx_v1 stripComments:false splitStatements:false context:Release_1_0 labels:paf_article_idx
--comment: create index on article

CREATE INDEX IF NOT EXISTS paf_article_idx ON global.product_attributes_filter USING btree (article);