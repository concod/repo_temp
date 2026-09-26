--liquibase formatted sql
--changeset himansh.bhardwaj:cascade_dropping_tables runOnChange:true stripComments:false splitStatements:false context:zdt-views labels:DAT-1517
--comment: cascade_dropping_tables
--rollback: SELECT 1
do
$$
DECLARE 
  _is_view int;
  _is_table int;
  _index_build text;
  _index_builds text[];
  _build_view text;
  _build_views text[];
BEGIN

  SELECT
  COUNT(*) AS cnt INTO _is_table
  FROM information_schema."tables" c  
  WHERE table_name = 'latest_inventory' AND table_schema = 'inventory_smart' 
  and table_type = 'BASE TABLE';

  SELECT
  COUNT(*) AS cnt INTO _is_view
  FROM information_schema."tables" c  
  WHERE table_name = 'latest_inventory' AND table_schema = 'inventory_smart' 
  AND table_type = 'VIEW';

  IF _is_table = 1 THEN 
  
    DROP TABLE IF EXISTS inventory_smart.latest_inventory CASCADE;
    --raise notice 'dropping table....';
    
  END IF;
  
  IF _is_view = 1 THEN 

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
                      and source_table.relname = 'latest_inventory'
                      and source_ns.nspname = 'inventory_smart' 
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
                    and source_table.relname = 'latest_inventory' 
                    and source_ns.nspname = 'inventory_smart'
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
  
    DROP VIEW IF EXISTS inventory_smart.latest_inventory CASCADE ;
    --raise notice 'dropping view....';
    
  END IF;
  
  CREATE OR REPLACE VIEW inventory_smart.latest_inventory
  AS SELECT 
      latest_inventory_version.version_code,
      latest_inventory_version.date,
      latest_inventory_version.channel,
      latest_inventory_version.product_code,
      latest_inventory_version.store_code,
      latest_inventory_version.oh,
      latest_inventory_version.it,
      latest_inventory_version.oo,
      latest_inventory_version.l0_name,
      latest_inventory_version.l1_name
  FROM inventory_smart.latest_inventory_version
  WHERE latest_inventory_version.version_code = global.get_table_version('inventory_smart.latest_inventory_version'::text);

  -- dependency objects rebuild
  IF CARDINALITY(_build_views) > 0 THEN
    FOREACH _build_view IN ARRAY _build_views 
    LOOP
      EXECUTE _build_view;
      raise notice'_build_view :%',_build_view ;
    END LOOP; 
  END IF;

  -- dependency objects index rebuild
  IF cardinality(_index_builds) > 0 THEN
    FOREACH _index_build IN array _index_builds 
    LOOP
      EXECUTE _index_build;
      raise notice'_index_build :%',_index_build ;
    END LOOP;
  END IF;
  
END;
$$;
