--liquibase formatted sql
--changeset aiyush.prasad:ph_master stripComments:false runOnChange:true splitStatements:false context:MTP-77790 labels:New_Approach_of_MV
--comment: start, removed this value 'paf.product_code' from group by aggregation as latest modification
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
                      and source_table.relname = 'ph_master'
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
                    and source_table.relname = 'ph_master' 
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
        
        -- delete from "cache".request_tracker;
        drop materialized view if exists inventory_smart.ph_master cascade;
    
        -- Put Def here --
        
CREATE MATERIALIZED VIEW inventory_smart.ph_master as

-- CORRECTED VERSION - Handles multiple intro dates properly
WITH filtered_product_data AS (
         SELECT paf.product_code,
            paf.article,
            paf.l0_name,
            paf.l1_name,
            paf.l2_name,
            paf.l3_name,
            paf.l4_name,
            paf.l5_name,
            paf.l6_name,
            paf.l7_name,
            paf.l8_name,
            paf.assortment_indicator,
            paf.color_code,
            paf.style,
            paf.factory_type,
            paf.original_price,
            paf.active,
            paf.product_description,
            paf.intro_date,
            paf.article_orig,
            ast.article_status_tag,
            ast.new_size,
            ast.channel,
            ast."order",
            paf.product_vertical_desc
           FROM global.product_attributes_filter paf
             JOIN inventory_smart.article_status_tag ast ON paf.product_code::text = ast.product_code::text
          WHERE paf.active = true AND (ast.article_status_tag::text <> ALL (ARRAY['Old'::character varying, ''::character varying]::text[])) AND ast.new_size IS NOT NULL
        ), filtered_hierarchies AS (
         SELECT product_hierarchies_filter.hierarchy_code AS ph_code,
            product_hierarchies_filter.path ->> 'l0_name'::text AS l0_name,
            product_hierarchies_filter.path ->> 'l1_name'::text AS l1_name,
            product_hierarchies_filter.path ->> 'l2_name'::text AS l2_name,
            product_hierarchies_filter.path ->> 'l3_name'::text AS l3_name,
            product_hierarchies_filter.path ->> 'l4_name'::text AS l4_name,
            product_hierarchies_filter.path ->> 'l5_name'::text AS l5_name,
            product_hierarchies_filter.path ->> 'article'::text AS article
           FROM global.product_hierarchies_filter
          WHERE product_hierarchies_filter.level = (( SELECT product_generic_schema_mapping.hierarchy_level
                   FROM global.product_generic_schema_mapping
                  WHERE product_generic_schema_mapping.generic_column_name::text = 'article'::text)) AND product_hierarchies_filter.active = true
        ), corrected_intro_dates AS (
         SELECT ranked.article,
            ranked.intro_date
           FROM ( SELECT filtered_product_data.article,
                    filtered_product_data.intro_date,
                    count(*) AS cnt,
                    row_number() OVER (PARTITION BY filtered_product_data.article ORDER BY (count(*)) DESC, filtered_product_data.intro_date) AS row_num
                   FROM filtered_product_data
                  GROUP BY filtered_product_data.article, filtered_product_data.intro_date) ranked
          WHERE ranked.row_num = 1
        ), product_hierarchy_joined AS (
         SELECT fpd.product_code,
            fpd.article,
            fpd.l0_name,
            fpd.l1_name,
            fpd.l2_name,
            fpd.l3_name,
            fpd.l4_name,
            fpd.l5_name,
            fpd.l6_name,
            fpd.l7_name,
            fpd.l8_name,
            fpd.assortment_indicator,
            fpd.color_code,
            fpd.style,
            fpd.factory_type,
            fpd.original_price,
            fpd.active,
            fpd.product_description,
            fpd.intro_date,
            fpd.article_orig,
            fpd.article_status_tag,
            fpd.new_size,
            fpd.channel,
            fpd."order",
            ph.ph_code,
            fpd.product_vertical_desc
           FROM filtered_product_data fpd
             JOIN filtered_hierarchies ph ON fpd.l0_name::text = ph.l0_name AND COALESCE(fpd.l1_name, '-'::character varying)::text = ph.l1_name AND COALESCE(fpd.l2_name, '-'::character varying)::text = ph.l2_name AND COALESCE(fpd.l3_name, '-'::character varying)::text = ph.l3_name AND COALESCE(fpd.l4_name, '-'::character varying)::text = ph.l4_name AND COALESCE(fpd.l5_name, '-'::character varying)::text = ph.l5_name AND fpd.article::text = ph.article
        ), final_result AS (
         SELECT phj.l0_name,
            phj.l1_name,
            phj.l2_name,
            phj.l3_name,
            phj.l4_name,
            phj.l5_name,
            phj.l6_name,
            phj.l7_name,
            phj.l8_name,
            phj.assortment_indicator,
            phj.article_orig,
            phj.color_code,
            phj.style,
            cid.intro_date,
            phj.factory_type,
            phj.original_price,
            phj.active,
            phj.article,
            phj.ph_code,
            phj.article_status_tag,
            phj.product_vertical_desc,
            (array_remove(array_agg(DISTINCT phj.product_description), NULL::text))[1] AS product_description,
            array_agg(DISTINCT jsonb_build_object('size', phj.new_size, 'product_code', phj.product_code, 'new_size', phj.new_size, 'order', phj."order")) AS product_code_size_map,
            array_agg(DISTINCT phj.new_size) AS sizes,
            array_agg(DISTINCT phj.product_code) AS product_codes,
            phj.channel,
            row_number() OVER (PARTITION BY phj.article ORDER BY phj.ph_code DESC) AS row_num
           FROM product_hierarchy_joined phj
             JOIN corrected_intro_dates cid ON phj.article::text = cid.article::text
          GROUP BY phj.l0_name, phj.l1_name, phj.l2_name, phj.l3_name, phj.l4_name, phj.l5_name, phj.l6_name, phj.l7_name, phj.l8_name, phj.assortment_indicator, phj.color_code, phj.style, cid.intro_date, phj.factory_type, phj.article_orig, phj.original_price, phj.active, phj.article, phj.ph_code, phj.article_status_tag, phj.product_vertical_desc, phj.channel
        )
 SELECT l0_name,
    l1_name,
    l2_name,
    l3_name,
    l4_name,
    l5_name,
    l6_name,
    l7_name,
    l8_name,
    assortment_indicator,
    article_orig,
    color_code,
    style,
    intro_date,
    factory_type,
    original_price,
    active,
    article,
    ph_code,
    article_status_tag,
    product_description,
    product_code_size_map,
    sizes,
    product_codes,
    product_vertical_desc,
    channel
   FROM final_result
  WHERE row_num = 1;

-- View indexes:
CREATE INDEX ph_master_article_idx ON inventory_smart.ph_master USING btree (article);
CREATE INDEX ph_master_channel_idx ON inventory_smart.ph_master USING btree (channel);
CREATE INDEX ph_master_l0_name_idx ON inventory_smart.ph_master USING btree (l0_name);
CREATE INDEX ph_master_ph_code_idx ON inventory_smart.ph_master USING btree (ph_code);
CREATE UNIQUE INDEX ph_master_ph_code_unidx ON inventory_smart.ph_master USING btree (ph_code, channel);
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

