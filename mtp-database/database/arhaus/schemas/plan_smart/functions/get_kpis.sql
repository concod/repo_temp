--liquibase formatted sql
--changeset archa.prakash@impactanalytics.co:get_kpis_chg5 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:slsbuildch2
--comment:  get_kpis changes for sales build calculation
--rollback: SELECT 1
DROP FUNCTION IF EXISTS plan_smart.get_kpis(p_refcursor refcursor, p_plan_code integer, p_formula_string character varying, p_product_filter jsonb, p_weeks integer[], p_query_level integer,p_group_by text[], p_grouping_set boolean);
CREATE OR REPLACE FUNCTION plan_smart.get_kpis(p_refcursor refcursor, p_plan_code integer, p_plan_status integer, p_formula_string character varying, p_channels text[], p_product_filter jsonb, p_weeks integer[], p_query_level integer, p_group_by jsonb DEFAULT '{"time": [{"values": ["current_week"]}]}'::jsonb, p_grouping_set boolean DEFAULT false)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
DECLARE
    
    v_level_id       int4;
    v_table_name     text;
    v_query_source   text;
    v_query_combine  text   := '';
    v_query_filter   text   := '';
    v_kpi_str        text   := '';
    v_hierarchy_code_list text;
    v_phf_code_sql   text;
    i                record;
    v_dim_join_text text := '';
    v_group_by text := '';
    v_hierarchy_code_clause text;
    v_channels_clause text;
    v_cols            text;
    v_parition_clause  text:='';
    v_order_by_clause  text := '';
    v_plan_id         bigint;  
    v_min_week         int[] ;
    v_fiscal_year_prior_weeks int[];
    v_fiscal_year_month_prior_weeks int[] ;
    v_fiscal_year_quarter_prior_weeks int[];
    v_fiscal_year_season_prior_weeks  int[];
   
begin     
    
    FOR i IN (SELECT 
                  dim , 
                  array_agg(attr)::text[]  AS attr
              FROM
                  (SELECT
                       key AS dim,
                       jsonb_array_elements_text(((jsonb_array_elements(value::jsonb))->>'values')::jsonb)::text AS attr
                   FROM 
                       jsonb_each_text(p_group_by::jsonb)) a GROUP BY dim)
    LOOP
        -- Check if the current dimension is 'time' and if it has attributes specified
        IF i.dim = 'time' AND cardinality(i.attr) IS NOT NULL THEN
            -- Construct join and group by clauses for the 'time' dimension
            v_dim_join_text := 'join (select distinct fiscal_year_week, fiscal_year, fiscal_year_month, fiscal_year_season, fiscal_year_quarter from  "global".fiscal_date_mapping) fdm
                               on fdm.fiscal_year_week = p.current_week';
            v_group_by := v_group_by || COALESCE(array_to_string(i.attr::text[], ','), '');
        END IF;
        RAISE NOTICE 'group by clause: %', v_group_by;
        
        -- Check if the current dimension is 'product_hierarchy' and if it has attributes specified
        IF i.dim = 'product_hiearchy' AND cardinality(i.attr) IS NOT NULL THEN
            -- Construct join and group by clauses for the 'product_hierarchy' dimension
            v_dim_join_text := v_dim_join_text ||
                               ' join plan_smart.product_hierarchies_filter phf
                                 on phf.hierarchy_code = p.hierarchy_code';
            v_group_by := v_group_by || COALESCE(',' || array_to_string(i.attr::text[], ','), '');
        END IF;
        RAISE NOTICE 'group by clause: %', v_group_by;
        -- Check if the current dimension is 'channel' and if it has attributes specified
        IF i.dim = 'channel' AND cardinality(i.attr) IS NOT NULL THEN
            -- Append channel attributes to the group by clause
            v_group_by := v_group_by || COALESCE(',' || array_to_string(i.attr::text[], ','), '');
         END IF;
    END LOOP;
    
  
    RAISE NOTICE 'group by clause: %', v_group_by;
    RAISE NOTICE 'dim_join_text: %', v_dim_join_text;
   
    SELECT string_agg(kpi,',') AS kpi_str INTO v_kpi_str
    FROM (SELECT 'coalesce(pm.kpi'||kpino||',p.kpi'||kpino||') AS kpi'||kpino AS kpi
          FROM generate_series(1,250) kpino) a;
 
    v_query_filter := "plan_smart".form_attribute_table_filters_v2('product_hierarchies', 'hierarchy_code', p_product_filter);
    FOR i IN (
    SELECT 
        dim, 
        array_agg(attr)::text[] AS attr
    FROM (
        SELECT
            key AS dim,
            jsonb_array_elements_text(((jsonb_array_elements(value::jsonb))->>'values')::jsonb)::text AS attr
        FROM 
            jsonb_each_text(p_group_by::jsonb)
    ) a 
    GROUP BY dim
)
LOOP
    IF i.dim = 'time' AND cardinality(i.attr) IS NOT NULL then
       v_order_by_clause := v_order_by_clause || COALESCE(array_to_string(i.attr::text[], ','), '');
        SELECT 
            ARRAY[MIN(week)]
        INTO 
            v_min_week
        FROM 
            unnest(p_weeks) AS week;
      
       RAISE NOTICE 'v_min_week: %', v_min_week;
       
       IF v_min_week IS NULL 
       THEN
         v_min_week := '{}';
       END IF;
        CASE
            WHEN 'current_week' = ANY (i.attr) THEN
                SELECT
                  '{' || array_to_string(array_agg(DISTINCT fiscal_year_week_prior), ',') || '}' as fiscal_year_prior_weeks
                INTO
                    v_fiscal_year_prior_weeks
                FROM 
                    plan_smart.dim_time
                WHERE 
                    fiscal_year_week = any(v_min_week);
                v_min_week :=  v_fiscal_year_prior_weeks;
                RAISE NOTICE 'v_min_week: %', v_min_week;
            WHEN 'fiscal_year_month' = ANY (i.attr) THEN
                SELECT 
                 '{' || array_to_string(array_agg(DISTINCT fiscal_month_prior_weeks), ',') || '}' as fiscal_month_weeks
                INTO 
                    v_fiscal_year_month_prior_weeks
                FROM 
                   plan_smart.dim_time_with_prior_weeks
                WHERE 
                    fiscal_year_month_prior in (
                        SELECT fiscal_year_month_prior
                        FROM plan_smart.dim_time
                        WHERE fiscal_year_week = any(v_min_week)
                  );
                 v_min_week := v_fiscal_year_month_prior_weeks;
                RAISE NOTICE 'v_min_week: %', v_min_week;
            WHEN 'fiscal_year_quarter' = ANY (i.attr) THEN
                SELECT 
                  '{' || array_to_string(array_agg(DISTINCT fiscal_quarter_prior_weeks), ',') || '}' as fiscal_quarter_weeks
                INTO 
                    v_fiscal_year_quarter_prior_weeks
                FROM 
                    plan_smart.dim_time_with_prior_weeks
                WHERE 
                    fiscal_year_quarter_prior in (
                        SELECT fiscal_year_quarter_prior
                        FROM plan_smart.dim_time
                        WHERE fiscal_year_week = any(v_min_week)
                    );
                v_min_week :=  v_fiscal_year_quarter_prior_weeks;
            WHEN 'fiscal_year_season' = ANY (i.attr) THEN
                SELECT 
                 '{' || array_to_string(array_agg(DISTINCT fiscal_season_prior_weeks), ',') || '}' as fiscal_season_weeks
                INTO 
                    v_fiscal_year_season_prior_weeks
                FROM 
                    plan_smart.dim_time_with_prior_weeks
                WHERE 
                    fiscal_year_season_prior in (
                        SELECT fiscal_year_season_prior
                        FROM plan_smart.dim_time
                        WHERE fiscal_year_week = any(v_min_week)
                   );
                v_min_week :=  v_fiscal_year_season_prior_weeks;
            WHEN 'fiscal_year' = ANY (i.attr) THEN
                SELECT 
                '{' || array_to_string(array_agg(DISTINCT fiscal_year_prior_weeks), ',') || '}' as fiscal_year_weeks
               INTO 
                    v_fiscal_year_prior_weeks
                FROM 
                    plan_smart.dim_time_with_prior_weeks
                WHERE 
                    fiscal_year_prior in (
                        SELECT fiscal_year_prior
                        FROM plan_smart.dim_time
                        WHERE fiscal_year_week = any(v_min_week)
                );
                v_min_week :=  v_fiscal_year_prior_weeks;
        
        ELSE
                RAISE NOTICE 'No matching case for dimension: %', i.dim;
                v_min_week := '{}'; 
        END CASE;
               
                p_weeks := p_weeks || v_min_week;
               
                RAISE NOTICE 'p_weeks: %', p_weeks;
     
        END IF;
      
       RAISE NOTICE 'v_order_by_clause: %', v_order_by_clause;
      
        -- Check if the current dimension is 'product_hierarchy' and if it has attributes specified
        IF i.dim = 'product_hiearchy' AND cardinality(i.attr) IS NOT NULL THEN
            v_parition_clause := v_parition_clause || COALESCE(array_to_string(i.attr::text[], ','), '');
        END IF;
        RAISE NOTICE 'v_parition_clause: %', v_parition_clause;
        -- Check if the current dimension is 'channel' and if it has attributes specified
        IF i.dim = 'channel' AND cardinality(i.attr) IS NOT NULL THEN
            v_parition_clause := v_parition_clause || COALESCE(',' || array_to_string(i.attr::text[], ','), '');
         END IF;
    END LOOP;
       
    select 
      plan_table_text, 
      product_hierarchy_filter_level_id
    into
      v_table_name,
      v_level_id
    from 
      plan_smart.get_query_source(p_query_level, p_plan_status);
   
       
    select
        string_agg('kpi'||kpino, ',') as kpi_str
    into
        v_cols
    from
        generate_series(1,250) kpino;  
    
      
    if p_plan_status in (6,7)
    then
      v_table_name = '('||plan_smart.get_ly_query(
      v_cols,
      p_channels,
      p_product_filter,
      p_weeks,
      p_plan_status)||')';
   elsif p_plan_status in (11,12)
   then
      v_table_name = '('||plan_smart.get_itemsmart_version(
      p_channels,
      p_product_filter,
      p_weeks,
      p_plan_status)||')';
    end if;
   
    RAISE NOTICE 'v_table_name: %', v_table_name;
   
   
  if p_plan_status in (8, 10) 
  then
  
    SELECT 
      attribute_value 
    INTO 
      v_plan_id
    FROM 
      plan_smart.plan_attributes 
    WHERE 
      attribute_name = 'planid' AND plan_code = p_plan_code;
    
    v_table_name := '(' || plan_smart.get_iaf_query(p_plan_code) || ')';
  end if;
    
    if p_product_filter !='{}'
    then
      v_query_filter := "plan_smart".form_attribute_table_filters_v2('product_hierarchies', 'hierarchy_code', p_product_filter);
      RAISE NOTICE 'v_query_filter: %', v_query_filter;
      RAISE NOTICE 'v_level_id: %', v_level_id;
      v_phf_code_sql := 'SELECT string_agg(hierarchy_code::text, '','') FROM (' || v_query_filter || ' AND level = ' || v_level_id || ') phf';
      RAISE NOTICE 'v_phf_code_sql: %', v_phf_code_sql;
      EXECUTE v_phf_code_sql INTO v_hierarchy_code_list;
      
      RAISE NOTICE 'v_hierarchy_code_list: %', v_hierarchy_code_list;
     
      if v_hierarchy_code_list is null
      then
        raise exception USING HINT = 'Provided product filter yields no hierarchy codes';
        return $1;
      elsif v_hierarchy_code_list is not null
      then
         v_hierarchy_code_clause  :=  '
            and
              p.hierarchy_code = any(''{'||v_hierarchy_code_list||'}'')'; 
      end if;
      
    end if;
   
   
    if cardinality(p_channels) != 0
    then
       v_channels_clause:= '
        and
         p.channel = ANY(''{"' || array_to_string(p_channels, '","') || '"}'')';
    end if; 
   
    IF p_plan_status IN (2,3) 
    THEN 
        v_table_name := 
            '(SELECT
                p.hierarchy_code,
                p.current_week,
                p.class,
                p.channel,
                '|| v_kpi_str || '
              FROM 
                 ' || v_table_name || ' p
              LEFT JOIN 
                plan_smart.plan_modifications_' || p_plan_code || ' pm
              ON 
                pm.channel = p.channel
              AND 
                pm.class = p.class
              AND 
                pm.current_week = p.current_week
              AND 
                pm.hierarchy_code  = p.hierarchy_code
            )';    
    END IF;
    RAISE NOTICE 'v_query_source: %', v_query_source;
   
    v_group_by := TRIM(BOTH ',' FROM v_group_by);
   
    
IF v_plan_id IS NULL 
 then 
    v_query_combine := format('SELECT 
        *,
        sum_kpi32 AS written_sales_dollar,
        sum_kpi33 AS written_sales_units,
        sum_kpi42 AS delivered_net_sales,
        sum_kpi43 AS delivered_net_sales_units
       from 
      (
        SELECT
            %1s,
            %2s,
            sum(kpi32) as sum_kpi32,
            sum(kpi33) as sum_kpi33,
            sum(kpi42) as sum_kpi42,
            sum(kpi43) as sum_kpi43
        FROM 
            %3s p
            %4s
        WHERE 
            p.current_week = ANY(%5L)
            %7s
            %8s
        GROUP BY %9s) sub',
        v_group_by,
        p_formula_string,
        v_table_name,
        v_dim_join_text,
        p_weeks ,
        v_channels_clause,
        v_hierarchy_code_clause,
        v_group_by
    );
   
 if v_order_by_clause = ''  
 then
  v_query_combine := 'SELECT *,
                         0 AS written_sales_build_ratio,
                         0 AS written_sales_units_build_ratio,
                         0 AS delivered_net_sales_build_ratio,
                         0 AS delivered_net_sales_units_build_ratio
                    FROM (' || v_query_combine || ') sub';
                   
  else
  v_query_combine := 'SELECT *,
                            meta_schema.division(sum_kpi32, 
                            COALESCE(LAG(sum_kpi32) OVER (PARTITION BY ' || v_parition_clause || ' ORDER BY ' || v_order_by_clause || '), sum_kpi32)
                        ) 
                       AS written_sales_build_ratio,

                    
                       meta_schema.division(sum_kpi33, 
                            COALESCE(LAG(sum_kpi33) OVER (PARTITION BY ' || v_parition_clause || ' ORDER BY ' || v_order_by_clause || '), sum_kpi33)
                        )
                     AS written_sales_units_build_ratio,

                     meta_schema.division(sum_kpi42, 
                            COALESCE(LAG(sum_kpi42) OVER (PARTITION BY ' || v_parition_clause || ' ORDER BY ' || v_order_by_clause || '), sum_kpi42)
                        )
                     AS delivered_net_sales_build_ratio,

                    meta_schema.division(sum_kpi43, 
                            COALESCE(LAG(sum_kpi43) OVER (PARTITION BY ' || v_parition_clause || ' ORDER BY ' || v_order_by_clause || '), sum_kpi43)
                        )
                     AS delivered_net_sales_units_build_ratio

                    FROM (' || v_query_combine || ') sub';  
    end if;
   
   else
    v_query_combine := format('
     SELECT 
        *,
        sum_kpi32 AS written_sales_dollars,
        sum_kpi33 AS written_sales_units,
        sum_kpi42 AS delivered_net_sales,
        sum_kpi43 AS delivered_net_sales_units
from 
(
        SELECT
            %1s,
            %2s,
            sum(kpi32) as sum_kpi32,
            sum(kpi33) as sum_kpi33,
            sum(kpi42) as sum_kpi42,
            sum(kpi43) as sum_kpi43
        FROM 
            %3s p
            %4s
        WHERE 
            p.current_week  = ANY(%5L)
            AND plan_id = %6s::text
            %7s
            %8s
        GROUP BY %9s) sub',
        v_group_by,
        p_formula_string,
        v_table_name,
        v_dim_join_text,
        p_weeks,
        v_plan_id,
        v_channels_clause,
        v_hierarchy_code_clause,
        v_group_by
    );
   
 if v_order_by_clause = ''  
 then
  v_query_combine := 'SELECT *,
                         0 AS written_sales_build_ratio,
                         0 AS written_sales_units_build_ratio,
                         0 AS delivered_net_sales_build_ratio,
                         0 AS delivered_net_sales_units_build_ratio
                    FROM (' || v_query_combine || ') sub';
                   
  else
  v_query_combine := 'SELECT *,
                            meta_schema.division(sum_kpi32, 
                            COALESCE(LAG(sum_kpi32) OVER (PARTITION BY ' || v_parition_clause || ' ORDER BY ' || v_order_by_clause || '), sum_kpi32)
                        ) 
                       AS written_sales_build_ratio,

                    
                       meta_schema.division(sum_kpi33, 
                            COALESCE(LAG(sum_kpi33) OVER (PARTITION BY ' || v_parition_clause || ' ORDER BY ' || v_order_by_clause || '), sum_kpi33)
                        )
                     AS written_sales_units_build_ratio,

                     meta_schema.division(sum_kpi42, 
                            COALESCE(LAG(sum_kpi42) OVER (PARTITION BY ' || v_parition_clause || ' ORDER BY ' || v_order_by_clause || '), sum_kpi42)
                        )
                     AS delivered_net_sales_build_ratio,

                    meta_schema.division(sum_kpi43, 
                            COALESCE(LAG(sum_kpi43) OVER (PARTITION BY ' || v_parition_clause || ' ORDER BY ' || v_order_by_clause || '), sum_kpi43)
                        )
                     AS delivered_net_sales_units_build_ratio

                    FROM (' || v_query_combine || ') sub';  
  end if;
   END IF;
   RAISE NOTICE 'v_query_combine: %', v_query_combine;
   
   
    OPEN $1 FOR EXECUTE v_query_combine;
 
    RETURN $1;
END
$function$
;