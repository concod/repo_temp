--liquibase formatted sql
--changeset sonika.baheti@impactanalytics.co:faiss_id_to_product_mapping stripComments:false splitStatements:false context:Release_1_0 labels:itemsmart_initial_commit
--comment: initial changeset for faiss_id_to_product_mapping

CREATE TABLE if not EXISTS item_smart.faiss_id_to_product_mapping (
	"key" int4 NULL,
	l0_name varchar(50) NULL,
	l1_name varchar(50) NULL,
	l2_name varchar(50) NULL,
	l3_name varchar(50) NULL,
	l4_name varchar(50) NULL,
	l5_name varchar(50) NULL,
	"style" varchar(50) NULL,
	is_modelled varchar(50) NULL,
	season varchar(50) NULL,
	"class" varchar(50) NULL,
	collection varchar(50) NULL,
	gender varchar(50) NULL,
	leg_length_dsc varchar(50) NULL,
	leg_type varchar(50) NULL,
	product_life_cycle varchar(50) NULL,
	rtl_shared_exclusive_dsc varchar(50) NULL,
	"size" varchar(50) NULL,
	sleeve_length_dsc varchar(50) NULL,
	sleeve_type varchar(50) NULL,
	sty_primary_occsn_end_use_dsc varchar(64) NULL,
	sty_secondary_occsn_end_use_dsc varchar(50) NULL,
	price int4 NULL,
	"cost" float4 NULL,
	clearance bool NULL,
	product_description varchar(128) NULL,
	age varchar(50) NULL,
	prod_sty_body_fiber_1_dsc varchar(64) NULL,
	hang_fold_cd varchar(50) NULL,
	sty_primary_color_fam_cd varchar(50) NULL,
	sty_print_pattern_cd varchar(50) NULL,
	fiscal_season_name varchar(50) NULL,
	price_percentile varchar(50) NULL,
	cost_percentile varchar(50) NULL,
	pc varchar(50) NULL,
	cc varchar(50) NULL,
	price_band varchar(50) NULL,
	cost_band varchar(50) NULL,
	"vectorCol" varchar(512) NULL,
	"vectorCol_clean" varchar(256) NULL
);


--changeset sonika.baheti@impactanalytics.co:faiss_id_to_product_mapping_chg2 stripComments:false splitStatements:false context:Release_1_0 labels:mtp-38202
--comment:  datatype change
ALTER TABLE item_smart.faiss_id_to_product_mapping ALTER COLUMN price TYPE float4 USING price::float4;


--changeset sonika.baheti@impactanalytics.co:faiss_id_to_product_mapping_chg3 stripComments:false splitStatements:false context:Release_1_0 labels:mtp-38202
--comment:  datatype change

ALTER TABLE item_smart.faiss_id_to_product_mapping ALTER COLUMN l0_name TYPE varchar USING l0_name::varchar;
ALTER TABLE item_smart.faiss_id_to_product_mapping ALTER COLUMN l1_name TYPE varchar USING l1_name::varchar;
ALTER TABLE item_smart.faiss_id_to_product_mapping ALTER COLUMN l2_name TYPE varchar USING l2_name::varchar;
ALTER TABLE item_smart.faiss_id_to_product_mapping ALTER COLUMN l3_name TYPE varchar USING l3_name::varchar;
ALTER TABLE item_smart.faiss_id_to_product_mapping ALTER COLUMN l4_name TYPE varchar USING l4_name::varchar;
ALTER TABLE item_smart.faiss_id_to_product_mapping ALTER COLUMN l5_name TYPE varchar USING l5_name::varchar;
ALTER TABLE item_smart.faiss_id_to_product_mapping ALTER COLUMN "style" TYPE varchar USING "style"::varchar;
ALTER TABLE item_smart.faiss_id_to_product_mapping ALTER COLUMN is_modelled TYPE varchar USING is_modelled::varchar;
ALTER TABLE item_smart.faiss_id_to_product_mapping ALTER COLUMN season TYPE varchar USING season::varchar;
ALTER TABLE item_smart.faiss_id_to_product_mapping ALTER COLUMN "class" TYPE varchar USING "class"::varchar;
ALTER TABLE item_smart.faiss_id_to_product_mapping ALTER COLUMN collection TYPE varchar USING collection::varchar;
ALTER TABLE item_smart.faiss_id_to_product_mapping ALTER COLUMN gender TYPE varchar USING gender::varchar;
ALTER TABLE item_smart.faiss_id_to_product_mapping ALTER COLUMN leg_length_dsc TYPE varchar USING leg_length_dsc::varchar;
ALTER TABLE item_smart.faiss_id_to_product_mapping ALTER COLUMN leg_type TYPE varchar USING leg_type::varchar;
ALTER TABLE item_smart.faiss_id_to_product_mapping ALTER COLUMN product_life_cycle TYPE varchar USING product_life_cycle::varchar;
ALTER TABLE item_smart.faiss_id_to_product_mapping ALTER COLUMN rtl_shared_exclusive_dsc TYPE varchar USING rtl_shared_exclusive_dsc::varchar;
ALTER TABLE item_smart.faiss_id_to_product_mapping ALTER COLUMN "size" TYPE varchar USING "size"::varchar;
ALTER TABLE item_smart.faiss_id_to_product_mapping ALTER COLUMN sleeve_length_dsc TYPE varchar USING sleeve_length_dsc::varchar;
ALTER TABLE item_smart.faiss_id_to_product_mapping ALTER COLUMN sleeve_type TYPE varchar USING sleeve_type::varchar;
ALTER TABLE item_smart.faiss_id_to_product_mapping ALTER COLUMN sty_primary_occsn_end_use_dsc TYPE varchar USING sty_primary_occsn_end_use_dsc::varchar;
ALTER TABLE item_smart.faiss_id_to_product_mapping ALTER COLUMN sty_secondary_occsn_end_use_dsc TYPE varchar USING sty_secondary_occsn_end_use_dsc::varchar;
ALTER TABLE item_smart.faiss_id_to_product_mapping ALTER COLUMN product_description TYPE varchar USING product_description::varchar;
ALTER TABLE item_smart.faiss_id_to_product_mapping ALTER COLUMN age TYPE varchar USING age::varchar;
ALTER TABLE item_smart.faiss_id_to_product_mapping ALTER COLUMN prod_sty_body_fiber_1_dsc TYPE varchar USING prod_sty_body_fiber_1_dsc::varchar;
ALTER TABLE item_smart.faiss_id_to_product_mapping ALTER COLUMN hang_fold_cd TYPE varchar USING hang_fold_cd::varchar;
ALTER TABLE item_smart.faiss_id_to_product_mapping ALTER COLUMN sty_primary_color_fam_cd TYPE varchar USING sty_primary_color_fam_cd::varchar;
ALTER TABLE item_smart.faiss_id_to_product_mapping ALTER COLUMN sty_print_pattern_cd TYPE varchar USING sty_print_pattern_cd::varchar;
ALTER TABLE item_smart.faiss_id_to_product_mapping ALTER COLUMN fiscal_season_name TYPE varchar USING fiscal_season_name::varchar;
ALTER TABLE item_smart.faiss_id_to_product_mapping ALTER COLUMN price_percentile TYPE varchar USING price_percentile::varchar;
ALTER TABLE item_smart.faiss_id_to_product_mapping ALTER COLUMN cost_percentile TYPE varchar USING cost_percentile::varchar;
ALTER TABLE item_smart.faiss_id_to_product_mapping ALTER COLUMN pc TYPE varchar USING pc::varchar;
ALTER TABLE item_smart.faiss_id_to_product_mapping ALTER COLUMN cc TYPE varchar USING cc::varchar;
ALTER TABLE item_smart.faiss_id_to_product_mapping ALTER COLUMN price_band TYPE varchar USING price_band::varchar;
ALTER TABLE item_smart.faiss_id_to_product_mapping ALTER COLUMN cost_band TYPE varchar USING cost_band::varchar;
ALTER TABLE item_smart.faiss_id_to_product_mapping ALTER COLUMN "vectorCol" TYPE varchar USING "vectorCol"::varchar;
ALTER TABLE item_smart.faiss_id_to_product_mapping ALTER COLUMN "vectorCol_clean" TYPE varchar USING "vectorCol_clean"::varchar;




--changeset pardhu.gopalam@impactanalytics.co:faiss_id_modelled_products stripComments:false splitStatements:false context:Release_1_0 labels:mtp-38202
--comment:  rename columns

ALTER TABLE item_smart.faiss_id_to_product_mapping ADD modelled_products varchar NULL;

--changeset shreyansh.pathak@impactanalytics.co:faiss_id_to_product_mapping_chg4 stripComments:false splitStatements:false context:Release_1_0 labels:mtp-38202
--comment:  data type changes

ALTER TABLE item_smart.faiss_id_to_product_mapping ALTER COLUMN price TYPE float8 USING price::float8;
ALTER TABLE item_smart.faiss_id_to_product_mapping ALTER COLUMN "cost" TYPE float8 USING "cost"::float8;

--changeset hithesh.s@impactanalytics.co:faiss_id_to_product_mapping_chg5 stripComments:false splitStatements:false context:Release_1_0 labels:mtp-38202
--comment:  data type changes

ALTER TABLE item_smart.faiss_id_to_product_mapping ADD subclass varchar NULL;
ALTER TABLE item_smart.faiss_id_to_product_mapping ADD planning_level_dsc varchar NULL;