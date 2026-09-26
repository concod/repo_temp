
--liquibase formatted sql
--changeset shrey.jaiswal@impactanalytics.co:mv_product_hierarchies_filter stripComments:false runOnChange:true splitStatements:false context:Release_1_1 labels:New_Approach_of_MV
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
              pm_update.schemaname schemaname,
              pm_update.matviewname viewname,
              pm_update.matviewowner viewowner,
              pm_update.definition definition
            from
              pg_catalog.pg_matviews pm_update
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
			-- item_smart.mv_product_hierarchies_filter source

CREATE MATERIALIZED VIEW item_smart.mv_product_hierarchies_filter
   
AS SELECT phf.hierarchy_code,
    phf.l0_name,
    phf.l1_name,
    phf.l2_name,
    phf.l3_name,
    phf.l4_name,
    phf.l5_name,
    phf.article AS product_code,
    paf.style_name as product_description,
    phf.article,
    '-'::text AS product_name,
    phf.level,
    0 AS product_id,
    'Regular'::text AS product_type,
    paf.receipt_date,
    paf.article_season_name,
    paf.article_season_year,
    paf.brand_id,
    paf.buyer_name,
    paf.category_id,
    paf.category_name,
    paf.color,
    paf.colour_char_name,
    paf.colour_internal_char,
    paf.generic_article_id,
    paf.generic_article_name,
    paf.info_capacity,
    paf.order_unit,
    paf.unit_of_issue,
    paf.info_capsule,
    paf.info_capsule_description,
    paf.info_design,
    paf.info_design_description,
    paf.info_lifecycle,
    paf.info_lifecycle_description,
    paf.info_material_description,
    paf.info_pattern_description,
    paf.info_range_description,
    paf.info_watts_description,
    paf.merchandise_category_id,
    paf.merchandise_category_name,
    paf.purchasing_group_id,
    paf.sub_category_id,
    paf.sub_category_name,
    paf.vendor_id,
    paf.vendor_name,
    paf.style_name,
    paf.order_counter,
    paf.replen_counter,
    paf.parent_id,
    paf.product_bucket_code,
    paf.sales_org_name,
    --paf.l5_display_name,
    paf.product_life_cycle,
    paf.price,
    paf.cost,
    paf.original_price,
	  paf.plan_item_active_flag,
	  paf.active,
    false AS clearance,
    paf.launch_date AS launch_date,
    NULL::date AS clearance_date,
    ( SELECT max(fiscal_date_mapping.date) AS max
           FROM global.fiscal_date_mapping) AS exit_date
   FROM ( SELECT DISTINCT article.article,
            article.hierarchy_code,
            prod.l0_name,
            prod.l1_name,
            prod.l2_name,
            prod.l3_name,
            prod.l4_name,
            prod.l5_name,
            --prod.product_description,
            article.level
           FROM ( SELECT phf_1.hierarchy_code,
                    phf_1.article,
                    phf_1.l0_name,
                    phf_1.l1_name,
                    phf_1.l2_name,
                    phf_1.l3_name,
                    phf_1.l4_name,
                    phf_1.l5_name,
                    phf_1.product_code,
                    phf_1.level,
                    pm_update.product_code,
                    pm_update.product_name,
                    --pm_update.product_description,
                    pm_update.price,
                    pm_update.cost,
                    pm_update.original_price,
                    pm_update.active,
                    pm_update.clearance,
                    pm_update.receipt_date,
                    pm_update.created_at,
                    pm_update.updated_at,
                    pm_update.created_by,
                    pm_update.updated_by,
                    pm_update.replacement_product_codes,
                    pm_update.reference_product_codes,
                    pm_update.is_deleted
                   FROM ( SELECT product_hierarchies_filter.hierarchy_code,
                            product_hierarchies_filter.path ->> 'article'::text AS article,
                            product_hierarchies_filter.path ->> 'l0_name'::text AS l0_name,
                            product_hierarchies_filter.path ->> 'l1_name'::text AS l1_name,
                            product_hierarchies_filter.path ->> 'l2_name'::text AS l2_name,
                            product_hierarchies_filter.path ->> 'l3_name'::text AS l3_name,
                            product_hierarchies_filter.path ->> 'l4_name'::text AS l4_name,
                            product_hierarchies_filter.path ->> 'l5_name'::text AS l5_name,
                            product_hierarchies_filter.path ->> 'product_code'::text AS product_code,
                            product_hierarchies_filter.level
                           FROM global.product_hierarchies_filter
                          WHERE product_hierarchies_filter.level = 9 AND product_hierarchies_filter.active = true) phf_1
                     JOIN ( SELECT paf_2.product_code,
                            paf_2.product_name,
                            --product_master.product_description,
                            paf_2.price,
                            paf_2.cost,
                            paf_2.original_price,
                            paf_2.active,
                            paf_2.clearance,
                            paf_2.receipt_date,
                            paf_2.created_at,
                            paf_2.updated_at,
                            paf_2.created_by,
                            paf_2.updated_by,
                            paf_2.replacement_product_codes,
                            paf_2.reference_product_codes,
                            paf_2.is_deleted
                           FROM global.product_attributes_filter paf_2
                          WHERE paf_2.plan_item_active_flag = true) pm_update ON phf_1.product_code = pm_update.product_code::text) prod(hierarchy_code, article, l0_name, l1_name, l2_name, l3_name, l4_name, l5_name, product_code, level, product_code_1, product_name, price, cost, original_price, active, clearance, receipt_date, created_at, updated_at, created_by, updated_by, replacement_product_codes, reference_product_codes, is_deleted)
             JOIN ( SELECT a.hierarchy_code,
                    a.path ->> 'article'::text AS article,
                    a.level
                   FROM global.product_hierarchies_filter a
                  WHERE a.level = 8 AND a.active = true) article ON prod.article = article.article) phf
     JOIN ( SELECT DISTINCT paf_1.article,
            0 AS product_id,
            0 AS product_type,
            max(paf_1.receipt_date) AS receipt_date,
            max(paf_1.article_season_name::text) AS article_season_name,
            max(paf_1.brand_id::text) AS brand_id,
            max(paf_1.category_id::text) AS category_id,
            max(paf_1.category_name::text) AS category_name,
            max(paf_1.color::text) AS color,
            max('BLANK'::text) AS info_capsule,
            max('BLANK'::text) AS info_capsule_description,
            max('BLANK'::text) AS info_design,
            max('BLANK'::text) AS info_design_description,
            max('BLANK'::text) AS info_lifecycle,
            max(paf_1.info_lifecycle_description::text) AS info_lifecycle_description,
            max(paf_1.info_material_description::text) AS info_material_description,
            max(paf_1.info_pattern_description::text)AS info_pattern_description,
            max('BLANK'::text) AS info_watts_description,
            max(paf_1.merchandise_category_id::text) AS merchandise_category_id,
            max(paf_1.merchandise_category_name::text) AS merchandise_category_name,
            max(paf_1.sub_category_id::text) AS sub_category_id,
            max(paf_1.sub_category_name::text) AS sub_category_name,
            max(paf_1.vendor_id::text) AS vendor_id,
            max(paf_1.vendor_name::text) AS vendor_name,
            max(paf_1.style_name::text) AS style_name,
            max(paf_1.parent_id::text) AS parent_id,
            max(paf_1.product_bucket_code) AS product_bucket_code,
            max(paf_1.sales_org_name::text) AS sales_org_name,
           -- max(paf_1.l5_display_name::text) AS l5_display_name,
            max(paf_1.l0_name::text) AS l0_name,
            max(paf_1.l1_name::text) AS l1_name,
            max(paf_1.l2_name::text) AS l2_name,
            max(paf_1.l3_name::text) AS l3_name,
            max(paf_1.l4_name::text) AS l4_name,
            max(paf_1.l5_name::text) AS l5_name,
            max(paf_1.purchasing_group_id::text) AS purchasing_group_id,
            max(paf_1.buyer_name::text) AS buyer_name,
            max(paf_1.article_season_year::text) AS article_season_year,
            max(paf_1.colour_char_name::text) AS colour_char_name,
            max(paf_1.colour_internal_char::text) AS colour_internal_char,
            max(paf_1.replen_counter) AS replen_counter,
            max(paf_1.order_unit::text) AS order_unit,
            max(paf_1.unit_of_issue::text) AS unit_of_issue,
            max(paf_1.generic_article_id::text) AS generic_article_id,
            max(paf_1.info_range_description::text) AS info_range_description,
            max(paf_1.generic_article_name::text) AS generic_article_name,
            max('BLANK'::text) AS info_capacity,
            max(paf_1.order_counter) AS order_counter,
            max(paf_1.product_life_cycle::text) AS product_life_cycle,
            avg(paf_1.price) AS price,
            avg(paf_1.cost) AS cost,
            avg(paf_1.original_price) AS original_price,
			      bool_or(paf_1.plan_item_active_flag) AS plan_item_active_flag,
    		    bool_or(paf_1.active) AS active,
            max(paf_1.launch_date) AS launch_date
           FROM global.product_attributes_filter paf_1
          GROUP BY paf_1.article, 0::integer) paf ON paf.article::text = phf.article
WITH DATA;

-- View indexes:
CREATE INDEX idx_hcode_mv_phf ON item_smart.mv_product_hierarchies_filter USING btree (hierarchy_code);

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