--liquibase formatted sql
--changeset sonika.baheti@impactanalytics.co:mv_product_hierarchies_filter stripComments:false runOnChange:true splitStatements:false context:Release_1_1 labels:New_Approach_of_MV
--comment: initial changeset for mv_product_hierarchies_filter
do $$
    declare
        _index_build text;
        _index_builds text[];
        _build_view text;
        _build_views text[];
    begin
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
			CREATE MATERIALIZED VIEW item_smart.mv_product_hierarchies_filter
			   
			AS SELECT phf.hierarchy_code,
    phf.country,
    phf.country AS l0_name,
    phf.channel  as l1_name,
    phf.l2_name,
    phf.l3_name,
    phf.l4_name,
    phf.l5_name,
    phf.style,
    phf.level,
    paf.price,
    paf.cost,
    paf.original_price,
    paf.active,
    paf.clearance,
    paf.receipt_date,
    paf.created_at,
    paf.updated_at,
    paf.created_by,
    paf.updated_by,
    paf.replacement_product_codes,
    paf.reference_product_codes,
    paf.is_deleted,
    paf.article,
    paf.size,
    paf.rtl_released_flg,
    paf.l2_id,
    paf.rtl_prnt_sty_dsc,
    paf.planned_clearance_date,
    paf.l3_id,
    paf.floorset_date,
    paf.sty_secondary_occsn_end_use_dsc,
    paf.leg_type,
    paf.prod_sku_key,
    paf.l5_id,
    paf.rtl_prnt_sty_id,
    paf.class,
    paf.season_yr_dsc,
    paf.season_yr_cd,
    paf.subclass_id,
    paf.country_product,
    paf.l11_id,
    paf.clearance_flag,
    paf.item_group_desc,
    paf.sku,
    paf.l4_id,
    paf.product_bucket_code,
    paf.rtl_shared_exclusive_dsc,
    paf.collection,
    paf.product_life_cycle,
    paf.sleeve_length_dsc,
    paf.in_stock_pct,
    paf.rtl_prnt_sty_cd,
    paf.launch_date,
    paf.osv_flag,
    paf.workstream,
    paf.pln_clearance_dt_id,
    paf.sleeve_type,
    paf.dailysoopp,
    paf.dailysou,
    paf.msrp,
    paf.l1_id,
    paf.gender,
    paf.prod_sz_key,
    paf.item_group_id,
    paf.reportable_season_dsc,
    paf.collection_id,
    paf.l10_id,
    paf.subclass,
    paf.leg_length_dsc,
    paf.seltd_szs_dsc,
    paf.season,
    paf.sty_primary_occsn_end_use_dsc,
    paf.availability_dt_id,
    paf.class_id,
    paf.clearance_date,
    paf.l0_id,
    paf.season_id,
    paf.style_description,
    paf.rcl_hash,
    paf.psa_codes,
    paf.sty_print_pattern_cd,
    paf.upc_nbr,
    paf.primary_vendor_cd,
    paf.sz_rng_cd,
    paf.hang_fold_cd,
    paf.sty_primary_color_fam_cd,
    paf.strtgy_lnch_dt_id,
    paf.rtl_pricing_dsc,
    paf.planning_level_dsc,
    paf.primary_vendor_dsc,
    paf.age,
    paf.prod_sty_body_fiber_1_dsc,
    paf.flex_space_strategy,
    paf.prod_initiative,
    paf.product_strategy,
    paf.active_ladder_flg,
    paf.ordering,
    paf.replenishment_status,
    phf.replenishment_flag,
    paf.clr_start_date,
    paf.product_status,
    'Regular'::character varying AS product_type,
    NULL::date AS exit_date
   FROM item_smart.product_hierarchies_filter_flattened_item phf
     JOIN ( WITH product_attributes_filter AS (
                 SELECT product_attributes_filter.product_code,
                    product_attributes_filter.product_name,
                    product_attributes_filter.product_description,
                    product_attributes_filter.price,
                    product_attributes_filter.cost,
                    product_attributes_filter.original_price,
                    product_attributes_filter.active,
                    product_attributes_filter.clearance,
                    product_attributes_filter.receipt_date,
                    product_attributes_filter.created_at,
                    product_attributes_filter.updated_at,
                    product_attributes_filter.created_by,
                    product_attributes_filter.updated_by,
                    product_attributes_filter.replacement_product_codes,
                    product_attributes_filter.reference_product_codes,
                    product_attributes_filter.is_deleted,
                    product_attributes_filter.l0_name,
                    product_attributes_filter.l1_name,
                    product_attributes_filter.l2_name,
                    product_attributes_filter.l3_name,
                    product_attributes_filter.l4_name,
                    product_attributes_filter.article,
                    product_attributes_filter.size,
                    product_attributes_filter.style,
                    product_attributes_filter.rtl_released_flg,
                    product_attributes_filter.l2_id,
                    product_attributes_filter.rtl_prnt_sty_dsc,
                    product_attributes_filter.planned_clearance_date,
                    product_attributes_filter.l3_id,
                    product_attributes_filter.floorset_date,
                    product_attributes_filter.sty_secondary_occsn_end_use_dsc,
                    product_attributes_filter.l5_name,
                    product_attributes_filter.leg_type,
                    product_attributes_filter.prod_sku_key,
                    product_attributes_filter.l5_id,
                    product_attributes_filter.rtl_prnt_sty_id,
                    product_attributes_filter.class,
                    product_attributes_filter.season_yr_dsc,
                    product_attributes_filter.season_yr_cd,
                    product_attributes_filter.subclass_id,
                    product_attributes_filter.country_product,
                    product_attributes_filter.l11_id,
                    product_attributes_filter.clearance_flag,
                    product_attributes_filter.item_group_desc,
                    product_attributes_filter.sku,
                    product_attributes_filter.l4_id,
                    product_attributes_filter.product_bucket_code,
                    product_attributes_filter.rtl_shared_exclusive_dsc,
                    product_attributes_filter.collection,
                    product_attributes_filter.product_life_cycle,
                    product_attributes_filter.sleeve_length_dsc,
                    product_attributes_filter.in_stock_pct,
                    product_attributes_filter.rtl_prnt_sty_cd,
                    product_attributes_filter.launch_date,
                    product_attributes_filter.osv_flag,
                    product_attributes_filter.workstream,
                    product_attributes_filter.pln_clearance_dt_id,
                    product_attributes_filter.sleeve_type,
                    product_attributes_filter.dailysoopp,
                    product_attributes_filter.dailysou,
                    product_attributes_filter.msrp,
                    product_attributes_filter.l1_id,
                    product_attributes_filter.gender,
                    product_attributes_filter.prod_sz_key,
                    product_attributes_filter.item_group_id,
                    product_attributes_filter.reportable_season_dsc,
                    product_attributes_filter.collection_id,
                    product_attributes_filter.l10_id,
                    product_attributes_filter.subclass,
                    product_attributes_filter.leg_length_dsc,
                    product_attributes_filter.seltd_szs_dsc,
                    product_attributes_filter.season,
                    product_attributes_filter.sty_primary_occsn_end_use_dsc,
                    product_attributes_filter.availability_dt_id,
                    product_attributes_filter.class_id,
                    product_attributes_filter.clearance_date,
                    product_attributes_filter.l0_id,
                    product_attributes_filter.season_id,
                    product_attributes_filter.style_description,
                    product_attributes_filter.rcl_hash,
                    product_attributes_filter.psa_codes,
                    product_attributes_filter.sty_print_pattern_cd,
                    product_attributes_filter.upc_nbr,
                    product_attributes_filter.primary_vendor_cd,
                    product_attributes_filter.sz_rng_cd,
                    product_attributes_filter.hang_fold_cd,
                    product_attributes_filter.sty_primary_color_fam_cd,
                    product_attributes_filter.strtgy_lnch_dt_id,
                    product_attributes_filter.rtl_pricing_dsc,
                    product_attributes_filter.planning_level_dsc,
                    product_attributes_filter.primary_vendor_dsc,
                    product_attributes_filter.age,
                    product_attributes_filter.prod_sty_body_fiber_1_dsc,
                    product_attributes_filter.flex_space_strategy,
                    product_attributes_filter.prod_initiative,
                    product_attributes_filter.product_strategy,
                    product_attributes_filter.active_ladder_flg,
                    product_attributes_filter.ordering,
                    product_attributes_filter.replenishment_status,
                        CASE
                            WHEN product_attributes_filter.clearance_date <= product_attributes_filter.planned_clearance_date THEN product_attributes_filter.clearance_date
                            ELSE product_attributes_filter.planned_clearance_date
                        END AS clr_start_date
                   FROM global.product_attributes_filter
                )
         SELECT sp.country,
         	sp.l1_name,
            sp.l2_name,
            sp.l3_name,
            sp.l4_name,
            sp.l5_name,
            sp.style,
            sp.price,
            sp.cost,
            sp.original_price,
            sp.active,
            sp.clearance,
            sp.receipt_date,
            sp.created_at,
            sp.updated_at,
            sp.created_by,
            sp.updated_by,
            sp.replacement_product_codes,
            sp.reference_product_codes,
            sp.is_deleted,
            sp.article,
            sp.size,
            sp.rtl_released_flg,
            sp.l2_id,
            sp.rtl_prnt_sty_dsc,
            sp.planned_clearance_date,
            sp.l3_id,
            sp.floorset_date,
            sp.sty_secondary_occsn_end_use_dsc,
            sp.leg_type,
            sp.prod_sku_key,
            sp.l5_id,
            sp.rtl_prnt_sty_id,
            sp.class,
            sp.season_yr_dsc,
            sp.season_yr_cd,
            sp.subclass_id,
            sp.country_product,
            sp.l11_id,
            sp.clearance_flag,
            sp.item_group_desc,
            sp.sku,
            sp.l4_id,
            sp.product_bucket_code,
            sp.rtl_shared_exclusive_dsc,
            sp.collection,
            sp.product_life_cycle,
            sp.sleeve_length_dsc,
            sp.in_stock_pct,
            sp.rtl_prnt_sty_cd,
            sp.launch_date,
            sp.osv_flag,
            sp.workstream,
            sp.pln_clearance_dt_id,
            sp.sleeve_type,
            sp.dailysoopp,
            sp.dailysou,
            sp.msrp,
            sp.l1_id,
            sp.gender,
            sp.prod_sz_key,
            sp.item_group_id,
            sp.reportable_season_dsc,
            sp.collection_id,
            sp.l10_id,
            sp.subclass,
            sp.leg_length_dsc,
            sp.seltd_szs_dsc,
            sp.season,
            sp.sty_primary_occsn_end_use_dsc,
            sp.availability_dt_id,
            sp.class_id,
            sp.clearance_date,
            sp.l0_id,
            sp.season_id,
            sp.style_description,
            sp.rcl_hash,
            sp.psa_codes,
            sp.sty_print_pattern_cd,
            sp.upc_nbr,
            sp.primary_vendor_cd,
            sp.sz_rng_cd,
            sp.hang_fold_cd,
            sp.sty_primary_color_fam_cd,
            sp.strtgy_lnch_dt_id,
            sp.rtl_pricing_dsc,
            sp.planning_level_dsc,
            sp.primary_vendor_dsc,
            sp.age,
            sp.prod_sty_body_fiber_1_dsc,
            sp.flex_space_strategy,
            sp.prod_initiative,
            sp.product_strategy,
            sp.active_ladder_flg,
            sp.ordering,
            sp.replenishment_status,
            sp.clr_start_date,
                CASE
                    WHEN CURRENT_DATE <= sp.clr_start_date THEN 'Regular'::text
                    ELSE 'Clearance'::text
                END AS product_status
           FROM ( SELECT product_attributes_filter.l0_name AS country,
           			product_attributes_filter.l1_name,
                    product_attributes_filter.l2_name,
                    product_attributes_filter.l3_name,
                    product_attributes_filter.l4_name,
                    product_attributes_filter.l5_name,
                    product_attributes_filter.style,
                    avg(product_attributes_filter.price) AS price,
                    avg(product_attributes_filter.cost) AS cost,
                    avg(product_attributes_filter.original_price) AS original_price,
                    bool_or(product_attributes_filter.active) AS active,
                    bool_or(product_attributes_filter.clearance) AS clearance,
                    min(product_attributes_filter.receipt_date) AS receipt_date,
                    min(product_attributes_filter.created_at) AS created_at,
                    min(product_attributes_filter.updated_at) AS updated_at,
                    min(product_attributes_filter.created_by) AS created_by,
                    min(product_attributes_filter.updated_by) AS updated_by,
                    max(product_attributes_filter.replacement_product_codes) AS replacement_product_codes,
                    max(product_attributes_filter.reference_product_codes) AS reference_product_codes,
                    bool_or(product_attributes_filter.is_deleted) AS is_deleted,
                    max(product_attributes_filter.article::text) AS article,
                    max(product_attributes_filter.size::text) AS size,
                    max(product_attributes_filter.rtl_released_flg::text) AS rtl_released_flg,
                    max(product_attributes_filter.l2_id::text) AS l2_id,
                    max(product_attributes_filter.rtl_prnt_sty_dsc::text) AS rtl_prnt_sty_dsc,
                    min(product_attributes_filter.planned_clearance_date) AS planned_clearance_date,
                    max(product_attributes_filter.l3_id::text) AS l3_id,
                    min(product_attributes_filter.floorset_date) AS floorset_date,
                    max(product_attributes_filter.sty_secondary_occsn_end_use_dsc::text) AS sty_secondary_occsn_end_use_dsc,
                    max(product_attributes_filter.leg_type::text) AS leg_type,
                    max(product_attributes_filter.prod_sku_key::text) AS prod_sku_key,
                    max(product_attributes_filter.l5_id::text) AS l5_id,
                    max(product_attributes_filter.rtl_prnt_sty_id::text) AS rtl_prnt_sty_id,
                    max(product_attributes_filter.class::text) AS class,
                    max(product_attributes_filter.season_yr_dsc::text) AS season_yr_dsc,
                    max(product_attributes_filter.season_yr_cd::text) AS season_yr_cd,
                    max(product_attributes_filter.subclass_id::text) AS subclass_id,
                    max(product_attributes_filter.country_product::text) AS country_product,
                    max(product_attributes_filter.l11_id::text) AS l11_id,
                    max(product_attributes_filter.clearance_flag::text) AS clearance_flag,
                    max(product_attributes_filter.item_group_desc::text) AS item_group_desc,
                    max(product_attributes_filter.sku::text) AS sku,
                    max(product_attributes_filter.l4_id::text) AS l4_id,
                    max(product_attributes_filter.product_bucket_code) AS product_bucket_code,
                    max(product_attributes_filter.rtl_shared_exclusive_dsc::text) AS rtl_shared_exclusive_dsc,
                    max(product_attributes_filter.collection::text) AS collection,
                    max(product_attributes_filter.product_life_cycle::text) AS product_life_cycle,
                    max(product_attributes_filter.sleeve_length_dsc::text) AS sleeve_length_dsc,
                    max(product_attributes_filter.in_stock_pct) AS in_stock_pct,
                    max(product_attributes_filter.rtl_prnt_sty_cd::text) AS rtl_prnt_sty_cd,
                    min(product_attributes_filter.launch_date) AS launch_date,
                    max(product_attributes_filter.osv_flag::text) AS osv_flag,
                    max(product_attributes_filter.workstream::text) AS workstream,
                    max(product_attributes_filter.pln_clearance_dt_id) AS pln_clearance_dt_id,
                    max(product_attributes_filter.sleeve_type::text) AS sleeve_type,
                    max(product_attributes_filter.dailysoopp) AS dailysoopp,
                    max(product_attributes_filter.dailysou) AS dailysou,
                    avg(product_attributes_filter.msrp) AS msrp,
                    max(product_attributes_filter.l1_id::text) AS l1_id,
                    max(product_attributes_filter.gender::text) AS gender,
                    max(product_attributes_filter.prod_sz_key::text) AS prod_sz_key,
                    max(product_attributes_filter.item_group_id::text) AS item_group_id,
                    max(product_attributes_filter.reportable_season_dsc::text) AS reportable_season_dsc,
                    max(product_attributes_filter.collection_id::text) AS collection_id,
                    max(product_attributes_filter.l10_id::text) AS l10_id,
                    max(product_attributes_filter.subclass::text) AS subclass,
                    max(product_attributes_filter.leg_length_dsc::text) AS leg_length_dsc,
                    max(product_attributes_filter.seltd_szs_dsc::text) AS seltd_szs_dsc,
                    max(product_attributes_filter.season::text) AS season,
                    max(product_attributes_filter.sty_primary_occsn_end_use_dsc::text) AS sty_primary_occsn_end_use_dsc,
                    max(product_attributes_filter.availability_dt_id) AS availability_dt_id,
                    max(product_attributes_filter.class_id::text) AS class_id,
                    min(product_attributes_filter.clearance_date) AS clearance_date,
                    max(product_attributes_filter.l0_id) AS l0_id,
                    max(product_attributes_filter.season_id::text) AS season_id,
                    max(product_attributes_filter.style_description::text) AS style_description,
                    jsonb_agg(product_attributes_filter.rcl_hash) AS rcl_hash,
                    max(product_attributes_filter.psa_codes) AS psa_codes,
                    max(product_attributes_filter.sty_print_pattern_cd::text) AS sty_print_pattern_cd,
                    max(product_attributes_filter.upc_nbr::text) AS upc_nbr,
                    max(product_attributes_filter.primary_vendor_cd::text) AS primary_vendor_cd,
                    max(product_attributes_filter.sz_rng_cd::text) AS sz_rng_cd,
                    max(product_attributes_filter.hang_fold_cd::text) AS hang_fold_cd,
                    max(product_attributes_filter.sty_primary_color_fam_cd::text) AS sty_primary_color_fam_cd,
                    max(product_attributes_filter.strtgy_lnch_dt_id) AS strtgy_lnch_dt_id,
                    max(product_attributes_filter.rtl_pricing_dsc::text) AS rtl_pricing_dsc,
                    max(product_attributes_filter.planning_level_dsc::text) AS planning_level_dsc,
                    max(product_attributes_filter.primary_vendor_dsc::text) AS primary_vendor_dsc,
                    max(product_attributes_filter.age::text) AS age,
                    max(product_attributes_filter.prod_sty_body_fiber_1_dsc::text) AS prod_sty_body_fiber_1_dsc,
                    max(product_attributes_filter.flex_space_strategy::text) AS flex_space_strategy,
                    max(product_attributes_filter.prod_initiative::text) AS prod_initiative,
                    max(product_attributes_filter.product_strategy::text) AS product_strategy,
                    bool_or(product_attributes_filter.active_ladder_flg) AS active_ladder_flg,
                    max(product_attributes_filter.ordering::text) AS ordering,
                    max(product_attributes_filter.replenishment_status::text) AS replenishment_status,
                    min(product_attributes_filter.clr_start_date) AS clr_start_date
                   FROM product_attributes_filter
                  GROUP BY product_attributes_filter.l0_name,product_attributes_filter.l1_name, product_attributes_filter.l2_name, product_attributes_filter.l3_name, product_attributes_filter.l4_name, product_attributes_filter.l5_name, product_attributes_filter.style) 
               sp) paf ON paf.country::text = phf.country and paf.l1_name::text = phf.channel AND paf.style::text = phf.style AND paf.l2_name::text = phf.l2_name AND paf.l3_name::text = phf.l3_name AND paf.l4_name::text = phf.l4_name AND paf.l5_name::text = phf.l5_name
  WHERE phf.level = 7
			WITH DATA;

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