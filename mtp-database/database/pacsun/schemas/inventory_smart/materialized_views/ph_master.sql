--liquibase formatted sql
--changeset sreevathsa.sp@impactanalytics.co:-ph_master_v13 stripComments:false runOnChange:true splitStatements:false context:MTP-22775 labels:pacsun_ph_master
--comment: adding sizes column to ph_master
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
CREATE MATERIALIZED VIEW if not exists inventory_smart.ph_master
AS
WITH product_hierarchy AS (
    SELECT paf.l0_name,
           paf.l1_name,
           paf.l2_name,
           paf.l3_id_name,
           paf.l3_name,
           paf.l4_id,
           paf.l4_name,
           paf.l5_name,
           paf.color_name,
           paf.size_name,
           paf.size_id,
           paf.product_code,
           paf.product_description,
           paf.article,
           paf.brand,
           paf.fit,
           paf.style,
           paf.ladder,
           paf.markdown_ind,
           phf.hierarchy_code AS ph_code
    FROM global.product_attributes_filter paf
    JOIN (
        SELECT product_hierarchies_filter.hierarchy_code,
               product_hierarchies_filter.path,
               product_hierarchies_filter.level,
               product_hierarchies_filter.active
        FROM global.product_hierarchies_filter
        WHERE product_hierarchies_filter.level = (
            SELECT product_generic_schema_mapping.hierarchy_level
            FROM global.product_generic_schema_mapping
            WHERE product_generic_schema_mapping.generic_column_name::text = 'article'::text
        ) AND product_hierarchies_filter.active
    ) phf ON COALESCE(paf.l0_name, '-'::character varying)::text = (phf.path ->> 'l0_name'::text)
         AND COALESCE(paf.l1_name, '-'::character varying)::text = (phf.path ->> 'l1_name'::text)
         AND COALESCE(paf.l2_name, '-'::character varying)::text = (phf.path ->> 'l2_name'::text)
         AND COALESCE(paf.l3_id_name, '-'::character varying)::text = (phf.path ->> 'l3_id_name'::text)
         AND COALESCE(paf.l4_name, '-'::character varying)::text = (phf.path ->> 'l4_name'::text)
         AND COALESCE(paf.article, '-'::character varying)::text = (phf.path ->> 'article'::text)
    WHERE paf.active = true AND paf.article IS NOT NULL
)
SELECT ph.l0_name,
       ph.l1_name,
       ph.l2_name,
       ph.l3_id_name,
       ph.l3_name,
       ph.l4_id,
       ph.l4_name,
       ph.l5_name,
       ph.color_name,
       string_agg(DISTINCT ph.size_name::text, '__ia_char_30'::text) AS size_name,
       array_agg(ph.size_name ORDER BY cast(ph.size_id as int)) AS sizes,
       string_agg(DISTINCT ph.size_name::text, '__ia_char_30'::text) AS sizes_mat,
       ph.brand,
       ph.fit,
       ph.style,
       ph.ladder,
       ph.markdown_ind,
       ph.ph_code,
       ph.article,
       ast.channel,
       ast.article_status_tag,
       (array_remove(array_agg(ph.product_description), NULL::text))[1] AS product_description,
       array_agg(jsonb_build_object('size', ast.size, 'product_code', ph.product_code, 'new_size', ast.new_size, 'order', ast."order") ORDER BY ph.size_id) AS product_code_size_map,
       array_agg(ph.product_code ORDER BY cast(ph.size_id as int)) AS product_codes
FROM product_hierarchy ph
JOIN (
    SELECT article_status_tag.product_code,
           article_status_tag.channel,
           article_status_tag.article_status_tag,
           article_status_tag.size,
           article_status_tag.new_size,
           article_status_tag."order"
    FROM inventory_smart.article_status_tag
) ast ON ph.product_code::text = ast.product_code::text
WHERE ast.channel IS NOT NULL AND ast.new_size IS NOT null
GROUP BY ph.l0_name, ph.l1_name, ph.l2_name, ph.l3_id_name,ph.l3_name, ph.l4_id, ph.l4_name, ph.l5_name, 
         ph.color_name, ph.brand, ph.fit, ph.style, ph.ladder, ph.markdown_ind, ph.ph_code, 
         ph.article, ast.channel, ast.article_status_tag
with data;

-- View indexes:
CREATE INDEX ph_master_article_idx ON inventory_smart.ph_master USING btree (article);
CREATE INDEX ph_master_channel_idx ON inventory_smart.ph_master USING btree (channel);
CREATE INDEX ph_master_l0_name_idx ON inventory_smart.ph_master USING btree (l0_name);
CREATE INDEX ph_master_ph_code_idx ON inventory_smart.ph_master USING btree (ph_code);
CREATE UNIQUE INDEX ph_master_unique_idx ON inventory_smart.ph_master (article, channel);
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
