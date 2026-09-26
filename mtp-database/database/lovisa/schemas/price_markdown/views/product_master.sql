--liquibase formatted sql
--changeset rohankumar.sinha:product_master_v2 runOnChange:true stripComments:false splitStatements:false context:zdt-views labels:MTP-1
--comment: initial changeset for product_master_v2
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
	WHERE table_name = 'product_master' AND table_schema = 'price_markdown' 
	and table_type = 'BASE TABLE';

	SELECT
	COUNT(*) AS cnt INTO _is_view
	FROM information_schema."tables" c  
	WHERE table_name = 'product_master' AND table_schema = 'price_markdown' 
	AND table_type = 'VIEW';

	IF _is_table = 1 THEN 
	
		DROP TABLE IF EXISTS price_markdown.product_master CASCADE;
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
                      and source_table.relname = 'product_master'
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
                    and source_table.relname = 'product_master' 
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
	
		DROP VIEW IF EXISTS price_markdown.product_master CASCADE ;
		--raise notice 'dropping view....';
		
	END IF;
	

CREATE OR REPLACE VIEW price_markdown.product_master
AS SELECT version_code,
    currency,
    l0_id,
    l0_name,
    l0_cuq,
    l0_cid,
    l1_name,
    l1_id,
    l1_cuq,
    l1_cid,
    l2_name,
    l2_id,
    l2_cuq,
    l2_cid,
    l3_name,
    l3_id,
    l3_cuq,
    l3_cid,
    l4_id,
    l4_name,
    l4_cuq,
    l4_cid,
    brand,
    brand_cid,
    org_brand,
    l5_id,
    l5_name,
    l5_cuq,
    l5_cid,
    l6_id,
    l6_name,
    l6_cuq,
    l6_cid,
    range_id,
    range_name,
    product_id,
    product_name,
    product_cuq,
    msrp_with_vat,
    current_price_with_vat,
    cost_aud,
    product_lifecycle,
    drop_ship,
    status_id,
    status,
    ecom_age,
    max_age,
    store_age,
    age_month_bucket,
    vat_rate_per,
    sku,
    avg_sale_price,
    avg_sale_price_with_vat,
    msrp,
    current_price,
    current_price_aud,
    active,
    is_active,
    clearance_indicator,
    cost,
    last_reg_price_bnm,
    last_reg_price_bnm_with_vat,
    last_reg_price_ecom,
    last_reg_price_ecom_with_vat,
    current_price_with_vat_aud,
    msrp_with_vat_aud,
    product_lifecycle_id,
    currency_id,
    group_number_id,
    group_number_name
   FROM price_markdown.marksmart_product_master_version
  WHERE version_code = global.get_table_version('price_markdown.marksmart_product_master_version'::text);
  
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












