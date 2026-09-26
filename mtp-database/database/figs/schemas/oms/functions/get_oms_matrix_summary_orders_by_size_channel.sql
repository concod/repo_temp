--liquibase formatted sql
--changeset aman.pareek:get_oms_matrix_summary_orders_by_size_channel_add_params runOnChange:true stripComments:false splitStatements:false context:MTP-98098 labels:MTP-98098
--comment: added oms_kpi join for min_order_quantity_style kpi

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
   v_agg_cond_columns text:='';
   v_agg_cond_size text:='';
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

 v_recommended_orders_sql :=
 '  select
        '||v_agg_type||' as aggr_column '||v_agg_cond_columns||',product_description, json_object_agg('||v_agg_on||',jsonb_build_object(oq_key,order_quantity,oqo_key,order_quantity_original,kpi_key,kpi,flag_key,flag_value)) as fiscal_week
     from (
            select 
                    oor.'||v_agg_type||',oor.'||v_agg_on||' '||v_agg_cond||',paf.article as product_description, sum(oor.order_quantity) as order_quantity, ''order_quantity'' as oq_key, sum(oor.roq_constrained) as order_quantity_original,''order_quantity_original'' as oqo_key,''kpi'' as kpi_key,
                                        ''flag'' as flag_key,case when max(oor.order_status_id) =0 then 0  when min(oor.order_status_id) >0 then 2 else 1 end flag_value,
                    CASE
                         WHEN '''||kpi||'''  = ''raw_roq''   THEN sum(oor.raw_roq)  
                         WHEN '''||kpi||'''  = ''roq_unconstrained''    THEN sum(oor.roq_unconstrained) 
                         WHEN '''||kpi||'''  = ''elt_projected_safety_stock''    THEN sum(oor.elt_projected_safety_stock) 
                         WHEN '''||kpi||'''  = ''approved_orders''    THEN sum(COALESCE(ooam.order_quantity, 0)) 
                         WHEN '''||kpi||'''  = ''min_order_quantity_style'' and '''||v_agg_type||''' = ''article'' THEN min(omskpi.min_order_quantity_style)
                         WHEN '''||kpi||'''  = ''min_order_quantity_style'' and '''||v_agg_type||''' = ''size'' THEN min(oor.min_order_quantity_sku)
                         WHEN '''||kpi||'''  = ''min_order_quantity_style'' and '''||v_agg_type||''' = ''loc_code'' THEN min(oor.min_order_quantity_shipment)
                         ELSE  sum(omskpi.min_order_quantity_style)
                    END as kpi

            from
              inventory_smart.oms_orders_recommended oor
            inner join 
                (select * from "global".product_attributes_filter paf '||v_pa_sql||') paf
            on
              oor.product_code = paf.product_code
            left join 
            (select * from inventory_smart.oms_orders_approved ooa 
                inner join global.fiscal_date_mapping fdm 
                on ooa.order_placement_recom_date = fdm.calendar_date) ooam
                on 
                  oor.product_code = ooam.product_code and oor.loc_code = ooam.loc_code and oor.channel = ooam.channel and oor.vendor_code = ooam.vendor_code  and oor.fiscal_year_week = ooam.fiscal_year_week
            ' || CASE WHEN $4 = 'size' THEN '
            LEFT JOIN (
                SELECT product_code, size, MIN("order") AS "order"
                FROM inventory_smart.article_status_tag
                GROUP BY product_code, size
            ) ast
              ON ast.size = oor.size AND ast.product_code = oor.product_code' ELSE '' END || '
            left join inventory_smart.oms_kpi omskpi on omskpi.product_code = oor.product_code and omskpi.loc_code = oor.loc_code
            where
               oor.order_gen_type in (''Recommended'',''Scenario'', ''Edited'')
               '||v_agg_cond_size||'
             group by oor.'||v_agg_type||', oor.'||v_agg_on||' '||v_agg_cond||',paf.article,oor.min_order_quantity_style
             ) X 
group by '||v_agg_type||' '||v_agg_cond_columns||',product_description' || CASE WHEN $4 = 'size' THEN ', "order" order by "order"' ELSE '' END;
   
   raise notice 'v_recommended_orders_sql %',v_recommended_orders_sql;
   open input for execute v_recommended_orders_sql;
   RETURN input;
 end
 $function$
;
