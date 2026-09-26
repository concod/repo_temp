--liquibase formatted sql
--changeset archa.prakash@impactanalytics.co:get_kpis_change_for_pchi runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:drop
--comment: Implement Business Unit check while fetching product hierarchy codes
--rollback: SELECT 1
DROP FUNCTION IF EXISTS plan_smart.get_kpis(p_refcursor refcursor, p_plan_code integer, p_formula_string character varying, p_product_filter jsonb, p_weeks integer[], p_query_level integer,p_group_by text[], p_grouping_set boolean);
CREATE OR REPLACE FUNCTION plan_smart.get_kpis(p_refcursor refcursor, p_plan_code integer, p_plan_status integer, p_formula_string character varying, p_channels text[], p_product_filter jsonb, p_weeks integer[], p_query_level integer, p_group_by jsonb DEFAULT '{"time": [{"values": ["fiscal_year_week"]}]}'::jsonb, p_grouping_set boolean DEFAULT false)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$


/* API Call
select * from  plan_smart.get_kpis(
 	  'my_cur',
 	  179,
 	  0,
 	  'sum(kpi38) as wrtn_sales_build_ratio,sum(kpi38) as oo_units_ttl_placed,sum(kpi38) as turn_cost,sum(kpi38) as aoh_fwos_cost,sum(kpi38) as aoh_fwos_units,sum(kpi38) as aoh_cost,sum(kpi38) as aoh_units,sum(kpi38) as net_bop_auc,sum(kpi38) as dlvd_return_cost_per,sum(kpi38) as dlvd_rtrn_units_per,sum(kpi38) as dlvd_rtrn_retail_per,sum(kpi38) as dlvd_gmroi,sum(kpi38) as dlvd_margin,sum(kpi38) as dlvd_auc,sum(kpi38) as dlvd_cost,sum(kpi38) as dlvd_air,sum(kpi38) as dlvd_qty_build_ratio,sum(kpi38) as dlvd_sales_build_ratio,sum(kpi38) as dlvd_sales_adj_fctr,sum(kpi38) as fct_dlvd_cost,sum(kpi38) as wgt_age_non_dlvd_cost,sum(kpi38) as non_dlvd_cost,sum(kpi38) as fct_dlvd_qty,sum(kpi38) as wgt_age_non_dlvd_units,sum(kpi38) as non_dlvd_qty,sum(kpi38) as fct_dlvd_sales,sum(kpi38) as wgt_age_non_dlvd_sales,sum(kpi38) as non_dlvd_sales,sum(kpi38) as wrtn_cncl_cost_per,sum(kpi38) as wrtn_cncl_units_per,sum(kpi38) as wrtn_cncl_retail_per,sum(kpi38) as wrtn_cost,sum(kpi38) as wrtn_margin,sum(kpi38) as wrtn_auc,sum(kpi38) as wrtn_imu_per,sum(kpi38) as wrtn_air,sum(kpi38) as wrtn_qty_build_ratio,sum(kpi38) as wrtn_non_comp_sales,sum(kpi38) as wrtn_comp_sales,sum(kpi38) as wrtn_comp_spread_per',
 	  '{"Others","Hub","Store","Warehouse","Ecom"}'::text[],
 	  '{"l0_name": [{"type": "list", "operator": "in", "values": ["DECOR"]}], 
		"l1_name": [{"type": "list", "operator": "in", "values": ["1: ACCESSORY"]}], 
		"l2_name": [{"type": "list", "operator": "in", "values": ["657: ACC OD"]}]}'::jsonb,
 	  '{202301, 202302, 202303, 202304, 202305, 202306, 202307, 202308, 202309, 202310, 202311, 202312, 202313, 202314, 202315, 202316, 202317, 202318, 202319, 202320, 202321, 202322, 202323, 202324, 202325, 202326, 202327, 202328, 202329, 202330, 202331, 202332, 202333, 202334, 202335, 202336, 202337, 202338, 202339, 202340, 202341, 202342, 202343, 202344, 202345, 202346, 202347, 202348, 202349, 202350, 202351, 202352}',
 	  3, 
 	  '{"time": [{"values": ["current_week"]}], 
		"product_hiearchy": [{"values": ["l0_name", "l1_name", "l2_name", "channel"]}]}'::jsonb
	  );
FETCH ALL IN "my_cur";

*/

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
    v_plan_id         bigint;    
BEGIN
    -- Loop through each dimension specified in the group_by parameter
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

        -- Check if the current dimension is 'product_hierarchy' and if it has attributes specified
        IF i.dim = 'product_hiearchy' AND cardinality(i.attr) IS NOT NULL THEN
            -- Construct join and group by clauses for the 'product_hierarchy' dimension
            v_dim_join_text := v_dim_join_text ||
                               ' join plan_smart.product_hierarchies_filter phf
                                 on phf.hierarchy_code = p.hierarchy_code';
            v_group_by := v_group_by || COALESCE(',' || array_to_string(i.attr::text[], ','), '');
        END IF;
        
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

   
  
   
    SELECT plan_table_text, product_hierarchy_filter_level_id
    INTO v_table_name, v_level_id
    FROM plan_smart.get_query_source(p_query_level, p_plan_status);
   
   
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
                plan_smart.plan_modifications_' || p_plan_code || ' pm
              LEFT JOIN 
                ' || v_table_name || ' p
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
   
    
IF v_plan_id IS NULL THEN
   
    v_query_combine := format('
        SELECT
            %1s,
            %2s
        FROM 
            %3s p
            %4s
        WHERE 
            p.current_week = ANY(%5L)
            %7s
            %8s
        GROUP BY %9s',
        v_group_by,
        p_formula_string,
        v_table_name,
        v_dim_join_text,
        p_weeks,
        v_channels_clause,
        v_hierarchy_code_clause,
        v_group_by
    );
ELSE
    
    v_query_combine := format('
        SELECT
            %1s,
            %2s
        FROM 
            %3s p
            %4s
        WHERE 
            p.current_week = ANY(%5L)
            AND plan_id = %6s::text
            %7s
            %8s
        GROUP BY %9s',
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
END IF;

   RAISE NOTICE 'v_query_combine: %', v_query_combine;
   
   
    OPEN $1 FOR EXECUTE v_query_combine;
 
    RETURN $1;
END
$function$
;