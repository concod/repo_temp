--liquibase formatted sql
--changeset vishnu.vk@impactanalytics.co@impactanalytics.co:mv_exception_report_v3 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: Create mv_exception_report materialized view


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
                      and source_table.relname = 'mv_exception_report'
                      and source_ns.nspname = 'base_pricing'
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
                    and source_table.relname = 'mv_exception_report'
                    and source_ns.nspname = 'base_pricing'
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
        drop materialized view if exists base_pricing.mv_exception_report cascade;
    
        -- Put Def here -

        -- base_pricing.mv_exception_report source

        -- base_pricing.mv_exception_report source

        CREATE MATERIALIZED VIEW base_pricing.mv_exception_report
           
        AS WITH strategy_status AS (
                SELECT b.strategy_status_display_name,
                    b.strategy_status_id,
                    m.strategy_id,
                    m.strategy_name
                  FROM base_pricing.bp_strategy_master m
                    JOIN base_pricing.bp_strategy_status_level b ON m.strategy_status_id = b.strategy_status_id
                ), rule_id_to_name AS (
                SELECT rm.id AS rule_id,
                    rt.name AS rule_name
                  FROM base_pricing.bp_rule_master rm
                    JOIN base_pricing.bp_rule_types rt ON rm.rule_type_id = rt.id
                ), finalized_prices AS (
                SELECT fin.strategy_id,
                    fin.product_id::text AS product_id,
                    fin.store_id::text AS store_id,
                    string_agg(DISTINCT r.rule_name::text, ', '::text) AS exception_list,
                    string_agg(DISTINCT fin.opt_level_bins::text, ', '::text) AS opt_level_bins,
                    string_agg(DISTINCT fin.product_name::text, ', '::text) AS product_description,
                    string_agg(DISTINCT fin.store_name::text, ', '::text) AS store_description,
                    string_agg(DISTINCT fin.price_zone_name::text, ', '::text) AS price_zone_name,
                    round(avg(fin.base_price)::numeric, 2) AS finalized_price,
                    sum(fin.sales_units) AS total_sales_units,
                    round(sum(fin.revenue)::numeric, 2) AS total_revenue,
                    max(fin.channel::text) AS channel,
                    max(fin.line_group::text) AS line_group,
                    max(fin.zone_structure_name::text) AS zone_structure_name,
                    max(fin.size_family::text) AS size_family,
                    max(fin.size_class::text) AS size_class,
                    max(fin.brand_family::text) AS brand_family,
                    max(fin.brand_class::text) AS brand_class,
                    max(fin.other_family_1::text) AS other_family_1,
                    max(fin.other_class_1::text) AS other_class_1,
                    max(fin.cost) AS cost,
                    max(fin.size) AS size,
                    max(fin.uom::text) AS uom,
                    max(curr.price_change_reason) AS price_change_reason,
                    null AS competitor_price,
                    round(avg(fin.price)::numeric, 2) AS price
                  FROM base_pricing.bp_price_reco_finalized fin
                    JOIN base_pricing.bp_price_reco_current curr ON curr.strategy_id = fin.strategy_id AND curr.product_id = fin.product_id AND curr.store_id = fin.store_id
                    JOIN LATERAL jsonb_array_elements(fin.rules_exception) rule_data(value) ON true
                    JOIN rule_id_to_name r ON ((rule_data.value ->> 'rule_id'::text)::integer) = r.rule_id
                  WHERE fin.rules_exception IS NOT NULL AND jsonb_typeof(fin.rules_exception) = 'array'::text AND jsonb_array_length(fin.rules_exception) > 0 AND (fin.strategy_id IN ( SELECT bp_strategy_master.strategy_id
                          FROM base_pricing.bp_strategy_master
                          WHERE bp_strategy_master.strategy_status_id = ANY (ARRAY[110, 200])))
                  GROUP BY fin.strategy_id, fin.product_id, fin.store_id
                )
        SELECT fp.strategy_id,
            fp.product_id,
            fp.store_id,
            fp.exception_list,
            fp.opt_level_bins,
            fp.product_description,
            fp.store_description,
            fp.price_zone_name,
            fp.finalized_price,
            fp.total_sales_units,
            fp.total_revenue,
            fp.channel,
            fp.line_group,
            fp.zone_structure_name,
            fp.size_family,
            fp.size_class,
            fp.brand_family,
            fp.brand_class,
            fp.other_family_1,
            fp.other_class_1,
            fp.cost,
            fp.size,
            fp.uom,
            fp.price_change_reason,
            fp.competitor_price,
            fp.price,
            ss.strategy_status_display_name AS strategy_status,
            ss.strategy_name
          FROM finalized_prices fp
            JOIN strategy_status ss ON ss.strategy_id = fp.strategy_id
          ORDER BY fp.strategy_id, fp.product_id, fp.store_id
        WITH DATA;
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