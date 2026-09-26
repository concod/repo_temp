--liquibase formatted sql
--changeset sivaprasath.vadivel:fc_fy_fw_level_v2 stripComments:false runOnChange:true splitStatements:false context:Release_1_1 labels:New_Approach_of_MV
--comment: initial changeset for fc_fy_fw_level_v2
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
                      and source_table.relname = 'fc_fy_fw_level_v2' 
                      and source_ns.nspname = 'monday_smart'
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
                    and source_table.relname = 'fc_fy_fw_level_v2' 
                    and source_ns.nspname = 'monday_smart'
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
        drop materialized view if exists monday_smart.fc_fy_fw_level_v2 cascade;
    
        -- Put Def here --
          CREATE MATERIALIZED VIEW monday_smart.fc_fy_fw_level_v2
            AS SELECT fdm.calendar_date AS date,
                fdm.fiscal_year AS fy,
                fdm.geo,
                fdm1.calendar_date AS fy_start_date,
                fdm2.calendar_date AS fy_end_date,
                fdm.fiscal_month_in_year AS fm,
                fdm.fiscal_year_month AS fm_id,
                fdm3.calendar_date AS fm_start_date,
                fdm4.calendar_date AS fm_end_date,
                fdm.fiscal_month_name AS fm_name,
                fdm.fiscal_week_in_month AS fw_m,
                fdm.fiscal_week_in_year AS fw,
                fdm.fiscal_year_week AS fw_id,
                fdm5.calendar_date AS fw_start_date,
                fdm6.calendar_date AS fw_end_date,
                fdm.fiscal_year_quarter AS fq_id,
                fdm.fiscal_quarter_in_year AS fq,
                fdm7.calendar_date AS fq_start_date,
                fdm8.calendar_date AS fq_end_date,
                fdm.fiscal_day_in_week AS fd_wk,
                fdm.fiscal_day_in_month AS fd_m,
                fdm.fiscal_day_name AS fd_name,
                fdm.fiscal_year_week_prior AS prev_fw,
                fdm.fiscal_year_season AS fs_id,
                fdm.fiscal_season_in_year AS fs,
                fdm9.calendar_date AS fs_start_date,
                fdm10.calendar_date AS fs_end_date,
                fdm.fiscal_season_name AS fs_name
            FROM monday_smart.fiscal_date_mapping fdm
                LEFT JOIN monday_smart.fiscal_date_mapping fdm1 ON fdm1.date = fdm.fiscal_year_begin_date::text::date AND fdm1.geo = fdm.geo
                LEFT JOIN monday_smart.fiscal_date_mapping fdm2 ON fdm2.date = fdm.fiscal_year_end_date::text::date AND fdm2.geo = fdm.geo
                LEFT JOIN monday_smart.fiscal_date_mapping fdm3 ON fdm3.date = fdm.fiscal_month_begin_date::text::date AND fdm3.geo = fdm.geo
                LEFT JOIN monday_smart.fiscal_date_mapping fdm4 ON fdm4.date = fdm.fiscal_month_end_date::text::date AND fdm4.geo = fdm.geo
                LEFT JOIN monday_smart.fiscal_date_mapping fdm5 ON fdm5.date = fdm.fiscal_week_begin_date::text::date AND fdm5.geo = fdm.geo
                LEFT JOIN monday_smart.fiscal_date_mapping fdm6 ON fdm6.date = fdm.fiscal_week_end_date::text::date AND fdm6.geo = fdm.geo
                LEFT JOIN monday_smart.fiscal_date_mapping fdm7 ON fdm7.date = fdm.fiscal_quarter_begin_date::text::date AND fdm7.geo = fdm.geo
                LEFT JOIN monday_smart.fiscal_date_mapping fdm8 ON fdm8.date = fdm.fiscal_quarter_end_date::text::date AND fdm8.geo = fdm.geo
                LEFT JOIN monday_smart.fiscal_date_mapping fdm9 ON fdm9.date = fdm.fiscal_season_begin_date::text::date AND fdm9.geo = fdm.geo
                LEFT JOIN monday_smart.fiscal_date_mapping fdm10 ON fdm10.date = fdm.fiscal_season_end_date::text::date AND fdm10.geo = fdm.geo
            ORDER BY fdm.calendar_date
            WITH DATA;

        CREATE UNIQUE INDEX fc_fy_fw_level_v2_idx ON monday_smart.fc_fy_fw_level_v2 USING btree (date, geo);

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