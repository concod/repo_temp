--liquibase formatted sql
--changeset pundarikaksha.mishra@impactanalytics.co:new_skus stripComments:false splitStatements:false context:Release_1_0 labels:itemsmart_initial_commit
--comment: initial changeset for new_skus

CREATE TABLE item_smart.new_skus (
	hierarchy_code int4 NULL,
	l1_name varchar NULL,
	l2_name varchar NULL,
	l3_name varchar NULL,
	l4_name varchar NULL,
	l5_name varchar NULL,
	l6_name varchar NULL,
	color_description varchar NULL,
	product_code varchar NULL,
	article varchar NULL,
	product_name text NULL,
	"level" int2 NULL,
	receipt_date date NULL,
	super_style_color_code varchar NULL,
	product_id int4 NULL,
	product_type text NULL,
	l0_name varchar NULL,
	l1_id varchar NULL,
	l2_id varchar NULL,
	l3_id varchar NULL,
	l4_id varchar NULL,
	l5_id varchar NULL,
	l6_id varchar NULL,
	color varchar NULL,
	replenishment_flag varchar NULL,
	inseam varchar NULL,
	inseam_name varchar NULL,
	back_type varchar NULL,
	back_type_name varchar NULL,
	coverage_bra varchar NULL,
	coverage_bra_name varchar NULL,
	lining_bra varchar NULL,
	lining_bra_name varchar NULL,
	bust_type varchar NULL,
	bust_type_name varchar NULL,
	pocket_quantity varchar NULL,
	fit varchar NULL,
	fit_name varchar NULL,
	height varchar NULL,
	height_name varchar NULL,
	impact_level varchar NULL,
	impact_level_name varchar NULL,
	longline_bra varchar NULL,
	neckline varchar NULL,
	neckline_name varchar NULL,
	sheerness varchar NULL,
	sheerness_name varchar NULL,
	silhouette varchar NULL,
	silhouette_name varchar NULL,
	sleeve_length varchar NULL,
	sleeve_length_name varchar NULL,
	strap_type varchar NULL,
	strap_type_name varchar NULL,
	fabric_feel varchar NULL,
	fabric_weight varchar NULL,
	fabric_stretch varchar NULL,
	sweat_wicking varchar NULL,
	added_construction varchar NULL,
	breathability varchar NULL,
	end_use varchar NULL,
	special_features varchar NULL,
	target_area varchar NULL,
	shapewear_wear_with varchar NULL,
	department varchar NULL,
	wash varchar NULL,
	wash_name varchar NULL,
	length_description varchar NULL,
	length_description_name varchar NULL,
	product_bucket_code int8 NULL,
	product_lifecycle varchar NULL,
	product_description text NULL,
	product_details_en_us text NULL,
	closure_type text NULL,
	closure_type_name text NULL,
	price float8 NULL,
	original_price float8 NULL,
	"cost" float8 NULL,
	purchase_status_code text NULL,
	purchase_status_type text NULL,
	purchase_status text NULL,
	purchase_status_type_code text NULL,
	is_cadence_generated bool NULL,
	is_mapped bool NULL,
	mapped_product_code varchar NULL,
	mapped_product_code_description varchar NULL,
	launch_date date NULL,
	exit_date date NULL,
	updated_at timestamptz NULL,
	updated_by int4 NULL
);

--changeset shreyansh.pathak@impactanalytics.co:added new column stripComments:false splitStatements:false context:Release_1_0 labels:new_skus_adding_column
--comment: adding item_description column
ALTER TABLE item_smart.new_skus ADD COLUMN item_description VARCHAR NULL;

--changeset mahendharreddy.k@impactanalytics.co_drop_col:added new column stripComments:false splitStatements:false context:Release_1_0 labels:new_skus_adding_column
--comment: adding item_description column
ALTER TABLE item_smart.new_skus DROP COLUMN if exists l5_name;
ALTER TABLE item_smart.new_skus DROP COLUMN if exists l6_name;
ALTER TABLE item_smart.new_skus DROP COLUMN if exists l5_id;
ALTER TABLE item_smart.new_skus DROP COLUMN if exists l6_id;
--changeset mahendharreddy.k@impactanalytics.co_drop_col:drop and readd stripComments:false splitStatements:false context:Release_1_0 labels:new_skus_adding_column_1
--comment: adding item_description column
ALTER TABLE item_smart.new_skus
    DROP COLUMN IF EXISTS purchase_status_code,
    DROP COLUMN IF EXISTS purchase_status_type,
    DROP COLUMN IF EXISTS purchase_status,
    DROP COLUMN IF EXISTS purchase_status_type_code,
    DROP COLUMN IF EXISTS is_cadence_generated,
    DROP COLUMN IF EXISTS is_mapped,
    DROP COLUMN IF EXISTS mapped_product_code,
    DROP COLUMN IF EXISTS mapped_product_code_description,
    DROP COLUMN IF EXISTS updated_at,
    DROP COLUMN IF EXISTS updated_by;
ALTER TABLE item_smart.new_skus
    ADD COLUMN collection TEXT,
    ADD COLUMN collection_desc TEXT,
    ADD COLUMN superstyle_name TEXT,
    ADD COLUMN superstyle TEXT,
    ADD COLUMN purchase_status_code TEXT,
    ADD COLUMN purchase_status_type TEXT,
    ADD COLUMN purchase_status TEXT,
    ADD COLUMN purchase_status_type_code TEXT,
    ADD COLUMN is_cadence_generated BOOLEAN,
    ADD COLUMN is_mapped BOOLEAN,
    ADD COLUMN mapped_product_code VARCHAR,
    ADD COLUMN mapped_product_code_description VARCHAR,
    ADD COLUMN updated_at TIMESTAMP,
    ADD COLUMN updated_by int4;

--changeset mahendharreddy.k@impactanalytics.co_add_default_value_col:drop and readd stripComments:false splitStatements:false context:Release_1_0 labels:new_skus_adding_column_1_adding_default_value
--comment: changing is_mapping default value

ALTER TABLE item_smart.new_skus ALTER COLUMN is_mapped SET DEFAULT false;