--liquibase formatted sql
--changeset himansh.bhardwaj:ph_master_4 stripComments:false runOnChange:true splitStatements:false context:MTP-22775 labels:New_Approach_of_MV
--comment: ph_master_4 
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
    CREATE MATERIALIZED VIEW IF NOT EXISTS inventory_smart.ph_master
       
    AS 
   SELECT 
    MAX(paf.l0_name) AS l0_name,
    MAX(paf.l1_name) AS l1_name,
    MAX(paf.l2_name) AS l2_name,
    MAX(paf.l3_name) AS l3_name,
    MAX(paf.l4_name) AS l4_name,
    MAX(paf.l5_name) AS l5_name,
    MAX(paf.l6_name) AS l6_name,
    MAX(paf.l7_name) AS l7_name,
    MAX(paf.l7_code) AS l7_code,
    paf.active AS active,
    paf.article,
    MAX(paf.display_article) AS display_article,
    MAX(paf.ph_code) AS ph_code,
    MAX(paf.carryover_new) AS carryover_new,
    MAX(paf.distributions) AS distributions,
    MAX(paf.global_fit_platform) AS global_fit_platform,
    MAX(paf.lifecycle) AS lifecycle,
    MAX(paf.markdown_date) AS markdown_date,
    MAX(paf.on_floor_date) AS on_floor_date,
    MAX(paf.vir_constraint_flag) AS vir_constraint_flag,
    MAX(paf.weeks_of_life) AS weeks_of_life,
    MAX(paf.color_name) AS color_name,
    MAX(paf.article_description) AS article_description,
    (array_remove(array_agg(DISTINCT paf.product_description), NULL::character varying::text))[1] AS product_description,
    array_agg(DISTINCT jsonb_build_object('size', ast.new_size, 'product_code', paf.product_code, 'new_size', ast.new_size, 'order', ast."order")) AS product_code_size_map,
    array_agg(DISTINCT ast.new_size) AS sizes,
    array_agg(DISTINCT paf.product_code) AS product_codes,
    ast.channel,
    MAX(paf.dc_assignment) as dc_assignment
    FROM ( SELECT paf_1.active,
                paf_1.article,
                paf_1.article_description,
                paf_1.carryover_new,
                paf_1.clearance,
                paf_1.color,
                paf_1.color_name,
                paf_1.cost,
                paf_1.currency_cost,
                paf_1.currency_price,
                paf_1.dc_assignment,
                paf_1.display_article,
                paf_1.display_product_code,
                paf_1.distributions,
                paf_1.global_fit_platform,
                paf_1.l0_code,
                paf_1.l0_name,
                paf_1.l1_code,
                paf_1.l1_name,
                paf_1.l2_code,
                paf_1.l2_name,
                paf_1.l3_code,
                paf_1.l3_name,
                paf_1.l4_code,
                paf_1.l4_name,
                paf_1.l5_code,
                paf_1.l5_name,
                paf_1.l6_code,
                paf_1.l6_name,
                paf_1.l7_code,
                paf_1.l7_name,
                paf_1.lifecycle,
                paf_1.markdown_date,
                paf_1.on_floor_date,
                paf_1.original_price,
                paf_1.price,
                paf_1.price_status,
                paf_1.product_bucket_code,
                paf_1.product_channel,
                paf_1.product_code,
                paf_1.product_description,
                paf_1.product_name,
                paf_1.product_price_positioning,
                paf_1.product_status,
                paf_1.season,
                paf_1.season_name,
                paf_1.size,
                paf_1.size_name,
                paf_1.vir_constraint_flag,
                paf_1.weeks_of_life,
                paf_1.replacement_product_codes,
                paf_1.reference_product_codes,
                paf_1.receipt_date,
                paf_1.created_at,
                paf_1.updated_at,
                paf_1.created_by,
                paf_1.updated_by,
                paf_1.is_deleted,
                paf_1.rcl_hash,
                phf.hierarchy_code AS ph_code
            FROM global.product_attributes_filter paf_1
                JOIN global.product_hierarchies_filter phf ON paf_1.l0_name::text = (phf.path ->> 'l0_name'::text) AND COALESCE(paf_1.l1_name, '-'::character varying)::text = (phf.path ->> 'l1_name'::text) AND COALESCE(paf_1.l2_name, '-'::character varying)::text = (phf.path ->> 'l2_name'::text) AND COALESCE(paf_1.l3_name, '-'::character varying)::text = (phf.path ->> 'l3_name'::text) AND COALESCE(paf_1.l4_name, '-'::character varying)::text = (phf.path ->> 'l4_name'::text) AND COALESCE(paf_1.l5_name, '-'::character varying)::text = (phf.path ->> 'l5_name'::text) AND paf_1.article::text = (phf.path ->> 'article'::text)
            WHERE phf.level = (( SELECT product_generic_schema_mapping.hierarchy_level
                    FROM global.product_generic_schema_mapping
                    WHERE product_generic_schema_mapping.generic_column_name::text = 'article'::text)) AND phf.active = true) paf
        JOIN inventory_smart.article_status_tag ast ON paf.product_code::text = ast.product_code::text
    WHERE paf.active = true AND paf.article IS NOT NULL AND ast.channel IS NOT NULL AND ast.new_size IS NOT NULL
    GROUP BY paf.article, ast.channel,paf.active
    WITH DATA;

    -- View indexes:
    CREATE INDEX IF NOT EXISTS ph_master_article_idx ON inventory_smart.ph_master USING btree (article);
    CREATE INDEX IF NOT EXISTS ph_master_channel_idx ON inventory_smart.ph_master USING btree (channel);
    CREATE INDEX IF NOT EXISTS ph_master_l0_name_idx ON inventory_smart.ph_master USING btree (l0_name);
    CREATE INDEX IF NOT EXISTS ph_master_ph_code_idx ON inventory_smart.ph_master USING btree (ph_code);
    CREATE UNIQUE INDEX IF NOT EXISTS ph_master_ph_code_channel_unique_idx ON inventory_smart.ph_master USING btree (ph_code, channel);
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