--liquibase formatted sql
--changeset biplab.malakar@impactanalytics.co:aggregation_level_filter_4 stripComments:false runOnChange:true splitStatements:false context:Release_1_4 labels:New_Approach_of_MV
--comment: initial changeset for aggregation_level_filter, add missing column
DO $$
BEGIN
    -- Check if the materialized view exists
    IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'aggregation_level_filter') THEN
        -- Drop the existing materialized view if it exists
        DROP MATERIALIZED VIEW "global".aggregation_level_filter;
    END IF;
END $$;

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
                      and source_table.relname = 'aggregation_level_filter'
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
                    and source_table.relname = 'aggregation_level_filter'
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
        drop materialized view if exists "global".aggregation_level_filter cascade;

        -- Put Def here --

create materialized view if not exists "global".aggregation_level_filter  
as
select
  grouped_data.article as aggregation_code,
  grouped_data.article,
  grouped_data.product_description,
  grouped_data.style_description,
  grouped_data.product_code as products,
  grouped_data.style,
  grouped_data.l0_name,
  grouped_data.l1_name,
  grouped_data.l2_name,
  grouped_data.l3_name,
  grouped_data.l4_name,
  grouped_data.l5_name,
  grouped_data.gender,
  grouped_data.subclass,
  grouped_data.product_life_cycle,
  grouped_data.class,
  grouped_data.item_group_desc,
  grouped_data.seltd_szs_dsc,
  grouped_data.season,
  grouped_data.sty_primary_occsn_end_use_dsc,
  grouped_data.planned_clearance_date,
  grouped_data.launch_date,
  grouped_data.collection,
  grouped_data.clearance_flag
from
  ( 
    select 
      pa.article as aggregation_code,
      pa.article,
      max(pa.product_description) as product_description,
      max(pa.style_description::text) as style_description,
      array_agg(pa.product_code) as product_code,
      max(pa.style::text) as style,
      max(pa.class::text) as class,
      pa.l0_name,
      pa.l1_name,
      pa.l2_name,
      pa.l3_name,
      max(pa.l4_name::text) as l4_name,
      max(pa.l5_name::text) as l5_name,
      max(pa.gender::text) as gender,
      max(pa.subclass::text) as subclass,
      max(pa.product_life_cycle::text) as product_life_cycle,
      max(pa.item_group_desc::text) as item_group_desc,
      max(pa.seltd_szs_dsc::text) as seltd_szs_dsc,
      max(pa.season::text) as season,
      max(pa.sty_primary_occsn_end_use_dsc::text) as sty_primary_occsn_end_use_dsc,
      max(pa.planned_clearance_date) as planned_clearance_date,
      max(pa.launch_date) as launch_date,
      max(pa.collection::text) as collection,
      max(pa.clearance_flag) as clearance_flag
    from
      global.product_attributes_filter pa
    where
      pa.is_deleted is false
    group by
      pa.article,
      pa.l0_name,
      pa.l1_name,
      pa.l2_name,
      pa.l3_name) grouped_data
with data;

        CREATE UNIQUE INDEX IF NOT EXISTS aggregation_level_filter_unique_idx
        ON global.aggregation_level_filter (
          aggregation_code,
          l1_name,
          l2_name,
          l3_name,
          l4_name
        );
        
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

