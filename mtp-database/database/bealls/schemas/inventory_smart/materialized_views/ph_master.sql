--liquibase formatted sql
--changeset ujjawal.singh@impactanalytics.co:-ph_master stripComments:false runOnChange:true splitStatements:false context:MTP-22775 labels:pacsun_ph_master
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
    
        -- Put Def here --
-- inventory_smart.ph_master source

CREATE MATERIALIZED VIEW if not exists inventory_smart.ph_master
AS WITH ph_map AS (
         SELECT phf.path ->> 'article'::text AS article,
            phf.hierarchy_code AS ph_code
           FROM global.product_hierarchies_filter phf
          WHERE phf.level = (( SELECT product_generic_schema_mapping.hierarchy_level
                   FROM global.product_generic_schema_mapping
                  WHERE product_generic_schema_mapping.generic_column_name::text = 'article'::text)) AND phf.active = true
        ), article_status AS (
         SELECT article_status_tag.article,
            article_status_tag.channel,
            min(article_status_tag.article_status_tag::text) AS article_status_tag
           FROM inventory_smart.article_status_tag
          GROUP BY article_status_tag.article, article_status_tag.channel
        ), product_size_map AS (
         SELECT article_status_tag.product_code,
            article_status_tag.size,
            article_status_tag.new_size,
            article_status_tag."order"
           FROM inventory_smart.article_status_tag
          WHERE article_status_tag.new_size IS NOT NULL
          GROUP BY article_status_tag.product_code, article_status_tag.size, article_status_tag.new_size, article_status_tag."order"
        )
 SELECT paf.l0_name,
    paf.l1_name,
    paf.l2_name,
    paf.l3_name,
    max(paf.l4_name::text) AS l4_name,
    max(paf.l5_name::text) AS l5_name,
    max(paf.color::text) AS color,
    NULL::text AS sub_collection,
    NULL::text AS flex_style,
    NULL::text AS generic,
    NULL::text AS form,
    NULL::text AS user_defined_1,
    NULL::text AS user_defined_2,
    NULL::text AS user_defined_3,
    NULL::text AS user_defined_4,
    NULL::text AS user_defined_5,
    NULL::text AS user_defined_6,
    NULL::text AS sizes_mat,
    NULL::text AS masterstyle_descr,
    NULL::text AS subbrand_code_desc,
    max(paf.collection::text) AS collection,
    NULL::text AS product_lifecycle,
    NULL::text AS current_assortment_group,
    NULL::text AS current_floorset,
    max(ph.ph_code) AS ph_code,
    NULL::text AS inner_pack_units,
    max(paf.brand::text) AS brand,
    paf.article,
    paf.style_color_description,
    ast.channel,
    min(ast.article_status_tag) AS article_status_tag,
    (array_remove(array_agg(DISTINCT paf.product_description), NULL::text))[1] AS product_description,
    array_agg(DISTINCT jsonb_build_object('size', ps.size, 'product_code', paf.product_code, 'new_size', ps.new_size, 'order', ps."order")) AS product_code_size_map,
    array_agg(DISTINCT ps.new_size) AS sizes,
    array_agg(DISTINCT paf.product_code) AS product_codes
   FROM global.product_attributes_filter paf
     JOIN ph_map ph ON paf.article::text = ph.article
     JOIN article_status ast ON paf.article::text = ast.article::text
     JOIN product_size_map ps ON paf.product_code::text = ps.product_code::text
  WHERE paf.active = true AND paf.article IS NOT NULL AND ast.channel IS NOT NULL
  GROUP BY paf.article, ast.channel, paf.l0_name, paf.l1_name, paf.l2_name, paf.l3_name, paf.style_color_description
WITH DATA;


-- View indexes:
CREATE INDEX ph_master_article_idx ON inventory_smart.ph_master USING btree (article);
CREATE INDEX ph_master_channel_idx ON inventory_smart.ph_master USING btree (channel);
CREATE INDEX ph_master_l0_name_idx ON inventory_smart.ph_master USING btree (l0_name);
CREATE INDEX ph_master_ph_code_idx ON inventory_smart.ph_master USING btree (ph_code);
CREATE UNIQUE INDEX ph_master_unique_idx ON inventory_smart.ph_master USING btree (article, channel, l3_name);



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
