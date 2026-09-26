--liquibase formatted sql
--changeset linu.nazil:ph_master_updated stripComments:false runOnChange:true splitStatements:false context:Release_1_1 labels:New_Approach_of_MV
--comment: initial changeset for ph_master_updated
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
        CREATE MATERIALIZED VIEW inventory_smart.ph_master
	AS SELECT 
	  paf.l0_name, 
	  paf.l1_name, 
	  paf.l2_name, 
	  paf.l3_name, 
	  paf.style, 
	  paf.style_description, 
	  paf.ph_code, 
	  paf.article, 
	  ast.channel,
	  paf.receipt_date,
	  paf.color, 
	  paf.color_code, 
	  paf.launch_date, 
	  paf.sub_class, 
	  paf.selling_collection, 
	  paf.fabrication, 
	  paf.clearance_start_date,
    paf.clearance_end_date,  
	  paf.retirement_date, 
	  CASE WHEN paf.retirement_date < CURRENT_DATE 
	  AND ast.channel = 'Full Line Retail' THEN 'retired' WHEN paf.clearance_start_date < CURRENT_DATE 
	  AND ast.channel = 'Factory Line Retail' THEN 'clearance' WHEN paf.retirement_date > CURRENT_DATE 
	  AND ast.channel = 'Full Line Retail' THEN 'regular' WHEN paf.clearance_start_date > CURRENT_DATE 
	  AND ast.channel = 'Factory Line Retail' THEN 'regular' ELSE NULL END AS sales_type, 
	  ast.article_status_tag, 
	  paf.selldown_date, 
	  array_agg(
	    jsonb_build_object(
	      'size', ast.new_size, 'product_code', 
	      paf.product_code, 'new_size', ast.new_size, 
	      'order', ast."order"
	    )
	  ) AS product_code_size_map, 
	  array_agg(ast.new_size) AS sizes, 
	  array_agg(paf.product_code) AS product_codes 
	FROM 
	  (
	    SELECT 
	      paf.l0_name, 
		  paf.l1_name, 
		  paf.l2_name, 
		  paf.l3_name, 
		  paf.style, 
		  paf.style_description, 
		  paf.product_code,
		  paf.selldown_date,
		  paf.active,
		  paf.article,
	    paf.receipt_date,
		  paf.color, 
		  paf.color_code, 
		  paf.launch_date, 
		  paf.sub_class, 
		  paf.selling_collection, 
		  paf.fabrication, 
		  paf.clearance_start_date,
      paf.clearance_end_date,  
		  paf.retirement_date, 
	    phf.hierarchy_code AS ph_code 
	    FROM 
	      global.product_attributes_filter paf
	      JOIN (
	        SELECT 
	          *
	        FROM 
	          global.product_hierarchies_filter
	        WHERE 
	          level = (
	              SELECT 
	                hierarchy_level 
	              FROM 
	                global.product_generic_schema_mapping pgsm
	              WHERE 
	                generic_column_name = 'article'
	          ) 
	          AND active
	      ) phf ON paf.l0_name = phf.path->>'l0_name'
	      AND COALESCE(paf.l1_name, '-') = phf.path->>'l1_name' 
	      AND COALESCE(paf.l2_name, '-') = phf.path->>'l2_name' 
	      AND COALESCE(paf.l3_name, '-') = phf.path->>'l3_name' 
	      AND COALESCE(paf.l4_name, '-') = phf.path->>'l4_name' 
	      AND paf.article = phf.path->>'article'
	  ) paf 
	  JOIN inventory_smart.article_status_tag ast ON paf.product_code = ast.product_code 
	WHERE 
	  paf.active = true
	  AND paf.article IS NOT NULL 
	  AND ast.channel IS NOT NULL 
	  AND ast.new_size IS NOT NULL 
	GROUP BY 
	  paf.l0_name, 
	  paf.l1_name, 
	  paf.l2_name, 
	  paf.l3_name, 
	  paf.style, 
	  paf.style_description, 
	  paf.ph_code, 
	  paf.article, 
	  ast.channel,
	  paf.receipt_date,
	  paf.color, 
	  paf.color_code, 
	  paf.launch_date, 
	  paf.sub_class, 
	  paf.selling_collection, 
	  paf.fabrication, 
	  paf.clearance_start_date,
    paf.clearance_end_date,  
	  paf.retirement_date, 
	  ast.article_status_tag, 
	  paf.selldown_date
	WITH DATA;
	CREATE INDEX ph_master_channel_idx ON inventory_smart.ph_master USING btree (channel);
	CREATE INDEX ph_master_l0_name_idx ON inventory_smart.ph_master USING btree (l0_name);
	CREATE INDEX ph_master_ph_code_idx ON inventory_smart.ph_master USING btree (ph_code);
	CREATE INDEX ph_master_article_idx ON inventory_smart.ph_master USING btree (article);
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

