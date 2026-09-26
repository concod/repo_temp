--liquibase formatted sql
--changeset vishnu.vk@impactanalytics.co@impactanalytics.co:mv_aggregated_attributes_master_v1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: Create mv_aggregated_attributes_master materialized view


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
                      and source_table.relname = 'mv_aggregated_attributes_master'
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
                    and source_table.relname = 'mv_aggregated_attributes_master'
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
        drop materialized view if exists base_pricing.mv_aggregated_attributes_master cascade;
    
        -- Put Def here -

        -- base_pricing.mv_aggregated_attributes_master source

        -- base_pricing.mv_aggregated_attributes_master source

        CREATE MATERIALIZED VIEW base_pricing.mv_aggregated_attributes_master
           
        AS WITH product_store_master AS (
                SELECT pm.product_id,
                    pm.product_name,
                    sm.store_id,
                    sm.store_name,
                    sm.s1_name AS channel,
                    sm.s1_id AS channel_id,
                    pm.l2_cid,
                    pm.l4_cid
                  FROM base_pricing.bp_product_master pm
                    CROSS JOIN base_pricing.bp_store_master sm
                ), product_store_master_cte AS (
                SELECT psm.product_id,
                    psm.product_name,
                    psm.store_id,
                    psm.store_name,
                    psm.channel,
                    psm.channel_id,
                    psm.l2_cid,
                    psm.l4_cid
                  FROM product_store_master psm
                    JOIN base_pricing.bp_product_store_attributes_mapping bpsam ON psm.product_id = bpsam.product_id AND psm.store_id = bpsam.store_id
                ), sorted_paginated_products_stores AS (
                SELECT psm.product_id,
                    psm.product_name,
                    psm.store_id,
                    psm.store_name,
                    psm.channel,
                    psm.channel_id,
                    psm.l2_cid,
                    psm.l4_cid
                  FROM product_store_master_cte psm
                ), extracted_attributes AS (
                SELECT psam.product_id,
                    psam.store_id,
                    psam.zone_structure,
                    psam.price_zone,
                    psam.channel_id,
                    psam.effective_price_zone,
                    jsonb_array_elements(psam.attributes) AS attribute
                  FROM base_pricing.bp_product_store_attributes_mapping psam
                    JOIN sorted_paginated_products_stores psm ON psam.product_id = psm.product_id AND psam.store_id = psm.store_id
                )
        SELECT ea.product_id,
            ea.store_id,
            ea.zone_structure,
            ea.price_zone,
            max(zs.zone_structure_id) AS zone_structure_id,
            max(z.zone_id) AS price_zone_id,
            ea.channel_id,
            ea.effective_price_zone,
            max(
                CASE
                    WHEN (ea.attribute ->> 'attribute_name'::text) = 'cost'::text THEN ((ea.attribute -> 'attribute_value'::text) ->> 'current'::text)::double precision
                    ELSE NULL::double precision
                END) AS cost,
            max(
                CASE
                    WHEN (ea.attribute ->> 'attribute_name'::text) = 'price'::text THEN ((ea.attribute -> 'attribute_value'::text) ->> 'current'::text)::double precision
                    ELSE NULL::double precision
                END) AS price,
                CASE
                    WHEN max(
                    CASE
                        WHEN (ea.attribute ->> 'attribute_name'::text) = 'product_status'::text THEN (ea.attribute -> 'attribute_value'::text) ->> 'current'::text
                        ELSE NULL::text
                    END)::boolean = true THEN 'Active'::text
                    ELSE 'Inactive'::text
                END AS product_status,
            max(
                CASE
                    WHEN (ea.attribute ->> 'attribute_name'::text) = 'total_inventory'::text THEN ((ea.attribute -> 'attribute_value'::text) ->> 'current'::text)::integer
                    ELSE NULL::integer
                END) AS total_inventory,
            max(
                CASE
                    WHEN (ea.attribute ->> 'attribute_name'::text) = 'price_lock'::text THEN (ea.attribute -> 'attribute_value'::text) ->> 'current'::text
                    ELSE NULL::text
                END)::boolean AS price_lock,
            max(
                CASE
                    WHEN (ea.attribute ->> 'attribute_name'::text) = 'zone_exception'::text THEN (ea.attribute -> 'attribute_value'::text) ->> 'current'::text
                    ELSE NULL::text
                END)::boolean AS zone_exception,
            max(
                CASE
                    WHEN (ea.attribute ->> 'attribute_name'::text) = 'competitor_price_1'::text THEN ((ea.attribute -> 'attribute_value'::text) ->> 'current'::text)::double precision
                    ELSE NULL::double precision
                END) AS competitor_price_1,
            max(
                CASE
                    WHEN (ea.attribute ->> 'attribute_name'::text) = 'competitor_price_2'::text THEN ((ea.attribute -> 'attribute_value'::text) ->> 'current'::text)::double precision
                    ELSE NULL::double precision
                END) AS competitor_price_2,
            max(
                CASE
                    WHEN (ea.attribute ->> 'attribute_name'::text) = 'competitor_price_3'::text THEN ((ea.attribute -> 'attribute_value'::text) ->> 'current'::text)::double precision
                    ELSE NULL::double precision
                END) AS competitor_price_3,
            max(
                CASE
                    WHEN (ea.attribute ->> 'attribute_name'::text) = 'product_store_attribute_1'::text THEN (ea.attribute -> 'attribute_value'::text) ->> 'current'::text
                    ELSE NULL::text
                END) AS product_store_attribute_1,
            max(
                CASE
                    WHEN (ea.attribute ->> 'attribute_name'::text) = 'product_store_attribute_2'::text THEN (ea.attribute -> 'attribute_value'::text) ->> 'current'::text
                    ELSE NULL::text
                END) AS product_store_attribute_2
          FROM extracted_attributes ea
            LEFT JOIN base_pricing.bp_zones z ON ea.price_zone::text = z.zone_name::text AND z.active = true
            LEFT JOIN base_pricing.bp_zone_structure zs ON z.zone_structure_id = zs.zone_structure_id AND zs.active = true
          GROUP BY ea.product_id, ea.store_id, ea.zone_structure, ea.price_zone, ea.channel_id, ea.effective_price_zone
        WITH DATA;

        -- View indexes:
        CREATE INDEX idx_product_store_id ON base_pricing.mv_aggregated_attributes_master USING btree (product_id, store_id);
        CREATE UNIQUE INDEX unique_product_store_id ON base_pricing.mv_aggregated_attributes_master USING btree (product_id, store_id);
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