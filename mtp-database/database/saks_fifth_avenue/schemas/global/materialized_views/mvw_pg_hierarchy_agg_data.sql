--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:mvw_pg_hierarchy_agg_data_2 stripComments:false runOnChange:true splitStatements:false context:Release_1_1 labels:New_Approach_of_MV
--comment: refresh values only for active products
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
                      and source_ns.nspname = 'global'
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
                    and source_ns.nspname = 'global'
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
        drop materialized view if exists "global".mvw_pg_hierarchy_agg_data cascade;

        -- Put Def here --
        CREATE MATERIALIZED VIEW "global".mvw_pg_hierarchy_agg_data
           
        AS
        SELECT dd.pg_id,
            dd.l0_ids,
            dd.l1_ids,
            dd.l2_ids,
            dd.l3_ids,
            dd.l4_ids,
            dd.brand_ids,
            dd.lifecycle_indicator_ids
        FROM (
            WITH active_product_hierarchies as (
                select
                    A.*, B.lifecycle_indicator_id
                from
                    price_promo.product_master A,
                    global.tb_parent_lifecycle_mapping B
                where
                    A.product_id = B.product_id and A.is_active = 1
            ),
            active_hierarchy_level_data as (
                select 0 as level, l0_cid as level_value from active_product_hierarchies group by 2
                union all
                select 1 as level, l1_cid as level_value from active_product_hierarchies group by 2
                union all
                select 2 as level, l2_cid as level_value from active_product_hierarchies group by 2
                union all
                select 3 as level, l3_cid as level_value from active_product_hierarchies group by 2
                union all
                select 4 as level, l4_cid as level_value from active_product_hierarchies group by 2
                union all
                select -1 as level, brand_cid as level_value from active_product_hierarchies group by 2
                union all
                select -2 as level, lifecycle_indicator_id as level_value from active_product_hierarchies group by 2
            ),
            hierarchy_data AS (
                 SELECT tph.pg_id,
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
                            WHEN tph.hierarchy_level = 4 THEN tph.hierarchy_value
                            ELSE NULL::integer
                        END AS l4_ids,
                        CASE
                            WHEN tph.hierarchy_level = '-1'::integer THEN tph.hierarchy_value
                            ELSE NULL::integer
                        END AS brand_ids,
                        CASE
                            WHEN tph.hierarchy_level = '-2'::integer THEN tph.hierarchy_value
                            ELSE NULL::integer
                        END AS lifecycle_indicator_ids
                   FROM global.tb_pg_hierarchy tph, active_hierarchy_level_data B
                   where tph.hierarchy_level = B.level and tph.hierarchy_value = B.level_value
            --       GROUP BY tph.pg_id, tph.hierarchy_level, tph.hierarchy_value
            ),
            hierarchy_agg_data AS (
                SELECT hierarchy_data.pg_id,
                    array_agg(DISTINCT hierarchy_data.l0_ids) FILTER (WHERE hierarchy_data.l0_ids IS NOT NULL) AS l0_ids,
                    array_agg(DISTINCT hierarchy_data.l1_ids) FILTER (WHERE hierarchy_data.l1_ids IS NOT NULL) AS l1_ids,
                    array_agg(DISTINCT hierarchy_data.l2_ids) FILTER (WHERE hierarchy_data.l2_ids IS NOT NULL) AS l2_ids,
                    array_agg(DISTINCT hierarchy_data.l3_ids) FILTER (WHERE hierarchy_data.l3_ids IS NOT NULL) AS l3_ids,
                    array_agg(DISTINCT hierarchy_data.l4_ids) FILTER (WHERE hierarchy_data.l4_ids IS NOT NULL) AS l4_ids,
                    array_agg(DISTINCT hierarchy_data.brand_ids) FILTER (WHERE hierarchy_data.brand_ids IS NOT NULL) AS brand_ids,
                    array_agg(DISTINCT hierarchy_data.lifecycle_indicator_ids) FILTER (WHERE hierarchy_data.lifecycle_indicator_ids IS NOT NULL) AS lifecycle_indicator_ids
                FROM hierarchy_data
                GROUP BY hierarchy_data.pg_id
            )
            SELECT hierarchy_agg_data.pg_id,
                hierarchy_agg_data.l0_ids,
                hierarchy_agg_data.l1_ids,
                hierarchy_agg_data.l2_ids,
                hierarchy_agg_data.l3_ids,
                hierarchy_agg_data.l4_ids,
                hierarchy_agg_data.brand_ids,
                hierarchy_agg_data.lifecycle_indicator_ids
               FROM hierarchy_agg_data
            ) dd
        WITH DATA;

        -- View indexes:
        CREATE INDEX mvw_pg_hierarchy_agg_data_pg_id_idx ON global.mvw_pg_hierarchy_agg_data USING btree (pg_id);
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

