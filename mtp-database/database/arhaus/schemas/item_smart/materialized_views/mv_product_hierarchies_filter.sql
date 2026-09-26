--liquibase formatted sql
--changeset hemant.kumar@impactanalytics.co:mv_product_hierarchies_filter stripComments:false runOnChange:true splitStatements:false context:query_updated labels:itemsmart_initial_commit
--comment: initial changeset for mv_product_hierarchies_filter
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
                      and source_table.relname = 'mvw_hierarchy_code_wise_net_implied' 
                      and source_ns.nspname = 'plan_smart'
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
                    and source_table.relname = 'mvw_hierarchy_code_wise_net_implied' 
                    and source_ns.nspname = 'plan_smart'
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
        drop materialized view if exists item_smart.mv_product_hierarchies_filter cascade;
    
        -- Put Def here --
-------------------------------
CREATE MATERIALIZED VIEW item_smart.mv_product_hierarchies_filter
   
AS SELECT phf.hierarchy_code,
    phf.l1_name,
    phf.l2_name,
    phf.l3_name,
    phf.l4_name,
    phf.product_code,
    pm.product_name,
    phf.level,
    paf.active,
    paf.product_description,
    paf.l2_id,
    paf.l3_desc,
    paf.l3_id,
    paf.l4_desc,
    paf.l4_id,
    paf.cost,
    paf.size,
    paf.active AS paf_active,
    paf.allow_direct_ship_code,
    paf.allow_direct_ship_desc,
    paf.class_name,
    paf.clearance,
    paf.collection_desc,
    paf.collection_id,
    paf.collection_name,
    paf.created_at,
    paf.created_by,
    paf.cubic_meter,
    paf.depth_dimension,
    paf.division_name,
    paf.dpt_name,
    paf.first_case_sell_price,
    paf.first_sugg_retail_price,
    paf.height_dimension,
    paf.is_deleted,
    paf.is_special_order,
    paf.kit_status,
    paf.kit_status_desc,
    paf.lifestyle,
    paf.multi_division_mapping_flag,
    paf.original_price,
    paf.price,
    paf.price_bucket,
    paf.promo_end_date,
    paf.promo_price,
    paf.promo_start_date,
    paf.purchase_status,
    paf.purchase_status_code,
    paf.purchase_status_type,
    paf.purchase_status_type_code,
    paf.rec_status,
    paf.receipt_date,
    paf.reference_product_codes,
    paf.replacement_product_codes,
    paf.retail_price,
    paf.sell_price,
    paf.storage_depth,
    paf.storage_height,
    paf.storage_weight,
    paf.storage_width,
    paf.super_collection_desc,
    paf.super_collection_id,
    paf.updated_at,
    paf.updated_by,
    paf.vendor_id,
    paf.vendor_model_number,
    paf.vendor_name,
    paf.width_dimension,
    paf.worry_free_eligible,
    paf.worry_free_outdoor_eligible,
    paf.product_bucket_code,
    paf.active_flag,
    paf.comfort,
    paf.second_description,
    paf.finish,
    paf.special_order_lead_time,
    paf.type,
    paf.markdown_date,
    paf.shape,
    paf.form,
    paf.moq,
    paf.launch_date,
    paf.custom_special_order_lead_time,
    paf.description,
    paf.exit_date,
    paf.function,
    paf.aesthetic,
    paf.no_of_reg_weeks,
    paf.covering,
    paf.color,
    paf.product_type,
    paf.first_replacement_cost,
    paf.replacement_cost,
    paf.plannable_hierarchy,
    paf.master_hierarchy_code,
    paf.lead_time,
    paf.county_of_origin
   FROM (
    SELECT product_hierarchies_filter.hierarchy_code,
    (product_hierarchies_filter.path ->> 'l0_name'::text)::character varying AS l0_name,
    (product_hierarchies_filter.path ->> 'l1_name'::text)::character varying AS l1_name,
    (product_hierarchies_filter.path ->> 'l2_name'::text)::character varying AS l2_name,
    (product_hierarchies_filter.path ->> 'l3_name'::text)::character varying AS l3_name,
    (product_hierarchies_filter.path ->> 'l4_name'::text)::character varying AS l4_name,
    (product_hierarchies_filter.path ->> 'product_code'::text)::character varying AS product_code,
    product_hierarchies_filter.level,
    product_hierarchies_filter.active
   FROM global.product_hierarchies_filter
     JOIN global.product_attributes_filter paf ON (product_hierarchies_filter.path ->> 'product_code'::text) = paf.product_code::text
  WHERE product_hierarchies_filter.active = true AND product_hierarchies_filter.level = 6 AND paf.active = true
   ) phf
     JOIN global.product_attributes_filter paf ON paf.product_code::text = phf.product_code::text
     JOIN global.product_master pm ON pm.product_code::text = phf.product_code::text
WITH DATA;
CREATE INDEX idx_hcode_mv_phf ON item_smart.mv_product_hierarchies_filter USING btree (hierarchy_code);
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