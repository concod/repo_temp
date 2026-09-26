--liquibase formatted sql
--changeset ashish@impactanalytics.co:product_attributes_filter stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
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
	l3_name varchar NOT NULL,
	brand_id int4 NULL,
	brand_name varchar NULL,
	item_group_type_code varchar NULL,
	item_status varchar NULL,
	l0_id int4 NOT NULL,
	l1_id int4 NOT NULL,
	l2_id int4 NOT NULL,
	l3_id int4 NOT NULL,
	product_cost float8 NULL,
	product_final_price_per_unit float8 NULL,
	sell_uom_code int4 NULL,
	vendor_code int4 NULL,
	CONSTRAINT product_attributes_filter_pk PRIMARY KEY (product_code, l0_name)
)
PARTITION BY LIST (l0_name);
CREATE INDEX product_attributes_filter_l0_name_idx ON global.product_attributes_filter USING btree (l0_name);
CREATE INDEX product_attributes_filter_product_code_idx ON global.product_attributes_filter USING btree (product_code);
ALTER TABLE "global".product_attributes_filter ADD CONSTRAINT product_attributes_filter_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE;



--changeset surya.avinash@impactanalytics.co:product_attributes_filter_v24072025 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: updating the schema as per DEV

ALTER TABLE "global".product_attributes_filter
    DROP CONSTRAINT product_attributes_filter_fk;

ALTER TABLE "global".product_attributes_filter
    DROP CONSTRAINT product_attributes_filter_pk;

ALTER TABLE "global".product_attributes_filter
    DROP COLUMN product_description CASCADE,
    DROP COLUMN price CASCADE,
    DROP COLUMN "cost" CASCADE,
    DROP COLUMN original_price CASCADE,
    DROP COLUMN receipt_date CASCADE,
    DROP COLUMN l1_name CASCADE,
    DROP COLUMN l2_name CASCADE,
    DROP COLUMN l3_name CASCADE,
    DROP COLUMN brand_id CASCADE,
    DROP COLUMN brand_name CASCADE,
    DROP COLUMN item_group_type_code CASCADE,
    DROP COLUMN item_status CASCADE,
    DROP COLUMN l0_id CASCADE,
    DROP COLUMN l1_id CASCADE,
    DROP COLUMN l2_id CASCADE,
    DROP COLUMN l3_id CASCADE,
    DROP COLUMN product_cost CASCADE,
    DROP COLUMN product_final_price_per_unit CASCADE,
    DROP COLUMN sell_uom_code CASCADE,
    DROP COLUMN vendor_code CASCADE;

ALTER TABLE "global".product_attributes_filter
    ADD COLUMN l6_id varchar NOT NULL,
    ADD COLUMN product_name_orig varchar NULL,
    ADD COLUMN inserted_date varchar NULL,
    ADD COLUMN modified_date varchar NULL,
    ADD COLUMN cost_first_product_unit varchar NULL,
    ADD COLUMN cost_fully_loaded_ship_value float8 NULL,
    ADD COLUMN cost_fully_loaded_ship_unit varchar NULL,
    ADD COLUMN minimum_order_quantity float8 NULL,
    ADD COLUMN third_party_liaisonagent varchar NULL,
    ADD COLUMN vendor_contact_name varchar NULL,
    ADD COLUMN vendor_street_address varchar NULL,
    ADD COLUMN vendor_city varchar NULL,
    ADD COLUMN vendor_state varchar NULL,
    ADD COLUMN vendor_zip_code varchar NULL,
    ADD COLUMN vendor_country varchar NULL,
    ADD COLUMN vendor varchar NULL,
    ADD COLUMN vendor_label varchar NULL,
    ADD COLUMN cart_page_items_tree varchar NULL,
    ADD COLUMN addtnl_categories_item_appearin varchar NULL,
    ADD COLUMN tree_shape varchar NULL,
    ADD COLUMN tree_setup_type varchar NULL,
    ADD COLUMN needle_type varchar NULL,
    ADD COLUMN material varchar NULL,
    ADD COLUMN season varchar NULL,
    ADD COLUMN holiday varchar NULL,
    ADD COLUMN "year" float8 NULL,
    ADD COLUMN filesourceid int4 NULL,
    ADD COLUMN pipeline_runid varchar NULL,
    ADD COLUMN fk_skuproductid float8 NULL,
    ADD COLUMN approved_locations_cross_border_ship varchar NULL,
    ADD COLUMN textile_features varchar NULL,
    ADD COLUMN design_type varchar NULL,
    ADD COLUMN key_theme_design varchar NULL,
    ADD COLUMN perishable varchar NULL,
    ADD COLUMN shelf_life varchar NULL,
    ADD COLUMN kosher varchar NULL,
    ADD COLUMN allergens varchar NULL,
    ADD COLUMN ingredients varchar NULL,
    ADD COLUMN balsamwebsites_externalkey varchar NULL,
    ADD COLUMN f_externalkey varchar NULL,
    ADD COLUMN f_familycode varchar NULL,
    ADD COLUMN f_familydescription varchar NULL,
    ADD COLUMN f_seo_followrobotsmetatag varchar NULL,
    ADD COLUMN f_seo_hreflangdomain varchar NULL,
    ADD COLUMN f_seo_hreflangurl varchar NULL,
    ADD COLUMN f_seo_indexrobotsmetatag varchar NULL,
    ADD COLUMN f_seo_metadescription varchar NULL,
    ADD COLUMN f_seo_slug varchar NULL,
    ADD COLUMN f_seo_titletag varchar NULL,
    ADD COLUMN f_seo_canonicaltag varchar NULL,
    ADD COLUMN compatibilitycode varchar NULL,
    ADD COLUMN adapterplug varchar NULL,
    ADD COLUMN transformer varchar NULL,
    ADD COLUMN voltagetype varchar NULL,
    ADD COLUMN warranty_eligibil_code_light float8 NULL,
    ADD COLUMN warranty_eligibil_code_product float8 NULL,
    ADD COLUMN warranty_eligibil_code_foliage float8 NULL,
    ADD COLUMN type_of_serveware varchar NULL,
    ADD COLUMN type_of_storage varchar NULL,
    ADD COLUMN flavor varchar NULL,
    ADD COLUMN shape_of_topiary varchar NULL,
    ADD COLUMN shape_of_decor varchar NULL,
    ADD COLUMN candle_type varchar NULL,
    ADD COLUMN light_design varchar NULL,
    ADD COLUMN gifting varchar NULL,
    ADD COLUMN decorating_theme varchar NULL,
    ADD COLUMN live_on_sitedate date NULL,
    ADD COLUMN display_product_out_of_stock varchar NULL,
    ADD COLUMN date_out_of_stock date NULL,
    ADD COLUMN product_name_channel varchar NULL,
    ADD COLUMN std_ship_cost_value float8 NULL,
    ADD COLUMN std_ship_cost_unit varchar NULL,
    ADD COLUMN channel_approval varchar NULL,
    ADD COLUMN fk_productid int4 NULL,
    ADD COLUMN carton_total_count int4 NULL,
    ADD COLUMN lengths varchar NULL,
    ADD COLUMN widths varchar NULL,
    ADD COLUMN distinct_upc_count int4 NULL,
    ADD COLUMN heights_distinct varchar NULL,
    ADD COLUMN lengths_distinct varchar NULL,
    ADD COLUMN l4_name varchar NULL,
    ADD COLUMN heights varchar NULL,
    ADD COLUMN raw_materials_type varchar NULL,
    ADD COLUMN size_sml varchar NULL,
    ADD COLUMN weights varchar NULL,
    ADD COLUMN l5_name varchar NULL,
    ADD COLUMN widths_distinct varchar NULL,
    ADD COLUMN weights_distinct varchar NULL,
    ADD COLUMN l0_id int4 NULL,
    ADD COLUMN l1_id int4 NULL,
    ADD COLUMN l2_id int4 NULL,
    ADD COLUMN l3_id int4 NULL,
    ADD COLUMN l4_id int4 NULL,
    ADD COLUMN l5_id int4 NULL,
    ADD COLUMN product_id int4 NULL,
    ADD COLUMN lifecycle varchar NULL,
    ADD COLUMN pk_skuproductid int4 NULL,
    ADD COLUMN sku_code varchar NULL,
    ADD COLUMN obs_bh_product_name varchar NULL,
    ADD COLUMN pillar_category varchar NULL,
    ADD COLUMN id int4 NULL,
    ADD COLUMN external_key varchar NULL,
    ADD COLUMN "language" varchar NULL,
    ADD COLUMN "label" varchar NULL,
    ADD COLUMN channel_status varchar NULL,
    ADD COLUMN brand varchar NULL,
    ADD COLUMN category_path varchar NULL,
    ADD COLUMN categorypage_pdp_badge varchar NULL,
    ADD COLUMN grid_layout varchar NULL,
    ADD COLUMN grid_rank float8 NULL,
    ADD COLUMN balsam_hill_exclusive varchar NULL,
    ADD COLUMN print_catalog varchar NULL,
    ADD COLUMN product_description_headline varchar NULL,
    ADD COLUMN product_description_shortened varchar NULL,
    ADD COLUMN product_description varchar NULL,
    ADD COLUMN onlinecatalog_prod_description varchar NULL,
    ADD COLUMN pdpcontent_branch_details varchar NULL,
    ADD COLUMN foliagemodule_branchsamplekit varchar NULL,
    ADD COLUMN pdpcontent_realism varchar NULL,
    ADD COLUMN pdpcontent_shape varchar NULL,
    ADD COLUMN pdpcontent_lightguide varchar NULL,
    ADD COLUMN pdpcontent_shapingtree varchar NULL,
    ADD COLUMN pdpcontent_typeofshapingtree varchar NULL,
    ADD COLUMN pdpcontent_storingtree varchar NULL,
    ADD COLUMN pdpcontent_typeofstoringtree varchar NULL,
    ADD COLUMN pdpcontent_hyperlink_viewcount_weight varchar NULL,
    ADD COLUMN pdpcontent_whatsinboximage varchar NULL,
    ADD COLUMN pdpcontent_whatsinboxtext varchar NULL,
    ADD COLUMN pdpcontent_whatsinbox varchar NULL,
    ADD COLUMN pdpcontent_assemblingtree varchar NULL,
    ADD COLUMN needs_lifesize_largefigureverbiage varchar NULL,
    ADD COLUMN seofollow_robotsmetatag varchar NULL,
    ADD COLUMN seoindex_robotsmetatag varchar NULL,
    ADD COLUMN seo_metadescription varchar NULL,
    ADD COLUMN seo_slug varchar NULL,
    ADD COLUMN seo_titletag varchar NULL,
    ADD COLUMN return_standard varchar NULL,
    ADD COLUMN return_shipping_method varchar NULL,
    ADD COLUMN california_prop65_included varchar NULL,
    ADD COLUMN productcontains_lead varchar NULL,
    ADD COLUMN warranty_periodoftime varchar NULL,
    ADD COLUMN tax_weee_eligible varchar NULL,
    ADD COLUMN energy_star_certified varchar NULL,
    ADD COLUMN ul_certification varchar NULL,
    ADD COLUMN canadian_standards_association varchar NULL,
    ADD COLUMN government_compliance varchar NULL,
    ADD COLUMN warehouse_return float8 NULL,
    ADD COLUMN product_type varchar NULL,
    ADD COLUMN sku varchar NULL,
    ADD COLUMN item_type varchar NULL,
    ADD COLUMN entity_type varchar NULL,
    ADD COLUMN prodname_detailed_reporting varchar NULL,
    ADD COLUMN sap_number varchar NULL,
    ADD COLUMN pim_id varchar NULL,
    ADD COLUMN species_treegreenery varchar NULL,
    ADD COLUMN light_color varchar NULL,
    ADD COLUMN light_type varchar NULL,
    ADD COLUMN type_lightcontrol varchar NULL,
    ADD COLUMN timer varchar NULL,
    ADD COLUMN outdoor_safe varchar NULL,
    ADD COLUMN level_realism varchar NULL,
    ADD COLUMN foliage_type varchar NULL,
    ADD COLUMN number_sectionsintree float8 NULL,
    ADD COLUMN number_branchtips float8 NULL,
    ADD COLUMN pottedtree varchar NULL,
    ADD COLUMN frosted varchar NULL,
    ADD COLUMN display_sizerange varchar NULL,
    ADD COLUMN color varchar NULL,
    ADD COLUMN percent_material varchar NULL,
    ADD COLUMN pe_percent_value float8 NULL,
    ADD COLUMN pe_percent_unit varchar NULL,
    ADD COLUMN pineneedle_percent_value float8 NULL,
    ADD COLUMN pineneedle_percent_unit varchar NULL,
    ADD COLUMN pvcpercent_value float8 NULL,
    ADD COLUMN pvcpercent_unit varchar NULL,
    ADD COLUMN l1_name varchar NULL,
    ADD COLUMN l2_name varchar NULL,
    ADD COLUMN l3_name varchar NULL,
    ADD COLUMN raw_materials varchar NULL,
    ADD COLUMN level_of_decoration varchar NULL,
    ADD COLUMN length_cord_inches_value float8 NULL,
    ADD COLUMN length_cord_inches_unit varchar NULL,
    ADD COLUMN length_lit_length_value float8 NULL,
    ADD COLUMN length_lit_length_unit varchar NULL,
    ADD COLUMN assembly_required varchar NULL,
    ADD COLUMN batteries_included varchar NULL,
    ADD COLUMN batteries_required varchar NULL,
    ADD COLUMN batteries_number_required float8 NULL,
    ADD COLUMN batteries_type_required varchar NULL,
    ADD COLUMN number_pairsofgloves float8 NULL,
    ADD COLUMN tools_included varchar NULL,
    ADD COLUMN femaletree_toppercord varchar NULL,
    ADD COLUMN use_care_cleaning_recomdtn varchar NULL,
    ADD COLUMN height_providedbyvendor varchar NULL,
    ADD COLUMN height_value_converted_value float8 NULL,
    ADD COLUMN height_value_converted_unit varchar NULL,
    ADD COLUMN height_display_siteconverted float8 NULL,
    ADD COLUMN height_override_display_site_convrt_val float8 NULL,
    ADD COLUMN height_override_display_site_convrt_unit varchar NULL,
    ADD COLUMN length_providedbyvendor varchar NULL,
    ADD COLUMN length_value_converted_value float8 NULL,
    ADD COLUMN length_value_converted_unit varchar NULL,
    ADD COLUMN length_display_site_converted float8 NULL,
    ADD COLUMN length_override_display_site_convrt_val float8 NULL,
    ADD COLUMN length_override_display_site_convrt_unit varchar NULL,
    ADD COLUMN width_providedbyvendor varchar NULL,
    ADD COLUMN width_value_converted_value float8 NULL,
    ADD COLUMN width_value_converted_unit varchar NULL,
    ADD COLUMN width_display_siteconverted float8 NULL,
    ADD COLUMN width_override_display_site_convrt_val float8 NULL,
    ADD COLUMN width_override_display_site_convrt_unit varchar NULL,
    ADD COLUMN diameter_providedbyvendor varchar NULL,
    ADD COLUMN diameter_value_converted_value float8 NULL,
    ADD COLUMN diameter_value_converted_unit varchar NULL,
    ADD COLUMN diameter_display_site_converted float8 NULL,
    ADD COLUMN diameter_override_display_site_convrt_val float8 NULL,
    ADD COLUMN diameter_override_display_site_convrt_unit varchar NULL,
    ADD COLUMN weight_providedbyvendor varchar NULL,
    ADD COLUMN weight_value_converted_value float8 NULL,
    ADD COLUMN weight_value_converted_unit varchar NULL,
    ADD COLUMN weight_display_site_converted float8 NULL,
    ADD COLUMN weight_override_display_site_convrt_value float8 NULL,
    ADD COLUMN weight_override_display_site_convrt_unit varchar NULL,
    ADD COLUMN attached_vessel_color varchar NULL,
    ADD COLUMN attached_vessel_height_value float8 NULL,
    ADD COLUMN attached_vessel_height_unit varchar NULL,
    ADD COLUMN attached_vessel_length_value float8 NULL,
    ADD COLUMN attached_vessel_length_unit varchar NULL,
    ADD COLUMN attached_vessel_width_value float8 NULL,
    ADD COLUMN attached_vessel_width_unit varchar NULL,
    ADD COLUMN attache_vessel_material varchar NULL,
    ADD COLUMN size_set_pack float8 NULL,
    ADD COLUMN shatter_resistant varchar NULL,
    ADD COLUMN tree_skirts_collars_shape varchar NULL,
    ADD COLUMN personalization_monogram varchar NULL,
    ADD COLUMN type_personalization varchar NULL,
    ADD COLUMN scent varchar NULL,
    ADD COLUMN scent_type varchar NULL,
    ADD COLUMN wick_wax_type varchar NULL,
    ADD COLUMN candle_burntime float8 NULL,
    ADD COLUMN plays_music varchar NULL,
    ADD COLUMN handcrafted varchar NULL,
    ADD COLUMN handpainted varchar NULL,
    ADD COLUMN tree_bag_sku varchar NULL,
    ADD COLUMN number_tree_bags float8 NULL,
    ADD COLUMN dimensions_tree_bag varchar NULL,
    ADD COLUMN shipping_method varchar NULL,
    ADD COLUMN oversized_shipping varchar NULL,
    ADD COLUMN extended_leadtimetoship varchar NULL,
    ADD COLUMN freight_classification varchar NULL,
    ADD COLUMN drop_ship varchar NULL,
    ADD COLUMN drop_ship_handling_fee_value float8 NULL,
    ADD COLUMN drop_ship_handling_fee_unit varchar NULL,
    ADD COLUMN retailpackaging_available varchar NULL,
    ADD COLUMN masterpack_height_inches_value float8 NULL,
    ADD COLUMN masterpack_height_inches_unit varchar NULL,
    ADD COLUMN masterpack_length_inches_value float8 NULL,
    ADD COLUMN masterpack_length_lnches_unit varchar NULL,
    ADD COLUMN masterpack_width_inches_value float8 NULL,
    ADD COLUMN masterpack_width_inches_unit varchar NULL,
    ADD COLUMN masterpack_weight_lbs_value float8 NULL,
    ADD COLUMN masterpack_weight_lbs_unit varchar NULL,
    ADD COLUMN customs_info varchar NULL,
    ADD COLUMN duty varchar NULL,
    ADD COLUMN duty_charge_htc varchar NULL,
    ADD COLUMN port_of_origin varchar NULL,
    ADD COLUMN country_of_origin varchar NULL,
    ADD COLUMN item_restricted_contiguous_us varchar NULL,
    ADD COLUMN standard_ship_cost float8 NULL,
    ADD COLUMN ship_cost_2_day_value float8 NULL,
    ADD COLUMN ship_cost_2_day_unit varchar NULL,
    ADD COLUMN express_ship_cost_value float8 NULL,
    ADD COLUMN express_ship_cost_unit varchar NULL,
    ADD COLUMN alhi_ship_cost_value float8 NULL,
    ADD COLUMN alhi_ship_cost_unit varchar NULL,
    ADD COLUMN canada_ship_cost_value float8 NULL,
    ADD COLUMN canada_ship_cost_unit varchar NULL,
    ADD COLUMN puerto_rico_ship_cost_value float8 NULL,
    ADD COLUMN puerto_rico_ship_cost_unit varchar NULL,
    ADD COLUMN vendor_productname varchar NULL,
    ADD COLUMN vendor_partnumber_sku varchar NULL,
    ADD COLUMN vendor_lightcolor varchar NULL,
    ADD COLUMN vendor_lighttype varchar NULL,
    ADD COLUMN light_count float8 NULL,
    ADD COLUMN vendor_color varchar NULL,
    ADD COLUMN cost_first_product_value float8 NULL,
    ADD COLUMN price int4 NULL,
    ADD COLUMN "cost" int4 NULL,
    ADD COLUMN original_price int4 NULL,
    ADD COLUMN product_bucket_code int4 NULL,
    ADD COLUMN article int4 NULL,
    ADD COLUMN receipt_date date NULL,
    ADD COLUMN dpt_name varchar NULL,
    ADD COLUMN sku_placeholder varchar NULL,
    ADD COLUMN county_of_origin varchar NULL,
    ADD COLUMN "size" varchar NULL;

ALTER TABLE "global".product_attributes_filter
    ADD CONSTRAINT product_attributes_filter_pk PRIMARY KEY (product_code, l0_name);

ALTER TABLE "global".product_attributes_filter
    ADD CONSTRAINT product_attributes_filter_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code);

CREATE INDEX paf_article_combine_idx ON global.product_attributes_filter USING btree (l0_name, article, product_code) WHERE (active AND (NOT is_deleted));

-- Drop the old indexes if they exist and are no longer needed based on the new DDL's explicit index creations.
-- If the existing indexes are identical in name and definition to what's in the new DDL, you don't need to drop/recreate them.
-- However, since the new DDL re-specifies them, and for safety, we'll include drop statements.
DROP INDEX IF EXISTS global.product_attributes_filter_l0_name_idx;
DROP INDEX IF EXISTS global.product_attributes_filter_product_code_idx;

-- Recreate the indexes as specified in the new DDL.
-- Note: If these indexes already exist and are identical, the CREATE INDEX statement will likely fail or do nothing.
-- It's often safer to drop and then recreate if you are unsure of their exact state.
CREATE INDEX product_attributes_filter_l0_name_idx ON global.product_attributes_filter USING btree (l0_name);
CREATE INDEX product_attributes_filter_product_code_idx ON global.product_attributes_filter USING btree (product_code);



--changeset bhargav.polavarapu@impactanalytics.co:product_attributes_filter_cupu_changesep11 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: container utlization per unit
ALTER TABLE "global".product_attributes_filter
ADD COLUMN container_utilization_per_unit float8 NOT NULL;


--changeset bhargav.polavarapu@impactanalytics.co:price_original_price_change stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: price_original_price_change
ALTER TABLE "global".product_attributes_filter ALTER COLUMN l0_id TYPE varchar;
ALTER TABLE "global".product_attributes_filter ALTER COLUMN l1_id TYPE varchar;
ALTER TABLE "global".product_attributes_filter ALTER COLUMN l2_id TYPE varchar;
ALTER TABLE "global".product_attributes_filter ALTER COLUMN l3_id TYPE varchar;
ALTER TABLE "global".product_attributes_filter ALTER COLUMN l4_id TYPE varchar;
ALTER TABLE "global".product_attributes_filter ALTER COLUMN l5_id TYPE varchar;
ALTER TABLE "global".product_attributes_filter ALTER COLUMN price TYPE float8;
ALTER TABLE "global".product_attributes_filter ALTER COLUMN original_price TYPE float8;
ALTER TABLE "global".product_attributes_filter ALTER COLUMN "cost" TYPE float8;



--changeset bharathvamsi.d@impactanalytics.co:store_count_and_size_set_pack_CHANGE stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: price_original_price_change
ALTER TABLE "global".product_attributes_filter ALTER COLUMN size_set_pack TYPE varchar;
ALTER TABLE "global".product_attributes_filter ADD COLUMN store_count int4 NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN product_code_internal VARCHAR NULL;


--changeset bharathvamsi.d@impactanalytics.co:ENTRY_DATE_and_EXIT_DATE_CHANGE stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding entry_date,exit_date columns 
ALTER TABLE "global".product_attributes_filter 
ADD COLUMN entry_date DATE,
ADD COLUMN exit_date DATE;


--changeset bharathvamsi.d@impactanalytics.co:CONTAINER_UTILIZATION_COST_FIX stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Allow NULL for container_utilization_per_unit and change cost type to double precision

ALTER TABLE "global".product_attributes_filter
ALTER COLUMN container_utilization_per_unit DROP NOT NULL,
ALTER COLUMN cost TYPE double precision USING cost::double precision;

--changeset bharathvamsi.d@impactanalytics.co:drop_container_utilization_per_unit stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: drop col container_utilization_per_unit
ALTER TABLE "global".product_attributes_filter
DROP COLUMN container_utilization_per_unit;

--changeset bharathvamsi.d@impactanalytics.co:add_container_utilization_per_unit stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: add col container_utilization_per_unit
ALTER TABLE "global".product_attributes_filter
ADD COLUMN container_utilization_per_unit float8 NULL;