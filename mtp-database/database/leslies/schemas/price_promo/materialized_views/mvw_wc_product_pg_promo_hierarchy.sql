--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:mvw_wc_product_pg_promo_hierarchy_3 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: issue fix on mvw_wc_product_pg_promo_hierarchy


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
                      and source_table.relname = 'mvw_wc_product_pg_promo_hierarchy'
                      and source_ns.nspname = 'price_promo'
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
                    and source_table.relname = 'mvw_wc_product_pg_promo_hierarchy'
                    and source_ns.nspname = 'price_promo'
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
        drop materialized view if exists price_promo.mvw_wc_product_pg_promo_hierarchy cascade;
    
        -- Put Def here -

        -- price_promo.mvw_wc_product_pg_promo_hierarchy source

        CREATE MATERIALIZED VIEW price_promo.mvw_wc_product_pg_promo_hierarchy
           
        AS SELECT final_data.promo_id,
            final_data.l0_ids,
            final_data.l1_ids,
            final_data.l2_ids,
            final_data.l3_ids,
            final_data.l4_ids,
            final_data.brand_ids,
            final_data.lifecycle_indicator_ids
          FROM ( WITH hier_data AS (
                        SELECT pph.promo_id,
                                CASE
                                    WHEN pph.hierarchy_level_id = 0 THEN pph.hierarchy_value_id
                                    ELSE NULL::integer::bigint
                                END AS l0_ids,
                                CASE
                                    WHEN pph.hierarchy_level_id = 1 THEN pph.hierarchy_value_id
                                    ELSE NULL::integer::bigint
                                END AS l1_ids,
                                CASE
                                    WHEN pph.hierarchy_level_id = 2 THEN pph.hierarchy_value_id
                                    ELSE NULL::integer::bigint
                                END AS l2_ids,
                                CASE
                                    WHEN pph.hierarchy_level_id = 3 THEN pph.hierarchy_value_id
                                    ELSE NULL::integer::bigint
                                END AS l3_ids,
                                CASE
                                    WHEN pph.hierarchy_level_id = 4 THEN pph.hierarchy_value_id
                                    ELSE NULL::integer::bigint
                                END AS l4_ids,
                                CASE
                                    WHEN pph.hierarchy_level_id = '-1'::integer THEN pph.hierarchy_value_id
                                    ELSE NULL::integer::bigint
                                END AS brand_ids,
                                CASE
                                    WHEN pph.hierarchy_level_id = '-2'::integer THEN pph.hierarchy_value_id
                                    ELSE NULL::integer::bigint
                                END AS lifecycle_indicator_ids
                          FROM ( SELECT DISTINCT pph_1.promo_id,
                                    pph_1.hierarchy_level_id,
                                    pph_1.hierarchy_value_id
                                  FROM price_promo.included_product_hierarchy pph_1
                                UNION
                                SELECT DISTINCT ppph.promo_id,
                                    ppph.hierarchy_level_id,
                                    ppph.hierarchy_value_id
                                  FROM price_promo.included_promo_pg_hierarchy ppph) pph
                          GROUP BY pph.promo_id, pph.hierarchy_level_id, pph.hierarchy_value_id
                        ), hier_agg_data AS (
                        SELECT hier_data.promo_id,
                            array_agg(DISTINCT hier_data.l0_ids) FILTER (WHERE hier_data.l0_ids IS NOT NULL) AS l0_ids,
                            array_agg(DISTINCT hier_data.l1_ids) FILTER (WHERE hier_data.l1_ids IS NOT NULL) AS l1_ids,
                            array_agg(DISTINCT hier_data.l2_ids) FILTER (WHERE hier_data.l2_ids IS NOT NULL) AS l2_ids,
                            array_agg(DISTINCT hier_data.l3_ids) FILTER (WHERE hier_data.l3_ids IS NOT NULL) AS l3_ids,
                            array_agg(DISTINCT hier_data.l4_ids) FILTER (WHERE hier_data.l4_ids IS NOT NULL) AS l4_ids,
                            array_agg(DISTINCT hier_data.brand_ids) FILTER (WHERE hier_data.brand_ids IS NOT NULL) AS brand_ids,
                            array_agg(DISTINCT hier_data.lifecycle_indicator_ids) FILTER (WHERE hier_data.lifecycle_indicator_ids IS NOT NULL) AS lifecycle_indicator_ids
                          FROM hier_data
                          GROUP BY hier_data.promo_id
                        )
                SELECT hier_agg_data.promo_id,
                    hier_agg_data.l0_ids,
                    hier_agg_data.l1_ids,
                    hier_agg_data.l2_ids,
                    hier_agg_data.l3_ids,
                    hier_agg_data.l4_ids,
                    hier_agg_data.brand_ids,
                    hier_agg_data.lifecycle_indicator_ids
                  FROM hier_agg_data) final_data
        WITH DATA;

        -- View indexes:
        CREATE INDEX mvw_wc_product_pg_promo_hierarchy_id_idx ON price_promo.mvw_wc_product_pg_promo_hierarchy USING btree (promo_id);

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
