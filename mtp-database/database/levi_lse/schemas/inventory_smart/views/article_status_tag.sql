--liquibase formatted sql
--changeset himansh.bhardwaj:cascade_dropping_tables runOnChange:true stripComments:false splitStatements:false context:zdt-views labels:liquibase_project_start
--comment: cascade_dropping_tables
--rollback: SELECT 1

DO $$
DECLARE 
  _is_view int;
  _is_table int;
  _index_build text;
  _index_builds text[];
  _build_view text;
  _build_views text[];
BEGIN

  -- Check if the object currently exists as a Base Table
  SELECT COUNT(*) AS cnt INTO _is_table
  FROM information_schema."tables" c  
  WHERE table_name = 'article_status_tag' AND table_schema = 'inventory_smart' 
  AND table_type = 'BASE TABLE';

  -- Check if the object currently exists as a View
  SELECT COUNT(*) AS cnt INTO _is_view
  FROM information_schema."tables" c  
  WHERE table_name = 'article_status_tag' AND table_schema = 'inventory_smart' 
  AND table_type = 'VIEW';

  -- If it is a table, drop it to replace with a view
  IF _is_table = 1 THEN 
    DROP TABLE IF EXISTS inventory_smart.article_status_tag CASCADE;
  END IF;
  
  -- If it is already a view, capture dependencies before recreation
  IF _is_view = 1 THEN 

    -- 1. Capture Index Definitions of dependents
    SELECT array_agg(concat(pindx.indexdef, ';')) INTO _index_builds 
    FROM (
      (
        SELECT dependent_schema, dependent_table, dependent_objecttype, ROW_NUMBER() OVER() seq 
        FROM (
          WITH RECURSIVE view_deps AS (
            SELECT DISTINCT dependent_ns.nspname :: text AS dependent_schema, 
                   dependent_view.relname :: text AS dependent_view, 
                   CASE dependent_view.relkind WHEN 'r' THEN 'TABLE' WHEN 'm' THEN 'MATERIALIZED_VIEW' WHEN 'i' THEN 'INDEX' WHEN 'S' THEN 'SEQUENCE' WHEN 'v' THEN 'VIEW' WHEN 'c' THEN 'TYPE' ELSE dependent_view.relkind :: text END AS dependent_ObjectType, 
                   source_ns.nspname :: text AS source_schema, 
                   source_table.relname :: text AS source_table 
            FROM pg_depend 
            JOIN pg_rewrite ON pg_depend.objid = pg_rewrite.oid 
            JOIN pg_class AS dependent_view ON pg_rewrite.ev_class = dependent_view.oid 
            JOIN pg_class AS source_table ON pg_depend.refobjid = source_table.oid 
            JOIN pg_namespace dependent_ns ON dependent_ns.oid = dependent_view.relnamespace 
            JOIN pg_namespace source_ns ON source_ns.oid = source_table.relnamespace 
            WHERE NOT (dependent_ns.nspname = source_ns.nspname AND dependent_view.relname = source_table.relname) 
              AND source_table.relname = 'article_status_tag'
              AND source_ns.nspname = 'inventory_smart' 
            UNION 
            SELECT DISTINCT dependent_ns.nspname :: text AS dependent_schema, 
                   dependent_view.relname :: text AS dependent_view, 
                   CASE dependent_view.relkind WHEN 'r' THEN 'TABLE' WHEN 'm' THEN 'MATERIALIZED_VIEW' WHEN 'i' THEN 'INDEX' WHEN 'S' THEN 'SEQUENCE' WHEN 'v' THEN 'VIEW' WHEN 'c' THEN 'TYPE' ELSE dependent_view.relkind :: text END AS dependent_ObjectType, 
                   source_ns.nspname :: text AS source_schema, 
                   source_table.relname :: text AS source_table 
            FROM pg_depend 
            JOIN pg_rewrite ON pg_depend.objid = pg_rewrite.oid 
            JOIN pg_class AS dependent_view ON pg_rewrite.ev_class = dependent_view.oid 
            JOIN pg_class AS source_table ON pg_depend.refobjid = source_table.oid 
            JOIN pg_namespace dependent_ns ON dependent_ns.oid = dependent_view.relnamespace 
            JOIN pg_namespace source_ns ON source_ns.oid = source_table.relnamespace 
            INNER JOIN view_deps vd ON vd.dependent_schema = source_ns.nspname AND vd.dependent_view = source_table.relname 
            AND NOT (dependent_ns.nspname = vd.dependent_schema AND dependent_view.relname = vd.dependent_view)
          ) 
          SELECT dependent_schema, dependent_view AS dependent_table, dependent_objecttype 
          FROM view_deps 
          WHERE 1 = 1
        ) x 
        WHERE dependent_schema NOT IN('cache')
      ) dep 
      JOIN pg_catalog.pg_indexes pindx ON pindx.tablename = dep.dependent_table AND pindx.schemaname = dep.dependent_schema
    );

    -- 2. Capture View Definitions of dependents
    FOR _build_view IN 
      SELECT CASE WHEN dep.dependent_objecttype = 'MATERIALIZED_VIEW' THEN 'CREATE MATERIALIZED VIEW ' || schemaname || '.' || viewname || ' AS ' || definition WHEN dep.dependent_objecttype = 'VIEW' THEN 'CREATE OR REPLACE VIEW ' || schemaname || '.' || viewname || ' AS ' || definition END AS view_definition 
      FROM (
        SELECT schemaname, pv.viewname, pv.viewowner, pv.definition 
        FROM pg_catalog.pg_views pv 
        UNION 
        SELECT pm.schemaname, pm.matviewname AS viewname, pm.matviewowner AS viewowner, pm.definition 
        FROM pg_catalog.pg_matviews pm
      ) x 
      JOIN (
        SELECT dependent_schema, dependent_table, dependent_objecttype, ROW_NUMBER() OVER() seq 
        FROM (
          WITH RECURSIVE view_deps AS (
            SELECT DISTINCT dependent_ns.nspname :: text AS dependent_schema, 
                   dependent_view.relname :: text AS dependent_view, 
                   CASE dependent_view.relkind WHEN 'r' THEN 'TABLE' WHEN 'm' THEN 'MATERIALIZED_VIEW' WHEN 'i' THEN 'INDEX' WHEN 'S' THEN 'SEQUENCE' WHEN 'v' THEN 'VIEW' WHEN 'c' THEN 'TYPE' ELSE dependent_view.relkind :: text END AS dependent_ObjectType, 
                   source_ns.nspname :: text AS source_schema, 
                   source_table.relname :: text AS source_table 
            FROM pg_depend 
            JOIN pg_rewrite ON pg_depend.objid = pg_rewrite.oid 
            JOIN pg_class AS dependent_view ON pg_rewrite.ev_class = dependent_view.oid 
            JOIN pg_class AS source_table ON pg_depend.refobjid = source_table.oid 
            JOIN pg_namespace dependent_ns ON dependent_ns.oid = dependent_view.relnamespace 
            JOIN pg_namespace source_ns ON source_ns.oid = source_table.relnamespace 
            WHERE NOT (dependent_ns.nspname = source_ns.nspname AND dependent_view.relname = source_table.relname) 
              AND source_table.relname = 'article_status_tag' 
              AND source_ns.nspname = 'inventory_smart'
            UNION 
            SELECT DISTINCT dependent_ns.nspname :: text AS dependent_schema, 
                   dependent_view.relname :: text AS dependent_view, 
                   CASE dependent_view.relkind WHEN 'r' THEN 'TABLE' WHEN 'm' THEN 'MATERIALIZED_VIEW' WHEN 'i' THEN 'INDEX' WHEN 'S' THEN 'SEQUENCE' WHEN 'v' THEN 'VIEW' WHEN 'c' THEN 'TYPE' ELSE dependent_view.relkind :: text END AS dependent_ObjectType, 
                   source_ns.nspname :: text AS source_schema, 
                   source_table.relname :: text AS source_table 
            FROM pg_depend 
            JOIN pg_rewrite ON pg_depend.objid = pg_rewrite.oid 
            JOIN pg_class AS dependent_view ON pg_rewrite.ev_class = dependent_view.oid 
            JOIN pg_class AS source_table ON pg_depend.refobjid = source_table.oid 
            JOIN pg_namespace dependent_ns ON dependent_ns.oid = dependent_view.relnamespace 
            JOIN pg_namespace source_ns ON source_ns.oid = source_table.relnamespace 
            INNER JOIN view_deps vd ON vd.dependent_schema = source_ns.nspname AND vd.dependent_view = source_table.relname 
            AND NOT (dependent_ns.nspname = vd.dependent_schema AND dependent_view.relname = vd.dependent_view)
          ) 
          SELECT dependent_schema, dependent_view AS dependent_table, dependent_objecttype 
          FROM view_deps 
          WHERE 1 = 1
        ) x 
        WHERE 1 = 1 AND (dependent_schema != 'cache' OR dependent_objecttype != 'MATERIALIZED_VIEW')
      ) dep ON x.schemaname = dep.dependent_schema AND x.viewname = dep.dependent_table 
      ORDER BY dep.seq 
    LOOP 
      _build_views := array_append(_build_views, _build_view);
    END LOOP;
  
    DROP VIEW IF EXISTS inventory_smart.article_status_tag CASCADE;
    
  END IF;
  
  -- Create the New View pointing to the Versioned Table
  CREATE OR REPLACE VIEW inventory_smart.article_status_tag AS 
  SELECT 
    ast.version_code,
    ast.product_code,
    ast.channel,
    ast.article_status_tag,
    ast."size",
    ast.new_size,
    ast."order"
  FROM inventory_smart.article_status_tag_version ast
  WHERE ast.version_code = global.get_table_version('inventory_smart.article_status_tag_version'::text);

  -- Dependency objects rebuild (Views)
  IF CARDINALITY(_build_views) > 0 THEN
    FOREACH _build_view IN ARRAY _build_views 
    LOOP
      EXECUTE _build_view;
      RAISE NOTICE '_build_view :%', _build_view;
    END LOOP; 
  END IF;

  -- Dependency objects index rebuild
  IF CARDINALITY(_index_builds) > 0 THEN
    FOREACH _index_build IN ARRAY _index_builds 
    LOOP
      EXECUTE _index_build;
      RAISE NOTICE '_index_build :%', _index_build;
    END LOOP;
  END IF;
  
END;
$$;