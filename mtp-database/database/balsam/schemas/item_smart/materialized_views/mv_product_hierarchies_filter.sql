--liquibase formatted sql
--changeset abhimanyu.j@impactanalytics.co:mv_product_hierarchies_filter_1 stripComments:false runOnChange:true splitStatements:false context:Release_1_1 labels:New_Approach_of_MV
--comment: initial changeset for mv_product_hierarchies_filter_

do $$
    declare
        _index_build text;
        _index_builds text[];
        _build_view text;
        _build_views text[];
--        _sql text;
		v_execute text;
    begin

    
--    select 
--	  string_agg(col, ', ') into _sql 
--	from 
--	  (
--	    select 
--	      unnest(
--	        array[ 'hierarchy_code', 'level', 
--	        'active' ] :: varchar[]
--	      ) as col 
--	    union all 
--	    select 
--	      * 
--	    from 
--	      (
--	        select 
--	          concat(
--	            '"path"->>''', generic_column_name, 
--	            '''', ' AS ', generic_column_name
--	          ):: varchar as col 
--	        from 
--	          "global".product_generic_schema_mapping 
--	        where 
--	          required_in_product 
--	          and is_hierarchy 
--	        order by 
--	          hierarchy_level asc
--	      ) x
--	  ) x;
        select
          array_agg(
            concat(pindx.indexdef, ';')
          ) into _index_builds
        from
          (
            (
              select
                dependent_schema,
                dependent_table,
                dependent_objecttype,
                ROW_NUMBER() OVER() seq
              from
                (
                  WITH RECURSIVE view_deps AS (
                    SELECT
                      DISTINCT dependent_ns.nspname :: text as dependent_schema,
                      dependent_view.relname :: text as dependent_view,
                      case dependent_view.relkind when 'r' then 'TABLE' when 'm' then 'MATERIALIZED_VIEW' when 'i' then 'INDEX' when 'S' then 'SEQUENCE' when 'v' then 'VIEW' when 'c' then 'TYPE' else dependent_view.relkind :: text end as dependent_ObjectType,
                      source_ns.nspname :: text as source_schema,
                      source_table.relname :: text as source_table
                    FROM
                      pg_depend
                      JOIN pg_rewrite ON pg_depend.objid = pg_rewrite.oid
                      JOIN pg_class as dependent_view ON pg_rewrite.ev_class = dependent_view.oid
                      JOIN pg_class as source_table ON pg_depend.refobjid = source_table.oid
                      JOIN pg_namespace dependent_ns ON dependent_ns.oid = dependent_view.relnamespace
                      JOIN pg_namespace source_ns ON source_ns.oid = source_table.relnamespace
                    WHERE
                      NOT (
                        dependent_ns.nspname = source_ns.nspname
                        AND dependent_view.relname = source_table.relname
                      )
                      and source_table.relname = 'mv_product_hierarchies_filter'
                      and source_ns.nspname = 'item_smart'
                    UNION
                    SELECT
                      DISTINCT dependent_ns.nspname :: text as dependent_schema,
                      dependent_view.relname :: text as dependent_view,
                      case dependent_view.relkind when 'r' then 'TABLE' when 'm' then 'MATERIALIZED_VIEW' when 'i' then 'INDEX' when 'S' then 'SEQUENCE' when 'v' then 'VIEW' when 'c' then 'TYPE' else dependent_view.relkind :: text end as dependent_ObjectType,
                      source_ns.nspname :: text as source_schema,
                      source_table.relname :: text as source_table
                    FROM
                      pg_depend
                      JOIN pg_rewrite ON pg_depend.objid = pg_rewrite.oid
                      JOIN pg_class as dependent_view ON pg_rewrite.ev_class = dependent_view.oid
                      JOIN pg_class as source_table ON pg_depend.refobjid = source_table.oid
                      JOIN pg_namespace dependent_ns ON dependent_ns.oid = dependent_view.relnamespace
                      JOIN pg_namespace source_ns ON source_ns.oid = source_table.relnamespace
                      INNER JOIN view_deps vd ON vd.dependent_schema = source_ns.nspname
                      AND vd.dependent_view = source_table.relname
                      AND NOT (
                        dependent_ns.nspname = vd.dependent_schema
                        AND dependent_view.relname = vd.dependent_view
                      )
                  )
                  select
                    dependent_schema,
                    dependent_view as dependent_table,
                    dependent_objecttype
                  from
                    view_deps
                  where
                    1 = 1
                ) x
              where
                dependent_schema not in('cache')
            ) dep
            join pg_catalog.pg_indexes pindx on pindx.tablename = dep.dependent_table
            and pindx.schemaname = dep.dependent_schema
          );
        for _build_view in
        select
          case when dep.dependent_objecttype = 'MATERIALIZED_VIEW' then 'CREATE MATERIALIZED VIEW ' || schemaname || '.' || viewname || ' as ' || definition when dep.dependent_objecttype = 'VIEW' then 'CREATE OR REPLACE VIEW ' || schemaname || '.' || viewname || ' as ' || definition end as view_definition
        from
          (
            select
              schemaname schemaname,
              pv.viewname viewname,
              pv.viewowner viewowner,
              pv.definition definition
            from
              pg_catalog.pg_views pv
            union
            select
              pm.schemaname schemaname,
              pm.matviewname viewname,
              pm.matviewowner viewowner,
              pm.definition definition
            from
              pg_catalog.pg_matviews pm
          ) x
          join (
            select
              dependent_schema,
              dependent_table,
              dependent_objecttype,
              ROW_NUMBER() OVER() seq
            from
              (
                WITH RECURSIVE view_deps AS (
                  SELECT
                    DISTINCT dependent_ns.nspname :: text as dependent_schema,
                    dependent_view.relname :: text as dependent_view,
                    case dependent_view.relkind when 'r' then 'TABLE' when 'm' then 'MATERIALIZED_VIEW' when 'i' then 'INDEX' when 'S' then 'SEQUENCE' when 'v' then 'VIEW' when 'c' then 'TYPE' else dependent_view.relkind :: text end as dependent_ObjectType,
                    source_ns.nspname :: text as source_schema,
                    source_table.relname :: text as source_table
                  FROM
                    pg_depend
                    JOIN pg_rewrite ON pg_depend.objid = pg_rewrite.oid
                    JOIN pg_class as dependent_view ON pg_rewrite.ev_class = dependent_view.oid
                    JOIN pg_class as source_table ON pg_depend.refobjid = source_table.oid
                    JOIN pg_namespace dependent_ns ON dependent_ns.oid = dependent_view.relnamespace
                    JOIN pg_namespace source_ns ON source_ns.oid = source_table.relnamespace
                  WHERE
                    NOT (
                      dependent_ns.nspname = source_ns.nspname
                      AND dependent_view.relname = source_table.relname
                    )
                    and source_table.relname = 'mv_product_hierarchies_filter'
                    and source_ns.nspname = 'item_smart'
                  UNION
                  SELECT
                    DISTINCT dependent_ns.nspname :: text as dependent_schema,
                    dependent_view.relname :: text as dependent_view,
                    case dependent_view.relkind when 'r' then 'TABLE' when 'm' then 'MATERIALIZED_VIEW' when 'i' then 'INDEX' when 'S' then 'SEQUENCE' when 'v' then 'VIEW' when 'c' then 'TYPE' else dependent_view.relkind :: text end as dependent_ObjectType,
                    source_ns.nspname :: text as source_schema,
                    source_table.relname :: text as source_table
                  FROM
                    pg_depend
                    JOIN pg_rewrite ON pg_depend.objid = pg_rewrite.oid
                    JOIN pg_class as dependent_view ON pg_rewrite.ev_class = dependent_view.oid
                    JOIN pg_class as source_table ON pg_depend.refobjid = source_table.oid
                    JOIN pg_namespace dependent_ns ON dependent_ns.oid = dependent_view.relnamespace
                    JOIN pg_namespace source_ns ON source_ns.oid = source_table.relnamespace
                    INNER JOIN view_deps vd ON vd.dependent_schema = source_ns.nspname
                    AND vd.dependent_view = source_table.relname
                    AND NOT (
                      dependent_ns.nspname = vd.dependent_schema
                      AND dependent_view.relname = vd.dependent_view
                    )
                )
                select
                  dependent_schema,
                  dependent_view as dependent_table,
                  dependent_objecttype
                from
                  view_deps
                where
                  1 = 1
              ) x
            where
              1 = 1
              and (
                dependent_schema != 'cache'
                or dependent_objecttype != 'MATERIALIZED_VIEW'
              )
          ) dep on x.schemaname = dep.dependent_schema
          and x.viewname = dep.dependent_table
        order by
          dep.seq loop _build_views := array_append(_build_views, _build_view);
        end loop;

        -- delete from "cache".request_tracker;
        drop materialized view if exists "item_smart".mv_product_hierarchies_filter cascade;

        -- Put Def here --
		v_execute:='	CREATE MATERIALIZED VIEW item_smart.mv_product_hierarchies_filter
   
AS SELECT phf.hierarchy_code,
    phf.sku AS style,
    phf.level,
    agg.l6_id,
    agg.product_name_orig,
    agg.inserted_date,
    agg.modified_date,
    agg.l0_name,
    agg.created_at,
    agg.updated_at,
    agg.created_by,
    agg.updated_by,
    agg.replacement_product_codes,
    agg.reference_product_codes,
    agg.is_deleted,
    agg.cost_first_product_unit,
    agg.cost_fully_loaded_ship_value,
    agg.cost_fully_loaded_ship_unit,
    agg.minimum_order_quantity,
    agg.third_party_liaisonagent,
    agg.vendor_contact_name,
    agg.vendor_street_address,
    agg.vendor_city,
    agg.vendor_state,
    agg.vendor_zip_code,
    agg.vendor_country,
    agg.vendor_label,
    agg.cart_page_items_tree,
    agg.addtnl_categories_item_appearin,
    agg.tree_shape,
    agg.tree_setup_type,
    agg.needle_type,
    agg.material,
    agg.season,
    agg.holiday,
    agg.year,
    agg.filesourceid,
    agg.pipeline_runid,
    agg.fk_skuproductid,
    agg.approved_locations_cross_border_ship,
    agg.textile_features,
    agg.design_type,
    agg.key_theme_design,
    agg.perishable,
    agg.shelf_life,
    agg.kosher,
    agg.allergens,
    agg.ingredients,
    agg.balsamwebsites_externalkey,
    agg.f_externalkey,
    agg.f_familycode,
    agg.f_familydescription,
    agg.f_seo_followrobotsmetatag,
    agg.f_seo_hreflangdomain,
    agg.f_seo_hreflangurl,
    agg.f_seo_indexrobotsmetatag,
    agg.f_seo_metadescription,
    agg.f_seo_slug,
    agg.f_seo_titletag,
    agg.f_seo_canonicaltag,
    agg.compatibilitycode,
    agg.adapterplug,
    agg.transformer,
    agg.voltagetype,
    agg.warranty_eligibil_code_light,
    agg.warranty_eligibil_code_product,
    agg.warranty_eligibil_code_foliage,
    agg.type_of_serveware,
    agg.type_of_storage,
    agg.flavor,
    agg.shape_of_topiary,
    agg.shape_of_decor,
    agg.candle_type,
    agg.light_design,
    agg.gifting,
    agg.decorating_theme,
    agg.live_on_sitedate,
    agg.display_product_out_of_stock,
    agg.date_out_of_stock,
    agg.product_name_channel,
    agg.std_ship_cost_value,
    agg.std_ship_cost_unit,
    agg.channel_approval,
    agg.fk_productid,
    agg.carton_total_count,
    agg.lengths,
    agg.widths,
    agg.distinct_upc_count,
    agg.heights_distinct,
    agg.lengths_distinct,
    agg.l4_name,
    agg.heights,
    agg.raw_materials_type,
    agg.size_sml,
    agg.size,
    agg.weights,
    agg.l5_name,
    agg.widths_distinct,
    agg.weights_distinct,
    agg.l0_id,
    agg.l1_id,
    agg.l2_id,
    agg.l3_id,
    agg.l4_id,
    agg.l5_id,
    agg.product_id,
    agg.lifecycle,
    agg.pk_skuproductid,
    agg.sku_code,
    agg.obs_bh_product_name,
    agg.pillar_category,
    agg.id,
    agg.external_key,
    agg.language,
    agg.label,
    agg.channel_status,
    agg.brand,
    agg.category_path,
    agg.categorypage_pdp_badge,
    agg.grid_layout,
    agg.grid_rank,
    agg.balsam_hill_exclusive,
    agg.print_catalog,
    agg.product_description_headline,
    agg.product_description_shortened,
    agg.product_description,
    agg.onlinecatalog_prod_description,
    agg.pdpcontent_branch_details,
    agg.foliagemodule_branchsamplekit,
    agg.pdpcontent_realism,
    agg.pdpcontent_shape,
    agg.pdpcontent_lightguide,
    agg.pdpcontent_shapingtree,
    agg.pdpcontent_typeofshapingtree,
    agg.pdpcontent_storingtree,
    agg.pdpcontent_typeofstoringtree,
    agg.pdpcontent_hyperlink_viewcount_weight,
    agg.pdpcontent_whatsinboximage,
    agg.pdpcontent_whatsinboxtext,
    agg.pdpcontent_whatsinbox,
    agg.pdpcontent_assemblingtree,
    agg.needs_lifesize_largefigureverbiage,
    agg.seofollow_robotsmetatag,
    agg.seoindex_robotsmetatag,
    agg.seo_metadescription,
    agg.seo_slug,
    agg.seo_titletag,
    agg.return_standard,
    agg.return_shipping_method,
    agg.california_prop65_included,
    agg.productcontains_lead,
    agg.warranty_periodoftime,
    agg.tax_weee_eligible,
    agg.energy_star_certified,
    agg.ul_certification,
    agg.canadian_standards_association,
    agg.government_compliance,
    agg.warehouse_return,
    agg.product_name,
    agg.product_name AS item_name,
    agg.product_type AS generic_product_type,
    ''Regular''::text AS product_type,
    agg.sku,
    agg.sku as l6_name,
    agg.item_type,
    agg.entity_type,
    agg.prodname_detailed_reporting,
    agg.sap_number,
    agg.pim_id,
    agg.species_treegreenery,
    agg.light_color,
    agg.light_type,
    agg.type_lightcontrol,
    agg.timer,
    agg.outdoor_safe,
    agg.level_realism,
    agg.foliage_type,
    agg.number_sectionsintree,
    agg.number_branchtips,
    agg.pottedtree,
    agg.frosted,
    agg.display_sizerange,
    agg.color,
    agg.percent_material,
    agg.pe_percent_value,
    agg.pe_percent_unit,
    agg.pineneedle_percent_value,
    agg.pineneedle_percent_unit,
    agg.pvcpercent_value,
    agg.pvcpercent_unit,
    agg.l1_name,
    agg.l2_name,
    agg.l3_name,
    agg.raw_materials,
    agg.level_of_decoration,
    agg.length_cord_inches_value,
    agg.length_cord_inches_unit,
    agg.length_lit_length_value,
    agg.length_lit_length_unit,
    agg.assembly_required,
    agg.batteries_included,
    agg.batteries_required,
    agg.batteries_number_required,
    agg.batteries_type_required,
    agg.number_pairsofgloves,
    agg.tools_included,
    agg.femaletree_toppercord,
    agg.use_care_cleaning_recomdtn,
    agg.height_providedbyvendor,
    agg.height_value_converted_value,
    agg.height_value_converted_unit,
    agg.height_display_siteconverted,
    agg.height_override_display_site_convrt_val,
    agg.height_override_display_site_convrt_unit,
    agg.length_providedbyvendor,
    agg.length_value_converted_value,
    agg.length_value_converted_unit,
    agg.length_display_site_converted,
    agg.length_override_display_site_convrt_val,
    agg.length_override_display_site_convrt_unit,
    agg.width_providedbyvendor,
    agg.width_value_converted_value,
    agg.width_value_converted_unit,
    agg.width_display_siteconverted,
    agg.width_override_display_site_convrt_val,
    agg.width_override_display_site_convrt_unit,
    agg.diameter_providedbyvendor,
    agg.diameter_value_converted_value,
    agg.diameter_value_converted_unit,
    agg.diameter_display_site_converted,
    agg.diameter_override_display_site_convrt_val,
    agg.diameter_override_display_site_convrt_unit,
    agg.weight_providedbyvendor,
    agg.weight_value_converted_value,
    agg.weight_value_converted_unit,
    agg.weight_display_site_converted,
    agg.weight_override_display_site_convrt_value,
    agg.weight_override_display_site_convrt_unit,
    agg.attached_vessel_color,
    agg.attached_vessel_height_value,
    agg.attached_vessel_height_unit,
    agg.attached_vessel_length_value,
    agg.attached_vessel_length_unit,
    agg.attached_vessel_width_value,
    agg.attached_vessel_width_unit,
    agg.attache_vessel_material,
    agg.size_set_pack,
    agg.shatter_resistant,
    agg.tree_skirts_collars_shape,
    agg.personalization_monogram,
    agg.type_personalization,
    agg.scent,
    agg.scent_type,
    agg.wick_wax_type,
    agg.candle_burntime,
    agg.plays_music,
    agg.handcrafted,
    agg.handpainted,
    agg.tree_bag_sku,
    agg.number_tree_bags,
    agg.dimensions_tree_bag,
    agg.shipping_method,
    agg.oversized_shipping,
    agg.extended_leadtimetoship,
    agg.freight_classification,
    agg.drop_ship,
    agg.drop_ship_handling_fee_value,
    agg.drop_ship_handling_fee_unit,
    agg.retailpackaging_available,
    agg.masterpack_height_inches_value,
    agg.masterpack_height_inches_unit,
    agg.masterpack_length_inches_value,
    agg.masterpack_length_lnches_unit,
    agg.masterpack_width_inches_value,
    agg.masterpack_width_inches_unit,
    agg.masterpack_weight_lbs_value,
    agg.masterpack_weight_lbs_unit,
    agg.customs_info,
    agg.duty,
    agg.duty_charge_htc,
    agg.port_of_origin,
    agg.country_of_origin,
    agg.item_restricted_contiguous_us,
    agg.standard_ship_cost,
    agg.ship_cost_2_day_value,
    agg.ship_cost_2_day_unit,
    agg.express_ship_cost_value,
    agg.express_ship_cost_unit,
    agg.alhi_ship_cost_value,
    agg.alhi_ship_cost_unit,
    agg.canada_ship_cost_value,
    agg.canada_ship_cost_unit,
    agg.puerto_rico_ship_cost_value,
    agg.puerto_rico_ship_cost_unit,
    agg.vendor_productname,
    agg.vendor_partnumber_sku,
    agg.vendor_lightcolor,
    agg.vendor_lighttype,
    agg.light_count,
    agg.vendor_color,
    agg.cost_first_product_value,
    agg.price,
    agg.cost,
    agg.original_price,
    agg.product_bucket_code,
    agg.article,
    agg.product_code,
    agg.sku AS item,
    agg.receipt_date,
    agg.active,
    agg.clearance,
    ''Regular''::character varying AS product_status,
    agg.vendor,
    agg.entry_date::date AS launch_date,
    agg.exit_date::date AS exit_date,
    ly_sales,
    isw.store_count,
    agg.container_utilization
   FROM (	SELECT 
			hierarchy_code,
			level,
			active,
			"path"->>''l0_name'' AS l0_name,
			"path"->>''l1_name'' AS l1_name,
			"path"->>''l2_name'' AS l2_name,
			"path"->>''l3_name'' AS l3_name,
			"path"->>''l4_name'' AS l4_name,
			"path"->>''l5_name'' AS l5_name,
			"path"->>''sku'' AS sku,
			"path"->>''product_code'' AS product_code
		FROM 
		  global.product_hierarchies_filter ) phf
     JOIN ( SELECT max(paf.l6_id::text) AS l6_id,
            max(paf.product_name_orig::text) AS product_name_orig,
            max(paf.inserted_date::text) AS inserted_date,
            max(paf.modified_date::text) AS modified_date,
            paf.l0_name,
            min(paf.created_at) AS created_at,
            min(paf.updated_at) AS updated_at,
            max(paf.created_by) AS created_by,
            max(paf.updated_by) AS updated_by,
            max(paf.replacement_product_codes) AS replacement_product_codes,
            max(paf.reference_product_codes) AS reference_product_codes,
            bool_or(paf.is_deleted) AS is_deleted,
            max(paf.cost_first_product_unit::text) AS cost_first_product_unit,
            max(paf.cost_fully_loaded_ship_value) AS cost_fully_loaded_ship_value,
            max(paf.cost_fully_loaded_ship_unit::text) AS cost_fully_loaded_ship_unit,
            max(paf.minimum_order_quantity) AS minimum_order_quantity,
            max(paf.third_party_liaisonagent::text) AS third_party_liaisonagent,
            max(paf.vendor_contact_name::text) AS vendor_contact_name,
            max(paf.vendor_street_address::text) AS vendor_street_address,
            max(paf.vendor_city::text) AS vendor_city,
            max(paf.vendor_state::text) AS vendor_state,
            max(paf.vendor_zip_code::text) AS vendor_zip_code,
            max(paf.vendor_country::text) AS vendor_country,
            max(paf.vendor::text) AS vendor,
            max(paf.vendor_label::text) AS vendor_label,
            max(paf.cart_page_items_tree::text) AS cart_page_items_tree,
            max(paf.addtnl_categories_item_appearin::text) AS addtnl_categories_item_appearin,
            max(paf.tree_shape::text) AS tree_shape,
            max(paf.tree_setup_type::text) AS tree_setup_type,
            max(paf.needle_type::text) AS needle_type,
            max(paf.material::text) AS material,
            max(paf.season::text) AS season,
            max(paf.holiday::text) AS holiday,
            max(paf.year) AS year,
            max(paf.filesourceid) AS filesourceid,
            max(paf.pipeline_runid::text) AS pipeline_runid,
            max(paf.fk_skuproductid) AS fk_skuproductid,
            max(paf.approved_locations_cross_border_ship::text) AS approved_locations_cross_border_ship,
            max(paf.textile_features::text) AS textile_features,
            max(paf.design_type::text) AS design_type,
            max(paf.key_theme_design::text) AS key_theme_design,
            max(paf.perishable::text) AS perishable,
            max(paf.shelf_life::text) AS shelf_life,
            max(paf.kosher::text) AS kosher,
            max(paf.allergens::text) AS allergens,
            max(paf.ingredients::text) AS ingredients,
            max(paf.balsamwebsites_externalkey::text) AS balsamwebsites_externalkey,
            max(paf.f_externalkey::text) AS f_externalkey,
            max(paf.f_familycode::text) AS f_familycode,
            max(paf.f_familydescription::text) AS f_familydescription,
            max(paf.f_seo_followrobotsmetatag::text) AS f_seo_followrobotsmetatag,
            max(paf.f_seo_hreflangdomain::text) AS f_seo_hreflangdomain,
            max(paf.f_seo_hreflangurl::text) AS f_seo_hreflangurl,
            max(paf.f_seo_indexrobotsmetatag::text) AS f_seo_indexrobotsmetatag,
            max(paf.f_seo_metadescription::text) AS f_seo_metadescription,
            max(paf.f_seo_slug::text) AS f_seo_slug,
            max(paf.f_seo_titletag::text) AS f_seo_titletag,
            max(paf.f_seo_canonicaltag::text) AS f_seo_canonicaltag,
            max(paf.compatibilitycode::text) AS compatibilitycode,
            max(paf.adapterplug::text) AS adapterplug,
            max(paf.transformer::text) AS transformer,
            max(paf.voltagetype::text) AS voltagetype,
            max(paf.warranty_eligibil_code_light) AS warranty_eligibil_code_light,
            max(paf.warranty_eligibil_code_product) AS warranty_eligibil_code_product,
            max(paf.warranty_eligibil_code_foliage) AS warranty_eligibil_code_foliage,
            max(paf.type_of_serveware::text) AS type_of_serveware,
            max(paf.type_of_storage::text) AS type_of_storage,
            max(paf.flavor::text) AS flavor,
            max(paf.shape_of_topiary::text) AS shape_of_topiary,
            max(paf.shape_of_decor::text) AS shape_of_decor,
            max(paf.candle_type::text) AS candle_type,
            max(paf.light_design::text) AS light_design,
            max(paf.gifting::text) AS gifting,
            max(paf.decorating_theme::text) AS decorating_theme,
            min(paf.live_on_sitedate) AS live_on_sitedate,
            max(paf.display_product_out_of_stock::text) AS display_product_out_of_stock,
            min(paf.date_out_of_stock) AS date_out_of_stock,
            max(paf.product_name_channel::text) AS product_name_channel,
            max(paf.std_ship_cost_value) AS std_ship_cost_value,
            max(paf.std_ship_cost_unit::text) AS std_ship_cost_unit,
            max(paf.channel_approval::text) AS channel_approval,
            max(paf.fk_productid) AS fk_productid,
            max(paf.carton_total_count) AS carton_total_count,
            max(paf.lengths::text) AS lengths,
            max(paf.widths::text) AS widths,
            max(paf.distinct_upc_count) AS distinct_upc_count,
            max(paf.heights_distinct::text) AS heights_distinct,
            max(paf.lengths_distinct::text) AS lengths_distinct,
            paf.l4_name,
            max(paf.heights::text) AS heights,
            max(paf.raw_materials_type::text) AS raw_materials_type,
            max(paf.size_sml::text) AS size_sml,
            max(paf.size::text) AS size,
            max(paf.weights::text) AS weights,
            paf.l5_name,
            max(paf.widths_distinct::text) AS widths_distinct,
            max(paf.weights_distinct::text) AS weights_distinct,
            max(paf.l0_id) AS l0_id,
            max(paf.l1_id) AS l1_id,
            max(paf.l2_id) AS l2_id,
            max(paf.l3_id) AS l3_id,
            max(paf.l4_id) AS l4_id,
            max(paf.l5_id) AS l5_id,
            max(paf.product_id) AS product_id,
            max(paf.lifecycle::text) AS lifecycle,
            max(paf.pk_skuproductid) AS pk_skuproductid,
            max(paf.sku_code::text) AS sku_code,
            max(paf.obs_bh_product_name::text) AS obs_bh_product_name,
            max(paf.pillar_category::text) AS pillar_category,
            max(paf.id) AS id,
            max(paf.external_key::text) AS external_key,
            max(paf.language::text) AS language,
            max(paf.label::text) AS label,
            max(paf.channel_status::text) AS channel_status,
            max(paf.brand::text) AS brand,
            max(paf.category_path::text) AS category_path,
            max(paf.categorypage_pdp_badge::text) AS categorypage_pdp_badge,
            max(paf.grid_layout::text) AS grid_layout,
            max(paf.grid_rank) AS grid_rank,
            max(paf.balsam_hill_exclusive::text) AS balsam_hill_exclusive,
            max(paf.print_catalog::text) AS print_catalog,
            max(paf.product_description_headline::text) AS product_description_headline,
            max(paf.product_description_shortened::text) AS product_description_shortened,
            max(paf.PRODNAME_DETAILED_REPORTING::text) AS product_description,
            max(paf.onlinecatalog_prod_description::text) AS onlinecatalog_prod_description,
            max(paf.pdpcontent_branch_details::text) AS pdpcontent_branch_details,
            max(paf.foliagemodule_branchsamplekit::text) AS foliagemodule_branchsamplekit,
            max(paf.pdpcontent_realism::text) AS pdpcontent_realism,
            max(paf.pdpcontent_shape::text) AS pdpcontent_shape,
            max(paf.pdpcontent_lightguide::text) AS pdpcontent_lightguide,
            max(paf.pdpcontent_shapingtree::text) AS pdpcontent_shapingtree,
            max(paf.pdpcontent_typeofshapingtree::text) AS pdpcontent_typeofshapingtree,
            max(paf.pdpcontent_storingtree::text) AS pdpcontent_storingtree,
            max(paf.pdpcontent_typeofstoringtree::text) AS pdpcontent_typeofstoringtree,
            max(paf.pdpcontent_hyperlink_viewcount_weight::text) AS pdpcontent_hyperlink_viewcount_weight,
            max(paf.pdpcontent_whatsinboximage::text) AS pdpcontent_whatsinboximage,
            max(paf.pdpcontent_whatsinboxtext::text) AS pdpcontent_whatsinboxtext,
            max(paf.pdpcontent_whatsinbox::text) AS pdpcontent_whatsinbox,
            max(paf.pdpcontent_assemblingtree::text) AS pdpcontent_assemblingtree,
            max(paf.needs_lifesize_largefigureverbiage::text) AS needs_lifesize_largefigureverbiage,
            max(paf.seofollow_robotsmetatag::text) AS seofollow_robotsmetatag,
            max(paf.seoindex_robotsmetatag::text) AS seoindex_robotsmetatag,
            max(paf.seo_metadescription::text) AS seo_metadescription,
            max(paf.seo_slug::text) AS seo_slug,
            max(paf.seo_titletag::text) AS seo_titletag,
            max(paf.return_standard::text) AS return_standard,
            max(paf.return_shipping_method::text) AS return_shipping_method,
            max(paf.california_prop65_included::text) AS california_prop65_included,
            max(paf.productcontains_lead::text) AS productcontains_lead,
            max(paf.warranty_periodoftime::text) AS warranty_periodoftime,
            max(paf.tax_weee_eligible::text) AS tax_weee_eligible,
            max(paf.energy_star_certified::text) AS energy_star_certified,
            max(paf.ul_certification::text) AS ul_certification,
            max(paf.canadian_standards_association::text) AS canadian_standards_association,
            max(paf.government_compliance::text) AS government_compliance,
            max(paf.warehouse_return) AS warehouse_return,
            max(paf.product_name::text) AS product_name,
            max(paf.product_type::text) AS product_type,
            max(paf.sku::text) AS sku,
            max(paf.item_type::text) AS item_type,
            max(paf.entity_type::text) AS entity_type,
            max(paf.prodname_detailed_reporting::text) AS prodname_detailed_reporting,
            max(paf.sap_number::text) AS sap_number,
            max(paf.pim_id::text) AS pim_id,
            max(paf.species_treegreenery::text) AS species_treegreenery,
            max(paf.light_color::text) AS light_color,
            max(paf.light_type::text) AS light_type,
            max(paf.type_lightcontrol::text) AS type_lightcontrol,
            max(paf.timer::text) AS timer,
            max(paf.outdoor_safe::text) AS outdoor_safe,
            max(paf.level_realism::text) AS level_realism,
            max(paf.foliage_type::text) AS foliage_type,
            max(paf.number_sectionsintree) AS number_sectionsintree,
            max(paf.number_branchtips) AS number_branchtips,
            max(paf.pottedtree::text) AS pottedtree,
            max(paf.frosted::text) AS frosted,
            max(paf.display_sizerange::text) AS display_sizerange,
            max(paf.color::text) AS color,
            max(paf.percent_material::text) AS percent_material,
            max(paf.pe_percent_value) AS pe_percent_value,
            max(paf.pe_percent_unit::text) AS pe_percent_unit,
            max(paf.pineneedle_percent_value) AS pineneedle_percent_value,
            max(paf.pineneedle_percent_unit::text) AS pineneedle_percent_unit,
            max(paf.pvcpercent_value) AS pvcpercent_value,
            max(paf.pvcpercent_unit::text) AS pvcpercent_unit,
            paf.l1_name,
            paf.l2_name,
            paf.l3_name,
            max(paf.raw_materials::text) AS raw_materials,
            max(paf.level_of_decoration::text) AS level_of_decoration,
            max(paf.length_cord_inches_value) AS length_cord_inches_value,
            max(paf.length_cord_inches_unit::text) AS length_cord_inches_unit,
            max(paf.length_lit_length_value) AS length_lit_length_value,
            max(paf.length_lit_length_unit::text) AS length_lit_length_unit,
            max(paf.assembly_required::text) AS assembly_required,
            max(paf.batteries_included::text) AS batteries_included,
            max(paf.batteries_required::text) AS batteries_required,
            max(paf.batteries_number_required) AS batteries_number_required,
            max(paf.batteries_type_required::text) AS batteries_type_required,
            max(paf.number_pairsofgloves) AS number_pairsofgloves,
            max(paf.tools_included::text) AS tools_included,
            max(paf.femaletree_toppercord::text) AS femaletree_toppercord,
            max(paf.use_care_cleaning_recomdtn::text) AS use_care_cleaning_recomdtn,
            max(paf.height_providedbyvendor::text) AS height_providedbyvendor,
            max(paf.height_value_converted_value) AS height_value_converted_value,
            max(paf.height_value_converted_unit::text) AS height_value_converted_unit,
            max(paf.height_display_siteconverted) AS height_display_siteconverted,
            max(paf.height_override_display_site_convrt_val) AS height_override_display_site_convrt_val,
            max(paf.height_override_display_site_convrt_unit::text) AS height_override_display_site_convrt_unit,
            max(paf.length_providedbyvendor::text) AS length_providedbyvendor,
            max(paf.length_value_converted_value) AS length_value_converted_value,
            max(paf.length_value_converted_unit::text) AS length_value_converted_unit,
            max(paf.length_display_site_converted) AS length_display_site_converted,
            max(paf.length_override_display_site_convrt_val) AS length_override_display_site_convrt_val,
            max(paf.length_override_display_site_convrt_unit::text) AS length_override_display_site_convrt_unit,
            max(paf.width_providedbyvendor::text) AS width_providedbyvendor,
            max(paf.width_value_converted_value) AS width_value_converted_value,
            max(paf.width_value_converted_unit::text) AS width_value_converted_unit,
            max(paf.width_display_siteconverted) AS width_display_siteconverted,
            max(paf.width_override_display_site_convrt_val) AS width_override_display_site_convrt_val,
            max(paf.width_override_display_site_convrt_unit::text) AS width_override_display_site_convrt_unit,
            max(paf.diameter_providedbyvendor::text) AS diameter_providedbyvendor,
            max(paf.diameter_value_converted_value) AS diameter_value_converted_value,
            max(paf.diameter_value_converted_unit::text) AS diameter_value_converted_unit,
            max(paf.diameter_display_site_converted) AS diameter_display_site_converted,
            max(paf.diameter_override_display_site_convrt_val) AS diameter_override_display_site_convrt_val,
            max(paf.diameter_override_display_site_convrt_unit::text) AS diameter_override_display_site_convrt_unit,
            max(paf.weight_providedbyvendor::text) AS weight_providedbyvendor,
            max(paf.weight_value_converted_value) AS weight_value_converted_value,
            max(paf.weight_value_converted_unit::text) AS weight_value_converted_unit,
            max(paf.weight_display_site_converted) AS weight_display_site_converted,
            max(paf.weight_override_display_site_convrt_value) AS weight_override_display_site_convrt_value,
            max(paf.weight_override_display_site_convrt_unit::text) AS weight_override_display_site_convrt_unit,
            max(paf.attached_vessel_color::text) AS attached_vessel_color,
            max(paf.attached_vessel_height_value) AS attached_vessel_height_value,
            max(paf.attached_vessel_height_unit::text) AS attached_vessel_height_unit,
            max(paf.attached_vessel_length_value) AS attached_vessel_length_value,
            max(paf.attached_vessel_length_unit::text) AS attached_vessel_length_unit,
            max(paf.attached_vessel_width_value) AS attached_vessel_width_value,
            max(paf.attached_vessel_width_unit::text) AS attached_vessel_width_unit,
            max(paf.attache_vessel_material::text) AS attache_vessel_material,
            max(paf.size_set_pack) AS size_set_pack,
            max(paf.shatter_resistant::text) AS shatter_resistant,
            max(paf.tree_skirts_collars_shape::text) AS tree_skirts_collars_shape,
            max(paf.personalization_monogram::text) AS personalization_monogram,
            max(paf.type_personalization::text) AS type_personalization,
            max(paf.scent::text) AS scent,
            max(paf.scent_type::text) AS scent_type,
            max(paf.wick_wax_type::text) AS wick_wax_type,
            max(paf.candle_burntime) AS candle_burntime,
            max(paf.plays_music::text) AS plays_music,
            max(paf.handcrafted::text) AS handcrafted,
            max(paf.handpainted::text) AS handpainted,
            max(paf.tree_bag_sku::text) AS tree_bag_sku,
            max(paf.number_tree_bags) AS number_tree_bags,
            max(paf.dimensions_tree_bag::text) AS dimensions_tree_bag,
            max(paf.shipping_method::text) AS shipping_method,
            max(paf.oversized_shipping::text) AS oversized_shipping,
            max(paf.extended_leadtimetoship::text) AS extended_leadtimetoship,
            max(paf.freight_classification::text) AS freight_classification,
            max(paf.drop_ship::text) AS drop_ship,
            max(paf.drop_ship_handling_fee_value) AS drop_ship_handling_fee_value,
            max(paf.drop_ship_handling_fee_unit::text) AS drop_ship_handling_fee_unit,
            max(paf.retailpackaging_available::text) AS retailpackaging_available,
            max(paf.masterpack_height_inches_value) AS masterpack_height_inches_value,
            max(paf.masterpack_height_inches_unit::text) AS masterpack_height_inches_unit,
            max(paf.masterpack_length_inches_value) AS masterpack_length_inches_value,
            max(paf.masterpack_length_lnches_unit::text) AS masterpack_length_lnches_unit,
            max(paf.masterpack_width_inches_value) AS masterpack_width_inches_value,
            max(paf.masterpack_width_inches_unit::text) AS masterpack_width_inches_unit,
            max(paf.masterpack_weight_lbs_value) AS masterpack_weight_lbs_value,
            max(paf.masterpack_weight_lbs_unit::text) AS masterpack_weight_lbs_unit,
            max(paf.customs_info::text) AS customs_info,
            max(paf.duty::text) AS duty,
            max(paf.duty_charge_htc::text) AS duty_charge_htc,
            max(paf.port_of_origin::text) AS port_of_origin,
            max(paf.country_of_origin::text) AS country_of_origin,
            max(paf.item_restricted_contiguous_us::text) AS item_restricted_contiguous_us,
            max(paf.standard_ship_cost) AS standard_ship_cost,
            max(paf.ship_cost_2_day_value) AS ship_cost_2_day_value,
            max(paf.ship_cost_2_day_unit::text) AS ship_cost_2_day_unit,
            max(paf.express_ship_cost_value) AS express_ship_cost_value,
            max(paf.express_ship_cost_unit::text) AS express_ship_cost_unit,
            max(paf.alhi_ship_cost_value) AS alhi_ship_cost_value,
            max(paf.alhi_ship_cost_unit::text) AS alhi_ship_cost_unit,
            max(paf.canada_ship_cost_value) AS canada_ship_cost_value,
            max(paf.canada_ship_cost_unit::text) AS canada_ship_cost_unit,
            max(paf.puerto_rico_ship_cost_value) AS puerto_rico_ship_cost_value,
            max(paf.puerto_rico_ship_cost_unit::text) AS puerto_rico_ship_cost_unit,
            max(paf.vendor_productname::text) AS vendor_productname,
            max(paf.vendor_partnumber_sku::text) AS vendor_partnumber_sku,
            max(paf.vendor_lightcolor::text) AS vendor_lightcolor,
            max(paf.vendor_lighttype::text) AS vendor_lighttype,
            max(paf.light_count) AS light_count,
            max(paf.vendor_color::text) AS vendor_color,
            max(paf.cost_first_product_value) AS cost_first_product_value,
            avg(paf.price) AS price,
            avg(paf.cost) AS cost,
            avg(paf.original_price) AS original_price,
            max(paf.product_bucket_code) AS product_bucket_code,
            max(paf.article) AS article,
            paf.product_code,
            avg(paf.container_utilization_per_unit) as container_utilization,
            min(paf.receipt_date) AS receipt_date,
            bool_or(paf.active) AS active,
            bool_or(paf.clearance) AS clearance,
            paf.entry_date,
            paf.exit_date
           FROM global.product_attributes_filter paf
          GROUP BY paf.l0_name, paf.l1_name, paf.l2_name, paf.l3_name, paf.l4_name, paf.l5_name, paf.product_code) agg 
          ON agg.l0_name::text = phf.l0_name AND agg.l1_name::text = phf.l1_name AND agg.l2_name::text = phf.l2_name AND agg.l3_name::text = phf.l3_name AND agg.l4_name::text = phf.l4_name AND agg.l5_name::text = phf.l5_name AND agg.product_code::text = concat(agg.l0_name, ''_'', phf.sku)
          left join item_smart.ly_sales ly
          on phf.hierarchy_code = ly.hierarchy_code
          JOIN item_smart.itemfact_sku isw 
          ON phf.hierarchy_code = isw.hierarchy_code and phf.l1_name = isw.dept

  WHERE phf.level = 7 AND phf.active = true and agg.active = true
WITH DATA;';
    ---------till here   -------------------------------

raise notice '%',v_execute;

execute v_execute;

    ---------till here   -------------------------------
        if cardinality(_build_views) > 0 THEN
            FOREACH _build_view in array _build_views loop
                execute _build_view;
            end loop;
        end if;

        if cardinality(_index_builds) > 0 THEN
            FOREACH _index_build in array _index_builds loop
                execute _index_build;
            end loop;
        end if;
    end;
$$;



--changeset kalyan.chandu@impactanalytics.co:mv_index stripComments:false splitStatements:false context:Release_index labels:indexes-fix-mv
--comment: mv_index
CREATE INDEX idx_hcode_mv_phf ON item_smart.mv_product_hierarchies_filter USING btree (hierarchy_code);
CREATE UNIQUE INDEX ux_mv_hierarchy_l0_l5_sku
ON item_smart.mv_product_hierarchies_filter (
  l0_name, l1_name, l2_name, l3_name, l4_name, l5_name, l6_name, sku
);
