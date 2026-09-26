--liquibase formatted sql
--changeset sriraj.varanasi@impactanalytics.co:product_master_promo_version_2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_master_promo_version

DROP TABLE IF EXISTS price_promo.product_master_promo_version CASCADE;
CREATE TABLE IF NOT EXISTS price_promo.product_master_promo_version (
	l0_id int4 NULL,
	l0_name text NULL,
	l0_cuq text NULL,
	l0_cid int4 NULL,
	l1_id int4 NULL,
	l1_name text NULL,
	l1_cuq text NULL,
	l1_cid int4 NULL,
	l2_id int4 NULL,
	l2_name text NULL,
	l2_cuq text NULL,
	l2_cid int4 NULL,
	l3_id int4 NULL,
	l3_name text NULL,
	l3_cuq text NULL,
	l3_cid int4 NULL,
	l4_id int4 NULL,
	l4_cid int4 NULL,
	l4_name text NULL,
	l4_cuq text NULL,
	product_id int8 NOT NULL,
	product_name text NOT NULL,
	product_description text NULL,
	hierarchy_id int4 NULL,
	active bool NULL,
	is_active int4 NULL,
	manufacturer_id int4 NULL,
	manufacturer text NULL,
	manufacturer_cuq text NULL,
	manufacturer_cid int4 NULL,
	merchandiser_id int4 NULL,
	merchandiser text NULL,
	merchandiser_cuq text NULL,
	merchandiser_cid int4 NULL,
	brand_id int4 NULL,
	brand text NULL,
	brand_cuq text NULL,
	brand_cid int4 NULL,
	inventory_manager_id int4 NULL,
	inventory_manager text NULL,
	preferred_brand bool NULL,
	psp_store_count int4 NULL,
	wnw_store_count int4 NULL,
	base_retail float8 NULL,
	base_retail_li float8 NULL,
	promo_base_price float8 NULL,
	"cost" float8 NULL,
	pspd_cost float8 NULL,
	vendor_mail_id text NULL,
	merchant_mail_id text NULL,
	kvi_indicator int4 NULL,
	currency_id int4 NULL,
	price_bucket text NULL,
	size_bucket text NULL,
	price_bucket_cid int4 NULL,
	size_bucket_cid int4 NULL,
	vendor_id int4 NULL,
	vendor text NULL,
	primaryupc text NULL,
	pspd_item bool NULL,
	"map" int4 NULL,
	imap int4 NULL,
	endcap_flag int4 NULL,
	version_code int4 NOT NULL,
	vendor_cuq text NULL,
	vendor_cid int4 NULL,
	clearance_indicator int4 NULL,
	uom text NULL,
	"size" int4 NULL,
	original_uom text NULL,
	uom_cid int4 NULL,
	last_sold date NULL,
	promo_base_price_valid_from date NULL,
	promo_base_price_valid_to date NULL,
	movement int4 NULL,
	CONSTRAINT product_mst_prm_v_version_unique_key UNIQUE (version_code, product_id)
)
PARTITION BY LIST (version_code);
CREATE INDEX product_master_promo_v_product_id_idx ON price_promo.product_master_promo_version USING btree (product_id);


--changeset kumaran.k@impactanalytics.co:product_master_promo_version_v3 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added uam_hierarchy_id product_master_promo_version_v3
ALTER TABLE price_promo.product_master_promo_version
ADD COLUMN uam_hierarchy_id text NULL;

--changeset harsh.singh@impactanalytics.co:product_master_promo_version_v3 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added index on uam_hierarchy_id
CREATE INDEX product_master_promo_v_uamhid_idx ON price_promo.product_master_promo_version USING btree (uam_hierarchy_id);

--changeset sriraj.varanasi@impactanalytics.co:droping_product_master_view stripComments:false splitStatements:false context:Release_1_0 labels:droping_product_master_view
--comment: droping_product_master_view
DROP VIEW IF EXISTS price_promo.product_master;


--changeset sriraj.varanasi@impactanalytics.co:changing_map_imap_data_type stripComments:false splitStatements:false context:Release_1_0 labels:changing_map_imap_data_type
--comment: changing_map_imap_data_type
ALTER TABLE price_promo.product_master_promo_version
ALTER COLUMN map TYPE FLOAT8,
ALTER COLUMN imap TYPE FLOAT8;

--changeset sriraj.varanasi@impactanalytics.co:add_is_consumable_column stripComments:false splitStatements:false context:Release_1_0 labels:add_is_consumable_column
--comment: add is_consumable column to product_master_promo_version

ALTER TABLE price_promo.product_master_promo_version
ADD COLUMN is_consumable text NULL;

--changeset sriraj.varanasi@impactanalytics.co:recreate_is_consumable_as_bool stripComments:false splitStatements:false context:Release_1_0 labels:recreate_is_consumable_as_bool
--comment: drop is_consumable text column and add it back as boolean

ALTER TABLE price_promo.product_master_promo_version
DROP COLUMN IF EXISTS is_consumable CASCADE;;

--changeset sriraj.varanasi@impactanalytics.co:new_column_is_consumable stripComments:false splitStatements:false context:Release_1_0 labels:new_column_is_consumable
--comment: adding_a_new_column_bool_is_consumable

ALTER TABLE price_promo.product_master_promo_version
ADD COLUMN is_consumable bool NULL;

--changeset sriraj.varanasi@impactanalytics.co:new_column_product_id_actual stripComments:false splitStatements:false context:Release_1_0 labels:new_column_product_id_actual
--comment: adding_a_new_column_string_product_id_actual

ALTER TABLE price_promo.product_master_promo_version
ADD COLUMN product_id_actual varchar NULL;

--changeset sriraj.varanasi@impactanalytics.co:new_column_size_actual stripComments:false splitStatements:false context:Release_1_0 labels:new_column_size_actual
--comment: adding_a_new_column_float_size_actual

ALTER TABLE price_promo.product_master_promo_version
ADD COLUMN size_actual float NULL;

