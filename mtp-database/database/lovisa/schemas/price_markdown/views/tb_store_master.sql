--liquibase formatted sql
--changeset rohankumar.sinha:tb_store_master_v2 runOnChange:true stripComments:false splitStatements:false context:zdt-views labels:MTP-1
--comment: initial changeset for tb_store_master_v2
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
	WHERE table_name = 'tb_store_master' AND table_schema = 'price_markdown' 
	and table_type = 'BASE TABLE';

	SELECT
	COUNT(*) AS cnt INTO _is_view
	FROM information_schema."tables" c  
	WHERE table_name = 'tb_store_master' AND table_schema = 'price_markdown' 
	AND table_type = 'VIEW';

	IF _is_table = 1 THEN 
	
		DROP TABLE IF EXISTS price_markdown.tb_store_master CASCADE;
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
                      and source_table.relname = 'tb_store_master'
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
                    and source_table.relname = 'tb_store_master' 
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
	
		DROP VIEW IF EXISTS price_markdown.tb_store_master CASCADE ;
		--raise notice 'dropping view....';
		
	END IF;
	

CREATE OR REPLACE VIEW price_markdown.tb_store_master
AS SELECT version_code,
    store_type_id,
    store_type,
    store_status,
    store_open_flag,
    store_name,
    store_id,
    store_grade_id,
    store_grade,
    store_code,
    special_classification,
    s5_name,
    s5_id,
    s4_name,
    s4_id,
    s3_name,
    s3_id,
    s2_name,
    s2_id,
    s1_name,
    s1_id,
    s0_name,
    s0_id,
    open_date,
    longitude,
    latitude,
    is_active,
    currency_id,
    close_date,
    climate_area,
    active
   FROM ( SELECT a.version_code,
            a.store_type_id,
            a.store_type,
            a.store_status,
            a.store_open_flag,
            a.store_name,
            a.store_id,
            b.store_grade_id,
            b.store_grade,
            a.store_code,
            a.special_classification,
            a.s5_name,
            a.s5_id,
            a.s4_name,
            a.s4_id,
            a.s3_name,
            a.s3_id,
            a.s2_name,
            a.s2_id,
            a.s1_name,
            a.s1_id,
            a.s0_name,
            a.s0_id,
            a.open_date,
            a.longitude,
            a.latitude,
            a.is_active,
            a.currency_id,
            a.close_date,
            a.climate_area,
            a.active
           FROM ( SELECT marksmart_store_master_version.version_code,
                    marksmart_store_master_version.s0_name,
                    marksmart_store_master_version.s0_id,
                    marksmart_store_master_version.s1_name,
                    marksmart_store_master_version.s1_id,
                    marksmart_store_master_version.s2_name,
                    marksmart_store_master_version.s2_id,
                    marksmart_store_master_version.s3_name,
                    marksmart_store_master_version.s3_id,
                    marksmart_store_master_version.s4_name,
                    marksmart_store_master_version.s4_id,
                    marksmart_store_master_version.s5_name,
                    marksmart_store_master_version.s5_id,
                    marksmart_store_master_version.store_code,
                    marksmart_store_master_version.store_name,
                    marksmart_store_master_version.store_status,
                    marksmart_store_master_version.store_type,
                    marksmart_store_master_version.store_open_flag,
                    marksmart_store_master_version.active,
                    marksmart_store_master_version.special_classification,
                    marksmart_store_master_version.climate_area,
                    marksmart_store_master_version.latitude,
                    marksmart_store_master_version.longitude,
                    marksmart_store_master_version.open_date,
                    marksmart_store_master_version.close_date,
                    marksmart_store_master_version.is_active,
                    marksmart_store_master_version.store_id,
                    marksmart_store_master_version.store_type_id,
                    marksmart_store_master_version.store_grade,
                    marksmart_store_master_version.store_grade_id,
                    marksmart_store_master_version.currency_id
                   FROM price_markdown.marksmart_store_master_version
                  WHERE marksmart_store_master_version.version_code = global.get_table_version('price_markdown.marksmart_store_master_version'::text)) a
             LEFT JOIN ( SELECT tb_latest_inventory.store_code,
                    array_agg(DISTINCT tb_latest_inventory.store_grade ORDER BY tb_latest_inventory.store_grade)::text[] AS store_grade,
                    array_agg(DISTINCT tb_latest_inventory.store_grade_id ORDER BY tb_latest_inventory.store_grade_id) AS store_grade_id
                   FROM global.tb_latest_inventory
                  GROUP BY tb_latest_inventory.store_code) b ON a.store_code::text = b.store_code) unnamed_subquery;
  
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












