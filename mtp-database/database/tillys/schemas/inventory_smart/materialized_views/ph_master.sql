--liquibase formatted sql
--changeset anish.a@impactanalytics.co:ph_master stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels:liquibase_project_starts
--comment: initial changeset for ph_master
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
-- inventory_smart.ph_master source
CREATE MATERIALIZED VIEW inventory_smart.ph_master
-- TABLESPACE pg_default
AS SELECT paf.l0_name,
    paf.l1_name,
    paf.l2_name,
    paf.l3_name,
    paf.l4_name,
    paf.style,
    paf.color,
    paf.color_name,
    paf.color_id_name,
    paf.brand,
    paf.department,
    paf.subdepartment,
    paf.class,
    paf.subclass,
    paf.style_color_desc,
    paf.vendor,
    paf.ph_code,
    paf.article,
    paf.active,
    max(paf.silhouette) as silhouette,
    paf.price_status,
    paf.comments,
    paf.product_status,
    min(paf.launch_date) AS launch_date,
    ast.channel,
    ast.article_status_tag,
    (array_remove(array_agg(paf.product_description), NULL::text::character varying))[1] AS product_description,
    array_agg(jsonb_build_object('size', ast.size, 'product_code', paf.product_code, 'new_size', ast.new_size, 'order', ast."order")) AS product_code_size_map,
    array_agg(ast.new_size) AS sizes,
    array_agg(paf.product_code) AS product_codes
   FROM ( SELECT paf_1.l0_name,
            paf_1.l1_name,
            paf_1.l2_name,
            paf_1.l3_name,
            paf_1.l4_name,
            paf_1.l4_name AS style,
            paf_1.color,
            paf_1.color_name,
            paf_1.color_id_name,
            paf_1.brand,
            paf_1.department,
            paf_1.subdepartment,
            paf_1.class,
            paf_1.subclass,
            paf_1.style_color_desc,
            paf_1.vendor,
            paf_1.product_code,
            paf_1.product_description,
            paf_1.article,
            paf_1.active,
            paf_1.silhouette,
            paf_1.price_status,
            paf_1.comments,
            paf_1.product_status,
            paf_1.launch_date,
            phf.hierarchy_code AS ph_code
           FROM global.product_attributes_filter paf_1
             JOIN ( SELECT product_hierarchies_filter.hierarchy_code,
                    product_hierarchies_filter.path,
                    product_hierarchies_filter.level,
                    product_hierarchies_filter.active,
                    product_hierarchies_filter.created_at,
                    product_hierarchies_filter.updated_at
                   FROM global.product_hierarchies_filter
                  WHERE product_hierarchies_filter.level = (( SELECT product_generic_schema_mapping.hierarchy_level
                           FROM global.product_generic_schema_mapping
                          WHERE product_generic_schema_mapping.generic_column_name::text = 'article'::text)) AND product_hierarchies_filter.active) phf ON COALESCE(paf_1.l0_name, '-'::character varying)::text = (phf.path ->> 'l0_name'::text) AND COALESCE(paf_1.l1_name, '-'::character varying)::text = (phf.path ->> 'l1_name'::text) AND COALESCE(paf_1.l2_name, '-'::character varying)::text = (phf.path ->> 'l2_name'::text) AND COALESCE(paf_1.l3_name, '-'::character varying)::text = (phf.path ->> 'l3_name'::text) AND COALESCE(paf_1.l4_name, '-'::character varying)::text = (phf.path ->> 'l4_name'::text) AND paf_1.article::text = (phf.path ->> 'article'::text)) paf
     JOIN inventory_smart.article_status_tag ast ON paf.product_code::text = ast.product_code::text
  WHERE paf.active = true AND paf.article IS NOT NULL AND ast.channel IS NOT NULL AND ast.new_size IS NOT NULL
  GROUP BY paf.l0_name, paf.l1_name, paf.l2_name, paf.l3_name, paf.l4_name, paf.style, paf.color, paf.color_name, paf.color_id_name, paf.brand, paf.department, paf.subdepartment, paf.class, paf.subclass, paf.style_color_desc, paf.vendor, paf.ph_code, paf.article, paf.active, paf.price_status, paf.comments, paf.product_status, ast.channel, ast.article_status_tag
WITH DATA;

-- View indexes:
CREATE INDEX ph_master_article_idx ON inventory_smart.ph_master USING btree (article);
CREATE INDEX ph_master_channel_idx ON inventory_smart.ph_master USING btree (channel);
CREATE INDEX ph_master_l0_name_idx ON inventory_smart.ph_master USING btree (l0_name);
CREATE INDEX ph_master_ph_code_idx ON inventory_smart.ph_master USING btree (ph_code);
CREATE UNIQUE INDEX IF NOT EXISTS ph_master_unique_idx ON inventory_smart.ph_master
USING btree ( ph_code, channel);
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