--liquibase formatted sql
--changeset aman.pareek:get_oms_matrix_summary_orders_by_size_channel_add_params runOnChange:true stripComments:false splitStatements:false context:MTP-98098 labels:MTP-98098.
--comment: including edited in order gen type

DROP FUNCTION IF EXISTS inventory_smart.get_oms_matrix_summary_orders_by_size_channel(refcursor, jsonb, text, text, text, text, text, text, jsonb);
DROP FUNCTION IF EXISTS inventory_smart.get_oms_matrix_summary_orders_by_size_channel(refcursor, jsonb, text, text, text, text, text, text, jsonb, text, text);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_matrix_summary_orders_by_size_channel(input refcursor, product_filter jsonb, agg_level text, agg_type text, agg_value text, start_agg_id text, end_agg_id text, kpi text, jsonb, roq_date_option text DEFAULT NULL, distribution_method text DEFAULT NULL)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 /*
   Get orders from the inventory_smart.oms_orders_recommended as per product, ROP and order status and type filters 
   Grouping: First by size, then by channel for a selected size
   Parameters:
               $1: Refcursor
               $2: Product Filter
               $3: aggregation level
               $4: agg_type ('size' or 'channel')
               $5: agg_value (value for filtering)
               $6: start_agg_id
               $7: end_agg_id
               $8: kpi
               $9: extra jsonb
  */
 declare
 v_recommended_orders_sql text:= '';
   v_pa_sql                  text:='';
   v_agg_on  text:='';
   v_agg_type text:= '';
   v_agg_cond text:='';
   v_range            text:='';
   v_meta_cls                text:='';
   kpi_col text:='';
   groupby_additional_condition text:='';
   v_agg_cond_columns text:='';
   v_agg_cond_size text:='';
   v_join_clause text:='';
   v_kpi_calculation text:='';
   v_group_by_extra text:='';
 begin
   v_pa_sql :=inventory_smart.form_main_table_filters(
      'ph_master',
      product_filter
    );

    IF $4 = 'size' THEN
        v_agg_type := 'size';
        v_agg_cond := v_agg_cond || ', ast.order';
    END IF;

    IF $4 = 'channel' THEN
        v_agg_type := 'loc_code';
        v_agg_cond_size := 'and oor.size =''' || agg_value || ''' ';
    END IF;

   if agg_level  = 'W' then
     v_agg_on :='fiscal_year_week';
   end if;
   if agg_level  = 'M' then
     v_agg_on :='fiscal_year_month';
   end if;
   -- Conditional joins and KPI calculation based on KPI to optimize performance
   v_join_clause := '';
   
   -- Add oms_orders_approved join only for approved_orders and today_approved_order KPIs
   IF kpi IN ('approved_orders', 'today_approved_order') THEN
       v_join_clause := v_join_clause || '
           LEFT JOIN (
               SELECT * 
               FROM inventory_smart.oms_orders_approved ooa 
               INNER JOIN global.fiscal_date_mapping fdm 
                   ON ooa.order_placement_recom_date = fdm.calendar_date
           ) ooam
               ON oor.product_code = ooam.product_code 
               AND oor.loc_code = ooam.loc_code 
               AND oor.channel = ooam.channel 
               AND oor.vendor_code = ooam.vendor_code 
               AND oor.fiscal_year_week = ooam.fiscal_year_week';
   END IF;
   
   -- Add oms_po_master join only for on_order_recipts KPI
   IF kpi = 'on_order_recipts' THEN
       v_join_clause := v_join_clause || '
           LEFT JOIN inventory_smart.oms_po_master opm
               ON oor.product_code = opm.product_code 
               AND oor.loc_code = opm.loc_code 
               AND oor.channel = opm.channel 
               AND oor.fiscal_year_week = opm.fiscal_year_week
               AND opm.po_id != ''-''';
   END IF;
   
   -- Add oms_otb join only for otb and recipt_plan KPIs
   IF kpi IN ('otb', 'recipt_plan') THEN
       v_join_clause := v_join_clause || '
           LEFT JOIN inventory_smart.oms_otb ootb
               ON oor.product_code = ootb.product_code 
               AND oor.loc_code = ootb.loc_code 
               AND oor.channel = ootb.channel 
               AND oor.fiscal_year_week = ootb.fiscal_year_week';
   END IF;
   
   -- Set KPI calculation based on the specific KPI
   IF kpi = 'raw_roq' THEN
       v_kpi_calculation := 'sum(oor.raw_roq)';
   ELSIF kpi = 'roq_unconstrained' THEN
       v_kpi_calculation := 'sum(oor.roq_unconstrained)';
   ELSIF kpi = 'elt_projected_safety_stock' THEN
       v_kpi_calculation := 'sum(oor.elt_projected_safety_stock)';
   ELSIF kpi = 'approved_orders' THEN
       v_kpi_calculation := 'sum(COALESCE(ooam.order_quantity, 0))';
   ELSIF kpi = 'min_order_quantity_style' THEN
       IF v_agg_type = 'article' THEN
           v_kpi_calculation := 'min(oor.min_order_quantity_style)';
       ELSIF v_agg_type = 'size' THEN
           v_kpi_calculation := 'min(oor.min_order_quantity_sku)';
       ELSIF v_agg_type = 'loc_code' THEN
           v_kpi_calculation := 'min(oor.min_order_quantity_shipment)';
       END IF;
       v_group_by_extra := ', oor.min_order_quantity_style';
   ELSIF kpi = 'order_under_review' THEN
       v_kpi_calculation := 'sum(COALESCE(oor.order_quantity, 0)) FILTER (WHERE oor.order_status_id = -1)';
   ELSIF kpi = 'today_approved_order' THEN
       v_kpi_calculation := 'sum(COALESCE(oor.order_quantity, 0)) FILTER (WHERE oor.order_status_id = 3 AND date(oor.order_placement_date) = CURRENT_DATE AND oor.is_deleted = TRUE)';
   ELSIF kpi = 'pending_order' THEN
       v_kpi_calculation := 'sum(COALESCE(oor.order_quantity, 0)) FILTER (WHERE oor.order_status_id = 1)';
   ELSIF kpi = 'on_order_recipts' THEN
       v_kpi_calculation := 'sum(COALESCE(opm.oo::int + opm.it::int, 0))';
   ELSIF kpi = 'otb' THEN
       v_kpi_calculation := 'sum(COALESCE(ootb.otb, 0))';
   ELSIF kpi = 'recipt_plan' THEN
       v_kpi_calculation := 'sum(COALESCE(ootb.mfp_units, 0))';
   ELSE
       v_kpi_calculation := 'oor.min_order_quantity_style';
       v_group_by_extra := ', oor.min_order_quantity_style';
   END IF;

 v_recommended_orders_sql :=
 '  select
        '||v_agg_type||' as aggr_column '||v_agg_cond_columns||',product_description, json_object_agg('||v_agg_on||',jsonb_build_object(oq_key,order_quantity,oqo_key,order_quantity_original,kpi_key,kpi,flag_key,flag_value)) as fiscal_week
     from (
            select 
                    oor.'||v_agg_type||',oor.'||v_agg_on||' '||v_agg_cond||',paf.l4_name as product_description, sum(oor.order_quantity) as order_quantity, ''order_quantity'' as oq_key, sum(oor.roq_constrained) as order_quantity_original,''order_quantity_original'' as oqo_key,''kpi'' as kpi_key,
                                        ''flag'' as flag_key,case when max(oor.order_status_id) =0 then 0  when min(oor.order_status_id) >0 then 2 else 1 end flag_value,
                    ' || v_kpi_calculation || ' as kpi

            from
              inventory_smart.oms_orders_recommended oor
            inner join 
                (select * from "global".product_attributes_filter paf '||v_pa_sql||') paf
            on
              oor.product_code = paf.product_code
            ' || v_join_clause || '
            ' || CASE WHEN $4 = 'size' THEN 'left join inventory_smart.article_status_tag ast on ast.size = oor.size and ast.product_code = oor.product_code' ELSE '' END || '
            where
               oor.order_gen_type in (''Recommended'',''Scenario'', ''Edited'')
               '||v_agg_cond_size||'
             group by oor.'||v_agg_type||', oor.'||v_agg_on||' '||v_agg_cond||',paf.l4_name' || v_group_by_extra || '
             ) X 
group by '||v_agg_type||' '||v_agg_cond_columns||',product_description' || CASE WHEN $4 = 'size' THEN ', "order" order by "order"' ELSE '' END;
   
   raise notice 'v_recommended_orders_sql %',v_recommended_orders_sql;
   open input for execute v_recommended_orders_sql;
   RETURN input;
 end
 $function$
;
