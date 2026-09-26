--liquibase formatted sql
--changeset aman.pareek:get_oms_matrix_summary_orders_by_size_channel_update_8 runOnChange:true stripComments:false splitStatements:false context:MTP-120793_1 labels:MTP-137860
--comment: Added roq_date_option and distribution_method params to match API call

DROP FUNCTION IF EXISTS inventory_smart.get_oms_matrix_summary_orders_by_size_channel(refcursor, jsonb, text, text, text, text, text, text, jsonb);
DROP FUNCTION IF EXISTS inventory_smart.get_oms_matrix_summary_orders_by_size_channel(refcursor, jsonb, text, text, text, text, text, text, jsonb, text, text);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_matrix_summary_orders_by_size_channel(input refcursor, product_filter jsonb, agg_level text, agg_type text, agg_value text, start_agg_id text, end_agg_id text, kpi text, jsonb, roq_date_option text DEFAULT NULL, distribution_method text DEFAULT NULL)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$

 declare
 v_recommended_orders_sql text:= '';
   v_pa_sql                  text:='';
   v_agg_on  text:='';
   v_agg_type text:= '';
   v_agg_cond text:='';
   v_range            text:='';
   v_meta_cls                text:='';
   v_kpi_calculation text:='';
   v_group_by_extra text:='';
   v_agg_cond_columns text:='';
   v_agg_cond_size text:='';
   v_join_clause text:= '';
   v_loc_filter text := '';
   v_product_filter_for_pa jsonb;
   v_agg_src text := 'oor';
 begin
   IF jsonb_array_length((product_filter->'linked_store_codes')->0->'values') > 0 THEN
       SELECT ' AND linked_store_code = ANY(ARRAY[' || string_agg(quote_literal(elem::text), ',') || ']::text[])'
         INTO v_loc_filter
         FROM jsonb_array_elements_text((product_filter->'linked_store_codes')->0->'values') AS elem;
   END IF;
   v_product_filter_for_pa := product_filter - 'linked_store_codes';
   v_pa_sql :=inventory_smart.form_main_table_filters(
      'ph_master',
      v_product_filter_for_pa
    );
    v_pa_sql := REPLACE(v_pa_sql,'article','l4_name');

    IF $4 = 'size' THEN
        v_agg_type := 'size';
        v_agg_cond := v_agg_cond || ', ast.order';
    END IF;

    -- Scope size aggregation when aggregation_value is a loc_code
    IF $4 = 'size'
        AND agg_value IS NOT NULL
        AND agg_value <> ''
        AND NOT EXISTS (
                SELECT 1
                FROM "global".product_attributes_filter paf_chk
                WHERE paf_chk.l4_name = agg_value
        )
        THEN
            v_agg_cond_size := ' AND oor.loc_code = ''' || agg_value || ''' ';
    END IF;


    IF $4 = 'channel' THEN
        v_agg_type := 'name';
        v_agg_src := 'dc';
        v_agg_cond_size := 'and oor.size =''' || agg_value || ''' ';
    END IF;

   if agg_level  = 'W' then
     v_agg_on :='fiscal_year_week';
   end if;
   if agg_level  = 'M' then
     v_agg_on :='fiscal_year_month';
   end if;




    IF kpi = 'commited_orders' THEN
        v_join_clause := v_join_clause || '
            LEFT JOIN inventory_smart.oms_po_master opm
                ON oor.product_code = opm.product_code 
                AND oor.channel = opm.channel 
                AND oor.fiscal_year_week = opm.fiscal_year_week
                AND opm.po_id != ''-''';
    END IF;
   
   -- Build KPI calculation based on the specific KPI
   IF kpi = 'raw_roq' THEN
        v_kpi_calculation := 'sum(oor.raw_roq)';
    ELSIF kpi = 'roq_unconstrained' THEN
        v_kpi_calculation := 'sum(oor.roq_unconstrained)';
	ELSIF kpi = 'roq_constrained' THEN
        v_kpi_calculation := 'sum(oor.roq_constrained)';
	ELSIF kpi = 'ia_shipment_order_quantity' THEN
        v_kpi_calculation := 'sum(oor.ia_shipment_order_quantity)';
    ELSIF kpi = 'approved_orders' THEN
        v_kpi_calculation := 'sum(COALESCE(ooam.order_quantity, 0))';
    ELSIF kpi = 'safety_stock' THEN
        v_kpi_calculation := 'sum(omskpi.safety_stock)';
    ELSIF kpi = 'order_under_review' THEN
        v_kpi_calculation := 'sum(COALESCE(oor.order_quantity, 0)) FILTER (WHERE oor.order_status_id = -1)';
    ELSIF kpi = 'today_approved_orders' THEN
        v_kpi_calculation := 'sum(COALESCE(oor.order_quantity, 0)) FILTER (WHERE oor.order_status_id = 3 AND date(oor.created_at) = CURRENT_DATE)';
    ELSIF kpi = 'pending_order' THEN
        v_kpi_calculation := 'sum(COALESCE(oor.order_quantity, 0)) FILTER (WHERE oor.order_status_id = 1)';
    ELSIF kpi = 'commited_orders' THEN
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
                    '||v_agg_src||'.'||v_agg_type||',oor.'||v_agg_on||' '||v_agg_cond||',paf.style_name as product_description, sum(oor.order_quantity) as order_quantity, ''order_quantity'' as oq_key, sum(oor.roq_constrained) as order_quantity_original,''order_quantity_original'' as oqo_key,''kpi'' as kpi_key,
                                        ''flag'' as flag_key,case when max(oor.order_status_id) =0 then 0  when min(oor.order_status_id) >0 then 2 else 1 end flag_value,
                    ' || v_kpi_calculation || ' as kpi

            from
              inventory_smart.oms_orders_recommended oor
            inner join 
                (select distinct on(l4_name) * from "global".product_attributes_filter paf '||v_pa_sql||') paf
            on
              oor.product_code = paf.l4_name
            inner join (SELECT linked_store_code, name FROM global.distribution_centres WHERE is_active AND NOT is_deleted' || v_loc_filter || ') dc
              on oor.loc_code = dc.linked_store_code
            left join 
            (select * from inventory_smart.oms_orders_approved ooa 
                inner join global.fiscal_date_mapping fdm 
                on ooa.order_placement_recom_date = fdm.calendar_date) ooam
                on 
                  oor.product_code = ooam.product_code and oor.loc_code = ooam.loc_code and oor.channel = ooam.channel and oor.vendor_code = ooam.vendor_code  and oor.fiscal_year_week = ooam.fiscal_year_week
            ' || CASE WHEN kpi IN ('otb', 'recipt_plan') THEN '
            LEFT JOIN inventory_smart.oms_otb ootb
                on oor.product_code = ootb.product_code 
                and oor.loc_code = ootb.loc_code 
                and oor.channel = ootb.channel 
                and oor.fiscal_year_week = ootb.fiscal_year_week' ELSE '' END || '
            ' || CASE WHEN $4 = 'size' THEN '
            LEFT JOIN (
                SELECT product_code, size, MIN("order") AS "order"
                FROM inventory_smart.article_status_tag
                GROUP BY product_code, size
            ) ast
              ON ast.size = oor.size AND ast.product_code = oor.product_code' ELSE '' END || '
            ' || v_join_clause || '
            where
               oor.order_gen_type in (''Recommended'',''Scenario'', ''Edited'')
               '||v_agg_cond_size||'
             group by '||v_agg_src||'.'||v_agg_type||', oor.'||v_agg_on||' '||v_agg_cond||',paf.style_name'||v_group_by_extra||'
             ) X 
group by '||v_agg_type||' '||v_agg_cond_columns||',product_description' || CASE WHEN $4 = 'size' THEN ', "order" order by "order"' ELSE '' END;
   
   raise notice 'v_recommended_orders_sql %',v_recommended_orders_sql;
   open input for execute v_recommended_orders_sql;
   RETURN input;
 end
 $function$
;
