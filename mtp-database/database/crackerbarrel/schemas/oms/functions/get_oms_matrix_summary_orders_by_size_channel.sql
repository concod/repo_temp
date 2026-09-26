    

--liquibase formatted sql
--changeset charan.reddy:extensions_update_size_channel_grouping_update17 runOnChange:true stripComments:false splitStatements:false context:MTP-74127 labels:feature size-channel grouping
--comment: take distinct for raw_roq and roq_unconstrained

DROP FUNCTION IF EXISTS inventory_smart.get_oms_matrix_summary_orders_by_size_channel(refcursor, jsonb, text, text, text, text, text, text, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_matrix_summary_orders_by_size_channel(input refcursor, product_filter jsonb, agg_level text, agg_type text, agg_value text, start_agg_id text, end_agg_id text, kpi text, jsonb)
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
        v_agg_cond_size := 'and oor.article =''' || agg_value || ''' ';
    END IF;

    IF $4 = 'pack' THEN
        v_agg_type := 'pack_id';
        v_agg_cond := v_agg_cond;
    END IF;

   if agg_level  = 'W' then
     v_agg_on :='fiscal_year_week';
   end if;
   if agg_level  = 'M' then
     v_agg_on :='fiscal_year_month';
   end if;
   if kpi  = 'raw_roq' then
     kpi_col :='raw_roq';
   end if;
   if kpi  = 'roq_unconstrained' then
     kpi_col :='roq_unconstrained';
   end if;
   if kpi  = 'elt_projected_safety_stock' then
     kpi_col :='elt_projected_safety_stock';
   end if;
   if kpi = 'min_order_quantity_style' then
    kpi_col := 'min_order_quantity_style';
    groupby_additional_condition := ',oor.min_order_quantity_style';
   end if;

 v_recommended_orders_sql :=
 '  select
        '||v_agg_type||' as aggr_column '||v_agg_cond_columns||',product_description, json_object_agg('||v_agg_on||',
            jsonb_build_object(
            oq_key,aggregated_order_quantity,
            oqo_key,order_quantity_original,
            oqe_key, aggregated_order_quantity_eaches,
            kpi_key,kpi,
            flag_key,flag_value)) as fiscal_week
     from (
            select 
                    oor.'||v_agg_type||',oor.'||v_agg_on||' '||v_agg_cond||',
                    paf.product_description, 
                    CASE
                        WHEN max(oor.pack_id) IS NOT NULL AND max(oor.pack_id) != ''WP'' THEN
                            SUM(DISTINCT oor.order_quantity)
                        ELSE
                            SUM(oor.order_quantity)
                    END AS aggregated_order_quantity,
                    
                    CASE
                        WHEN max(oor.pack_id) IS NOT NULL THEN
                            SUM(oor.order_quantity_eaches)
                        ELSE
                            SUM(oor.order_quantity)
                    END AS aggregated_order_quantity_eaches,

                    min(oor.order_quantity) as min_order_status_id,
                    ''order_quantity'' as oq_key, 
                    ''order_quantity_eaches'' as oqe_key, 
                    sum(distinct oor.roq_constrained) as order_quantity_original,
                    ''order_quantity_original'' as oqo_key,
                    ''kpi'' as kpi_key,
                    ''flag'' as flag_key,case when max(oor.order_status_id) =0 then 0  
                    when min(oor.order_status_id) >0 then 2 else 1 end flag_value,
                    CASE
                         WHEN '''||kpi||'''  = ''raw_roq'' THEN 
                            CASE 
                                WHEN max(oor.pack_id) IS NOT NULL AND max(oor.pack_id) != ''WP'' THEN sum(DISTINCT oor.raw_roq)
                                ELSE sum(oor.raw_roq)
                            END
                         WHEN '''||kpi||'''  = ''roq_unconstrained''    THEN MAX(oor.roq_unconstrained) 
                         WHEN '''||kpi||'''  = ''safety_stock''    THEN sum(COALESCE(oor.elt_projected_safety_stock, 0)) 
                         WHEN '''||kpi||'''  = ''order_quantity''    THEN 
                            CASE
                                    WHEN max(oor.pack_id) IS NOT NULL AND max(oor.pack_id) != ''WP'' THEN
                                        SUM(DISTINCT oor.order_quantity) FILTER (WHERE oor.order_status_id = 3)
                                    ELSE
                                        SUM(oor.order_quantity) FILTER (WHERE oor.order_status_id = 3)
                            END
                         WHEN '''||kpi||'''  = ''min_order_quantity_style'' and '''||v_agg_type||''' = ''article'' THEN AVG(oor.min_order_quantity_sku)
                         WHEN '''||kpi||'''  = ''min_order_quantity_style'' and '''||v_agg_type||''' = ''size'' THEN AVG(oor.min_order_quantity_sku)
                         WHEN '''||kpi||'''  = ''min_order_quantity_style'' and '''||v_agg_type||''' = ''loc_code'' THEN AVG(oor.min_order_quantity_sku)
                         ELSE  AVG(oor.min_order_quantity_sku)
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
            ' || CASE WHEN $4 = 'size' THEN 'left join inventory_smart.article_status_tag ast on ast.size = oor.size and ast.product_code = oor.product_code' ELSE '' END || '
            where
               oor.order_gen_type in (''Recommended'',''Scenario'', ''Edited'')
               '||v_agg_cond_size||'
               AND oor.fiscal_year_week BETWEEN ' || start_agg_id || ' AND ' || end_agg_id || '
             group by oor.'||v_agg_type||', oor.'||v_agg_on||' '||v_agg_cond||',paf.product_description,oor.min_order_quantity_sku
             ) X 
group by '||v_agg_type||' '||v_agg_cond_columns||',product_description' || CASE WHEN $4 = 'size' THEN ', "order" order by "order"' ELSE '' END;
   
   raise notice 'v_recommended_orders_sql %',v_recommended_orders_sql;
   open input for execute v_recommended_orders_sql;
   RETURN input;
 end
 $function$
;