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
            dd.manufacturer_ids,
            dd.product_status_ids,
            dd.map_flag_ids,
            dd.clearance_ids,
            dd.kvc_store_res_ids,
            dd.kvi_store_res_ids,
            dd.kvc_les_res_ids,
            dd.kvi_les_res_ids,
            dd.kvc_its_res_ids,
            dd.kvi_its_res_ids,
            dd.kvc_com_com_ids,
            dd.kvi_com_com_ids
        FROM (
            with active_hierarchy_level_data as (
                select hierarchy_level as level, hierarchy_value as level_value from global.tb_hierarchy_cid_mapping
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
                            WHEN tph.hierarchy_level = 5 THEN tph.hierarchy_value
                            ELSE NULL::integer
                        END AS l4_ids,
                        case 
                            when tph.hierarchy_level = -3 then tph.hierarchy_value
                            else null
                        end as manufacturer_ids,
                        case 
                            when tph.hierarchy_level = -4 then tph.hierarchy_value
                            else null
                        end as product_status_ids,
                        case 
                            when tph.hierarchy_level = -5 then tph.hierarchy_value
                            else null
                        end as map_flag_ids,
                        case
                            when tph.hierarchy_level = -6 then tph.hierarchy_value
                            else null
                        end as clearance_ids,
                        case
                            when tph.hierarchy_level = -7 then tph.hierarchy_value
                            else null
                        end as kvc_store_res_ids,
                        case 
                            when tph.hierarchy_level = -8 then tph.hierarchy_value
                            else null
                        end as kvi_store_res_ids,
                        case
                            when tph.hierarchy_level = -9 then tph.hierarchy_value
                            else null
                        end as kvc_les_res_ids,
                        case
                            when tph.hierarchy_level = -10 then tph.hierarchy_value
                            else null
                        end as kvi_les_res_ids,
                        case
                            when tph.hierarchy_level = -11 then tph.hierarchy_value
                            else null
                        end as kvc_its_res_ids,
                        case
                            when tph.hierarchy_level = -12 then tph.hierarchy_value
                            else null
                        end as kvi_its_res_ids,
                        case
                            when tph.hierarchy_level = -13 then tph.hierarchy_value
                            else null
                        end as kvc_com_com_ids,
                        case
                            when tph.hierarchy_level = -14 then tph.hierarchy_value
                            else null
                        end as kvi_com_com_ids
                   FROM global.tb_pg_hierarchy tph, active_hierarchy_level_data B
                   where tph.hierarchy_level = B.level and tph.hierarchy_value = B.level_value
            ),
            hierarchy_agg_data AS (
                SELECT hierarchy_data.pg_id,
                    array_agg(DISTINCT hierarchy_data.l0_ids) FILTER (WHERE hierarchy_data.l0_ids IS NOT NULL) AS l0_ids,
                    array_agg(DISTINCT hierarchy_data.l1_ids) FILTER (WHERE hierarchy_data.l1_ids IS NOT NULL) AS l1_ids,
                    array_agg(DISTINCT hierarchy_data.l2_ids) FILTER (WHERE hierarchy_data.l2_ids IS NOT NULL) AS l2_ids,
                    array_agg(DISTINCT hierarchy_data.l3_ids) FILTER (WHERE hierarchy_data.l3_ids IS NOT NULL) AS l3_ids,
                    array_agg(DISTINCT hierarchy_data.l4_ids) FILTER (WHERE hierarchy_data.l4_ids IS NOT NULL) AS l4_ids,
                    array_agg(DISTINCT hierarchy_data.manufacturer_ids) FILTER (WHERE hierarchy_data.manufacturer_ids IS NOT NULL) AS manufacturer_ids,
                    array_agg(DISTINCT hierarchy_data.product_status_ids) FILTER (WHERE hierarchy_data.product_status_ids IS NOT NULL) AS product_status_ids,
                    array_agg(DISTINCT hierarchy_data.map_flag_ids) FILTER (WHERE hierarchy_data.map_flag_ids IS NOT NULL) AS map_flag_ids,
                    array_agg(DISTINCT hierarchy_data.clearance_ids) FILTER (WHERE hierarchy_data.clearance_ids IS NOT NULL) AS clearance_ids,
                    array_agg(DISTINCT hierarchy_data.kvc_store_res_ids) FILTER (WHERE hierarchy_data.kvc_store_res_ids IS NOT NULL) AS kvc_store_res_ids,
                    array_agg(DISTINCT hierarchy_data.kvi_store_res_ids) FILTER (WHERE hierarchy_data.kvi_store_res_ids IS NOT NULL) AS kvi_store_res_ids,
                    array_agg(DISTINCT hierarchy_data.kvc_les_res_ids) FILTER (WHERE hierarchy_data.kvc_les_res_ids IS NOT NULL) AS kvc_les_res_ids,
                    array_agg(DISTINCT hierarchy_data.kvi_les_res_ids) FILTER (WHERE hierarchy_data.kvi_les_res_ids IS NOT NULL) AS kvi_les_res_ids,
                    array_agg(DISTINCT hierarchy_data.kvc_its_res_ids) FILTER (WHERE hierarchy_data.kvc_its_res_ids IS NOT NULL) AS kvc_its_res_ids,
                    array_agg(DISTINCT hierarchy_data.kvi_its_res_ids) FILTER (WHERE hierarchy_data.kvi_its_res_ids IS NOT NULL) AS kvi_its_res_ids,
                    array_agg(DISTINCT hierarchy_data.kvc_com_com_ids) FILTER (WHERE hierarchy_data.kvc_com_com_ids IS NOT NULL) AS kvc_com_com_ids,
                    array_agg(DISTINCT hierarchy_data.kvi_com_com_ids) FILTER (WHERE hierarchy_data.kvi_com_com_ids IS NOT NULL) AS kvi_com_com_ids
                FROM hierarchy_data
                GROUP BY hierarchy_data.pg_id
            )
            SELECT hierarchy_agg_data.pg_id,
                hierarchy_agg_data.l0_ids,
                hierarchy_agg_data.l1_ids,
                hierarchy_agg_data.l2_ids,
                hierarchy_agg_data.l3_ids,
                hierarchy_agg_data.l4_ids,
                hierarchy_agg_data.manufacturer_ids,
                hierarchy_agg_data.product_status_ids,
                hierarchy_agg_data.map_flag_ids,
                hierarchy_agg_data.clearance_ids,
                hierarchy_agg_data.kvc_store_res_ids,
                hierarchy_agg_data.kvi_store_res_ids,
                hierarchy_agg_data.kvc_les_res_ids,
                hierarchy_agg_data.kvi_les_res_ids,
                hierarchy_agg_data.kvc_its_res_ids,
                hierarchy_agg_data.kvi_its_res_ids,
                hierarchy_agg_data.kvc_com_com_ids,
                hierarchy_agg_data.kvi_com_com_ids
               FROM hierarchy_agg_data
            ) dd
        WITH DATA;

        -- View indexes:
        CREATE UNIQUE INDEX mvw_pg_hierarchy_agg_data_pg_id_idx ON global.mvw_pg_hierarchy_agg_data USING btree (pg_id);
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

