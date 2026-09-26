--liquibase formatted sql
--changeset linu.nazil:aggregation_level_filter_test_updated stripComments:false runOnChange:true splitStatements:false context:Release_1_1 labels:New_Approach_of_MV
--comment: initial changeset for aggregation_level_filter_updated
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
        create MATERIALIZED VIEW if not exists "global".aggregation_level_filter
           
        AS SELECT grouped_data.l4_name AS aggregation_code,
    grouped_data.product_code AS products,
    grouped_data.article,
    grouped_data.l5_name,
    grouped_data.style_description,
    grouped_data.clearance_end_date,
    grouped_data.end_date,
    grouped_data.size,
    grouped_data.launch_date,
    grouped_data.clearance_start_date,
    grouped_data.retirement_date,
    grouped_data.merchant_pyramid_colorway,
    grouped_data.sku,
    grouped_data.merchant_pyramid,
    grouped_data.product_cost,
    grouped_data.wholesale_price,
    grouped_data.retailer_markup,
    grouped_data.direct_imu_target,
    grouped_data.indirect_imu_target,
    grouped_data.original_price,
    grouped_data.product_price,
    grouped_data.selling_collection,
    grouped_data.new_carryover_sku,
    grouped_data.new_carryover_style,
    grouped_data.sku_dropped_date,
    grouped_data.style_dropped_date,
    grouped_data.style,
    grouped_data.color,
    grouped_data.parent_style_description,
    grouped_data.fabrication,
    grouped_data.l0_name,
    grouped_data.l1_name,
    grouped_data.l2_name,
    grouped_data.l3_name,
    grouped_data.l4_name
   FROM ( SELECT array_agg(pa.product_code) AS product_code,
            max(pa.article::text) AS article,
            max(pa.l5_name::text) AS l5_name,
            max(pa.style_description::text) AS style_description,
            max(pa.clearance_end_date) AS clearance_end_date,
            max(pa.end_date) AS end_date,
            max(pa.size::text) AS size,
            max(pa.launch_date) AS launch_date,
            max(pa.clearance_start_date) AS clearance_start_date,
            max(pa.retirement_date) AS retirement_date,
            max(pa.merchant_pyramid_colorway::text) AS merchant_pyramid_colorway,
            max(pa.sku::text) AS sku,
            max(pa.merchant_pyramid::text) AS merchant_pyramid,
            max(pa.product_cost) AS product_cost,
            max(pa.wholesale_price) AS wholesale_price,
            max(pa.retailer_markup) AS retailer_markup,
            max(pa.direct_imu_target) AS direct_imu_target,
            max(pa.indirect_imu_target) AS indirect_imu_target,
            max(pa.original_price) AS original_price,
            max(pa.product_price) AS product_price,
            max(pa.selling_collection::text) AS selling_collection,
            max(pa.new_carryover_sku::text) AS new_carryover_sku,
            max(pa.new_carryover_style::text) AS new_carryover_style,
            max(pa.sku_dropped_date::text) AS sku_dropped_date,
            max(pa.style_dropped_date::text) AS style_dropped_date,
            max(pa.style::text) AS style,
            max(pa.color::text) AS color,
            max(pa.parent_style_description::text) AS parent_style_description,
            max(pa.fabrication::text) AS fabrication,
            pa.l0_name,
            pa.l1_name,
            pa.l2_name,
            pa.l3_name,
            pa.l4_name
           FROM global.product_attributes_filter pa
          WHERE pa.is_deleted IS FALSE
          GROUP BY pa.l4_name, pa.l0_name, pa.l1_name, pa.l2_name, pa.l3_name) grouped_data
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
