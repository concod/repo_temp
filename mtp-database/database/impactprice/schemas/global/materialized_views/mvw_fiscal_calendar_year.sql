--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:mvw_fiscal_calendar_year_5 stripComments:false runOnChange:true splitStatements:false context:Release_1_1 labels:New_Approach_of_MV
--comment: initial changeset for mvw_fiscal_calendar_year_5
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
                      and source_table.relname = 'mvw_fiscal_calendar_year'
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
                    and source_table.relname = 'mvw_fiscal_calendar_year'
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
        drop materialized view if exists "global".mvw_fiscal_calendar_year cascade;

        -- Put Def here --
      CREATE MATERIALIZED VIEW "global".mvw_fiscal_calendar_year
AS SELECT (row_to_json(u.*) #> '{years}'::text[]) -> 0 AS fiscal_data,
    ((((row_to_json(u.*) #> '{years}'::text[]) -> 0) #> '{fiscal_year}'::text[])::text)::integer AS year
   FROM ( SELECT ( SELECT array_to_json(array_agg(dd.*)) AS array_to_json
                   FROM ( SELECT y.fiscal_year,
                            y.max_date,
                            y.min_date,
                            ( SELECT array_to_json(array_agg(b.*)) AS array_to_json
                                   FROM ( SELECT q.fiscal_quarter,
    max(q.date) AS max_date,
    min(q.date) AS min_date,
    ( SELECT array_to_json(array_agg(x.*)) AS array_to_json
     FROM ( SELECT mm.fiscal_month,
        max(mm.date) AS max_date,
        min(mm.date) AS min_date,
        ( SELECT array_to_json(array_agg(x_1.*)) AS array_to_json
         FROM ( SELECT ww.fiscal_week,
            max(ww.date) AS max_date,
            min(ww.date) AS min_date
           FROM global.tb_fiscal_date_mapping_version ww
          WHERE ww.fiscal_year = y.fiscal_year AND ww.fiscal_quarter = q.fiscal_quarter AND ww.fiscal_month = mm.fiscal_month
          and ww.version_code = global.get_table_version('global.tb_fiscal_date_mapping_version'::text)
          GROUP BY ww.fiscal_year, ww.fiscal_quarter, ww.fiscal_month, ww.fiscal_week
          ORDER BY ww.fiscal_year, ww.fiscal_quarter, ww.fiscal_month, ww.fiscal_week) x_1) AS weeks
       FROM global.tb_fiscal_date_mapping_version mm
      WHERE mm.fiscal_year = y.fiscal_year AND mm.fiscal_quarter = q.fiscal_quarter
      and mm.version_code = global.get_table_version('global.tb_fiscal_date_mapping_version'::text)
      GROUP BY mm.fiscal_year, mm.fiscal_quarter, mm.fiscal_month
      ORDER BY mm.fiscal_year, mm.fiscal_quarter, mm.fiscal_month) x) AS months
   FROM global.tb_fiscal_date_mapping_version q
  WHERE q.fiscal_year = y.fiscal_year
  and q.version_code = global.get_table_version('global.tb_fiscal_date_mapping_version'::text)
  GROUP BY q.fiscal_year, q.fiscal_quarter
  ORDER BY q.fiscal_year, q.fiscal_quarter) b) AS quarters) dd) AS years
           FROM ( SELECT s.fiscal_year,
                    max(s.date) AS max_date,
                    min(s.date) AS min_date
                   FROM global.tb_fiscal_date_mapping_version s
                  where s.version_code = global.get_table_version('global.tb_fiscal_date_mapping_version'::text)
                  GROUP BY s.fiscal_year) y
          GROUP BY y.fiscal_year, y.max_date, y.min_date
          ORDER BY y.fiscal_year, y.max_date, y.min_date) u
WITH DATA;
    create unique index mvw_fiscal_calendar_year_fiscal_year_idx on global.mvw_fiscal_calendar_year using btree (year);
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

