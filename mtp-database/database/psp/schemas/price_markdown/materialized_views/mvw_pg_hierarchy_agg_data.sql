--liquibase formatted sql
--changeset durgaprasad.tulugu@impactanalytics.co:mvw_pg_hierarchy_agg_data_new1 stripComments:false runOnChange:true splitStatements:false context:Release_1_1 labels:New_Approach_of_MV
--comment: mvw_pg_hierarchy_agg_data_1


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
                      and source_table.relname = 'mvw_pg_hierarchy_agg_data'
                      and source_ns.nspname = 'price_markdown'
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
                    and source_table.relname = 'mvw_pg_hierarchy_agg_data'
                    and source_ns.nspname = 'price_markdown'
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
        drop materialized view if exists price_markdown.mvw_pg_hierarchy_agg_data cascade;

        -- Put Def here --
        CREATE MATERIALIZED VIEW price_markdown.mvw_pg_hierarchy_agg_data
        AS SELECT dd.pg_id,
            dd.l0_ids,
            dd.l1_ids,
            dd.l2_ids,
            dd.l3_ids,
            dd.manufacturer_ids,
            dd.merchandiser_ids,
            dd.brand_ids,
            dd.vendor_ids,
            dd.price_bucket_ids,
            dd.size_bucket_ids,
            dd.uom_ids
        FROM ( 
            WITH 
            active_product_hierarchies AS (
                SELECT 
                    a.l0_cid,
                    a.l1_cid,
                    a.l2_cid,
                    a.l3_cid,
                    a.manufacturer_cid,
                    a.merchandiser_cid,
                    a.brand_cid,
                    a.vendor_cid,
                    a.price_bucket_cid,
                    a.size_bucket_cid,
                    a.uom_cid
                FROM price_promo.product_master_promo_version a
                WHERE a.is_active = 1 and a.version_code = global.get_table_version('price_promo.product_master_promo_version'::text)
            ), 
            active_hierarchy_level_data AS (
                SELECT 
                    0 AS level,
                    active_product_hierarchies.l0_cid AS level_value
                FROM active_product_hierarchies
                GROUP BY active_product_hierarchies.l0_cid
                UNION ALL
                SELECT 
                    1 AS level,
                    active_product_hierarchies.l1_cid AS level_value
                FROM active_product_hierarchies
                GROUP BY active_product_hierarchies.l1_cid
                UNION ALL
                SELECT 
                    2 AS level,
                    active_product_hierarchies.l2_cid AS level_value
                FROM active_product_hierarchies
                GROUP BY active_product_hierarchies.l2_cid
                UNION ALL
                SELECT 
                    3 AS level,
                    active_product_hierarchies.l3_cid AS level_value
                FROM active_product_hierarchies
                GROUP BY active_product_hierarchies.l3_cid
                UNION ALL
                SELECT 
                    -1 AS level,
                    active_product_hierarchies.manufacturer_cid AS level_value
                FROM active_product_hierarchies
                WHERE active_product_hierarchies.manufacturer_cid IS NOT NULL
                GROUP BY active_product_hierarchies.manufacturer_cid
                UNION ALL
                SELECT -2 AS level,
                    active_product_hierarchies.merchandiser_cid AS level_value
                FROM active_product_hierarchies
                WHERE active_product_hierarchies.merchandiser_cid IS NOT NULL
                GROUP BY active_product_hierarchies.merchandiser_cid
                UNION ALL
                SELECT 
                    -3 AS level,
                    active_product_hierarchies.brand_cid AS level_value
                FROM active_product_hierarchies
                WHERE active_product_hierarchies.brand_cid IS NOT NULL
                GROUP BY active_product_hierarchies.brand_cid
                UNION ALL
                SELECT 
                    -4 AS level,
                    active_product_hierarchies.vendor_cid AS level_value
                FROM active_product_hierarchies
                WHERE active_product_hierarchies.vendor_cid IS NOT NULL
                GROUP BY active_product_hierarchies.vendor_cid
                UNION ALL
                SELECT 
                    -5 AS level,
                    active_product_hierarchies.price_bucket_cid AS level_value
                FROM active_product_hierarchies
                WHERE active_product_hierarchies.price_bucket_cid IS NOT NULL
                GROUP BY active_product_hierarchies.price_bucket_cid
                UNION ALL
                SELECT  
                    -6 AS level,
                    active_product_hierarchies.size_bucket_cid AS level_value
                FROM active_product_hierarchies
                WHERE active_product_hierarchies.size_bucket_cid IS NOT NULL
                GROUP BY active_product_hierarchies.size_bucket_cid
                UNION ALL
                SELECT 
                    -7 AS level,
                    active_product_hierarchies.uom_cid AS level_value
                FROM active_product_hierarchies
                WHERE active_product_hierarchies.uom_cid IS NOT NULL
                GROUP BY active_product_hierarchies.uom_cid
            ),
            hierarchy_data AS (
                SELECT 
                    tph.pg_id,
                    CASE
                        WHEN tph.hierarchy_level = 0 THEN tph.hierarchy_value
                        ELSE NULL::integer
                    END AS l0_ids,
                    CASE
                        WHEN tph.hierarchy_level = 1 THEN tph.hierarchy_value
                        ELSE NULL::integer
                    END AS l1_ids,
                    CASE
                        WHEN tph.hierarchy_level = 2 THEN tph.hierarchy_value
                        ELSE NULL::integer
                    END AS l2_ids,
                    CASE
                        WHEN tph.hierarchy_level = 3 THEN tph.hierarchy_value
                        ELSE NULL::integer
                    END AS l3_ids,
                    CASE
                        WHEN tph.hierarchy_level = '-1'::integer THEN tph.hierarchy_value
                        ELSE NULL::integer
                    END AS manufacturer_ids,
                    CASE
                        WHEN tph.hierarchy_level = '-2'::integer THEN tph.hierarchy_value
                        ELSE NULL::integer
                    END AS merchandiser_ids,
                    CASE
                        WHEN tph.hierarchy_level = '-3'::integer THEN tph.hierarchy_value
                        ELSE NULL::integer
                    END AS brand_ids,
                    CASE
                        WHEN tph.hierarchy_level = '-4'::integer THEN tph.hierarchy_value
                        ELSE NULL::integer
                    END AS vendor_ids,
                    CASE
                        WHEN tph.hierarchy_level = '-5'::integer THEN tph.hierarchy_value
                        ELSE NULL::integer
                    END AS price_bucket_ids,
                    CASE
                        WHEN tph.hierarchy_level = '-6'::integer THEN tph.hierarchy_value
                        ELSE NULL::integer
                    END AS size_bucket_ids,
                    CASE
                        WHEN tph.hierarchy_level = '-7'::integer THEN tph.hierarchy_value
                        ELSE NULL::integer
                    END AS uom_ids
                FROM global.tb_pg_hierarchy tph,
                    active_hierarchy_level_data b
                WHERE 
                    tph.hierarchy_level = b.level 
                    AND tph.hierarchy_value = b.level_value
            ), 
            hierarchy_agg_data AS (
                SELECT 
                    hierarchy_data.pg_id,
                    array_agg(DISTINCT hierarchy_data.l0_ids) FILTER (WHERE hierarchy_data.l0_ids IS NOT NULL) AS l0_ids,
                    array_agg(DISTINCT hierarchy_data.l1_ids) FILTER (WHERE hierarchy_data.l1_ids IS NOT NULL) AS l1_ids,
                    array_agg(DISTINCT hierarchy_data.l2_ids) FILTER (WHERE hierarchy_data.l2_ids IS NOT NULL) AS l2_ids,
                    array_agg(DISTINCT hierarchy_data.l3_ids) FILTER (WHERE hierarchy_data.l3_ids IS NOT NULL) AS l3_ids,
                    array_agg(DISTINCT hierarchy_data.manufacturer_ids) FILTER (WHERE hierarchy_data.manufacturer_ids IS NOT NULL) AS manufacturer_ids,
                    array_agg(DISTINCT hierarchy_data.merchandiser_ids) FILTER (WHERE hierarchy_data.merchandiser_ids IS NOT NULL) AS merchandiser_ids,
                    array_agg(DISTINCT hierarchy_data.brand_ids) FILTER (WHERE hierarchy_data.brand_ids IS NOT NULL) AS brand_ids,
                    array_agg(DISTINCT hierarchy_data.vendor_ids) FILTER (WHERE hierarchy_data.vendor_ids IS NOT NULL) AS vendor_ids,
                    array_agg(DISTINCT hierarchy_data.price_bucket_ids) FILTER (WHERE hierarchy_data.price_bucket_ids IS NOT NULL) AS price_bucket_ids,
                    array_agg(DISTINCT hierarchy_data.size_bucket_ids) FILTER (WHERE hierarchy_data.size_bucket_ids IS NOT NULL) AS size_bucket_ids,
                    array_agg(DISTINCT hierarchy_data.uom_ids) FILTER (WHERE hierarchy_data.uom_ids IS NOT NULL) AS uom_ids
                FROM hierarchy_data
                GROUP BY hierarchy_data.pg_id
            )
            SELECT 
                hierarchy_agg_data.pg_id,
                hierarchy_agg_data.l0_ids,
                hierarchy_agg_data.l1_ids,
                hierarchy_agg_data.l2_ids,
                hierarchy_agg_data.l3_ids,
                hierarchy_agg_data.manufacturer_ids,
                hierarchy_agg_data.merchandiser_ids,
                hierarchy_agg_data.brand_ids,
                hierarchy_agg_data.vendor_ids,
                hierarchy_agg_data.price_bucket_ids,
                hierarchy_agg_data.size_bucket_ids,
                hierarchy_agg_data.uom_ids
            FROM hierarchy_agg_data
        ) dd
        WITH DATA;

        -- View indexes:
        CREATE INDEX mvw_pg_hierarchy_agg_data_pg_id_idx ON price_markdown.mvw_pg_hierarchy_agg_data USING btree (pg_id);
        -------------------------------

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