--liquibase formatted sql
--changeset konakandla.sujan@impactanalytics.co:email_reporting_allocation_deep_dive_list runOnChange:true stripComments:false splitStatements:false context:MTP-95887 labels:MTP-95887
--comment:MTP-95887,MTP-98417
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.email_reporting_allocation_deep_dive_list(refcursor, text);
CREATE OR REPLACE FUNCTION inventory_smart.email_reporting_allocation_deep_dive_list(input refcursor, channel text)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
   declare

      _query_combine_format text := '';
      _query_combine text := '';
      _formatter jsonb;
      _combine_formatter jsonb;
      _query_dt text := '';
      _query_dt_format text := '';
      today timestamptz := now()::timestamptz;
      _st timestamp;
      _et timestamp;
      _plan_codes text[];
     _plan_codes_str text := '';

   begin

      _query_dt_format := $$select
         (min(created_at)::date)::timestamp as _st, (max(created_at)::date)::timestamp + interval '23 hours 59 minutes' as _et, 
         array_agg(plan_code) as _plan_codes
      from
         inventory_smart.plan_master pm
      where
         (pm.updated_at between '{start_date}'::timestamptz and '{end_date}'::timestamptz)
         and status = 3
         and exists (
         select
            1
         from
            inventory_smart.plan_attributes
         where
            plan_code = pm.plan_code
            and attribute_name = 'parent_allocation')$$;

      _formatter = json_build_object(
               'start_date', timezone('US/Eastern', (now()::date - interval '1 day' + interval '17 hours' + interval '30 minutes')::timestamp), -- previous day 5 pm est
               'end_date', today 
           );

      _query_dt := inventory_smart.format_with_json(_query_dt_format , _formatter);
      raise notice ' %', _query_dt;

      execute _query_dt into _st, _et, _plan_codes;
     
     if _st is null or _et is null or cardinality(_plan_codes)=0 then 
     	_st:= now()::timestamptz;
     	_et:= now()::timestamptz;
     	_plan_codes_str := '{}';
     end if;
	  
     if cardinality(_plan_codes) > 0 then
     	_plan_codes_str := '{' || array_to_string(_plan_codes::varchar[], ',') || '}';
     END IF;
     	
     raise notice ' %', _plan_codes_str;
     	
      _query_combine_format := $$
               with allocation as materialized(
                 select 
                   allocation_code, 
                   article, 
                   store, 
                   pack_dc_allocation, 
                   retail_size_cd, 
                   pack_dc_allocation_original, 
                   max_supression_flag, 
                   oh_oo_intransit, 
                   max, 
                   min,
                   is_edited, 
                   min_influenced_allocation, 
                   unedited_min, 
                   unedited_max, 
                   auto_allocation_run_flag,
                   round(original_forecast) as original_forecast,
                   allocated_total,
                   inventory_source,
                   case
	                   when original_forecast > max then max
	                   when original_forecast < min then min
	                   else original_forecast
	               end as constrained_demand_initial
                 from 
                   inventory_smart.create_allocation_result_flat_gurobi 
                 where 
                   created_at between '{_st}'::timestamp 
                   and '{_et}'::timestamp 
                   and allocation_code = any('{_plan_codes}'::varchar[]) 
                   and allocated_total > 0
               ),
               product_status_mapping AS (
    				SELECT
    				    plan_code,
        				json_array_elements(pa.attribute_value::json)->>'product_code' AS product_code,
    					json_array_elements(pa.attribute_value::json)->>'status_tag' AS status_tag 
    				FROM inventory_smart.plan_attributes pa
    				WHERE pa.plan_code = any('{_plan_codes}'::varchar[])
    				AND pa.attribute_name = 'product_status_mapping'
			   ),
               paf1 as materialized (
                 select 
                   l0_id, 
                   l0_name, 
                   l1_id, 
                   l1_name, 
                   l2_id, 
                   l2_name, 
                   l3_id, 
                   l3_name, 
                   l4_id, 
                   l4_name, 
                   color_id_og, 
                   color_name_og, 
                   style_og, 
                   item_desc_og, 
                   style_color_id_og, 
                   size, 
                   size_name, 
                   pfs_season_id, 
                   pfs_season, 
                   dtc_season, 
                   article, 
                   product_code, 
                   vendor, 
                   brand, 
                   vendor_case_pack, 
                   upc, 
                   sku, 
                   supersede_flag
                 from 
                   global.product_attributes_filter
                 where
                    article in (
                    select 
                      distinct article 
                    from 
                      allocation
                   )
                   and (active and (not is_deleted))
               ), 
               allocation_filtered as (
                 select 
                   *, 
                   retail_size_cd size 
                 from 
                   allocation 
                 where 
                   article in (
                     select 
                       distinct article 
                     from 
                       paf1
                   ) 
                   and store in (
                     select 
                       store_code 
                     from 
                       global.store_attributes_filter 
                     where 
                       channel = {channel} 
                       )
               ) 
               , 
               flat1 as (
                 select 
                   allocation_code, 
                   article, 
                   store, 
                   js.key dc_code,
                   inventory_source,
                   unnest(
                     (
                       translate(
                         (
                           js.value::jsonb ->> 'packs_allocated'
                         )::text, 
                         '[]', 
                         '{}'
                       )
                     )::text[]
                   ) size, 
                   unnest(
                     (
                       translate(
                         (
                           js.value::jsonb ->> 'packs_allocated_qty'
                         )::text, 
                         '[]', 
                         '{}'
                       )
                     )::numeric[]
                   ) allocated_qty, 
                   unnest(
                     (
                       translate(
                         (
                           js.value::jsonb ->> 'packs_available_qty'
                         )::text, 
                         '[]', 
                         '{}'
                       )
                     )::numeric[]
                   ) available_qty, 
                   unnest(
                     (
                       translate(
                         (
                           ac.value::json ->> 'packs_allocated_qty'
                         )::text, 
                         '[]', 
                         '{}'
                       )
                     ):: numeric[]
                   ) allocated_total_orig 
                 from 
                   allocation_filtered, 
                   JSONB_EACH(pack_dc_allocation) js, 
                   JSONB_EACH(
                     coalesce(
                       pack_dc_allocation, pack_dc_allocation_original::jsonb
                     )
                   ) ac 
                 group by 
                   1, 
                   2, 
                   3, 
                   4, 
                   5, 
                   6, 
                   7, 
                   8,
                   9
               ) 
               , 
               flat2 as (
                 select 
                   * 
                 from 
                   flat1 
                 where 
                   (article, size) in (
                     select 
                       article, 
                       size 
                     from 
                       paf1
                   ) 
                   and (
                     allocation_code, article, size, store
                   ) in (
                     select 
                       allocation_code, 
                       article, 
                       size, 
                       store 
                     from 
                       allocation_filtered
                   ) 
               ) 
               , 
               flat as (
                 select 
                   flat2.*, 
                   max_supression_flag, 
                   oh_oo_intransit, 
                   max, 
                   min,
                   is_edited, 
                   min_influenced_allocation, 
                   unedited_min, 
                   unedited_max, 
                   auto_allocation_run_flag,
                   allocated_total,
                   original_forecast,
                   case when constrained_demand_initial - oh_oo_intransit < 0 then 0 else round(constrained_demand_initial - oh_oo_intransit) end as constrained_demand
                 from 
                   flat2 
                   left join allocation_filtered using(
                     allocation_code, article, store, size
                   )
               ) 
               , 
               store_priorities as (
                 select 
                   plan_code, 
                   article, 
                   dc_data.key store_code, 
                   (
                     json_each_text(dc_data.value :: json)
                   ).key as dc_code,
                   (
                     json_each_text(dc_data.value :: json)
                   ).value as priority_code 
                 from 
                   (
                     select 
                       plan_code, 
                       product_store_data.key as article, 
                       product_store_data.value :: json as store_code, 
                       product_store_data.value :: json as dc_data 
                     from 
                       inventory_smart.plan_attributes a, 
                       JSON_EACH_TEXT(
                         (a.attribute_value :: JSON)-> 'product_store_priorities'
                       ) as product_store_data 
                     where 
                       plan_code in (
                         select 
                           distinct allocation_code 
                         from 
                           allocation
                       ) 
                       and attribute_name = 'product_level_data'
                   ) dc, 
                   JSON_EACH_TEXT(dc_data) as dc_data
               ) 
               , 
               result as (
                 select 
                   um.name as updated_by, 
                   TO_CHAR(
                     case when (
                       extract(
                         month 
                         from 
                           pm.updated_at
                       ) between 3 
                       and 11 
                       and date_trunc(
                         'week', 
                         date_trunc(
                           'month', 
                           CONCAT(
                             extract(
                               year 
                               from 
                                 pm.updated_at
                             ), 
                             '-03-01'
                           ):: date
                         ) + interval '1 week' + interval '5 days'
                       )::date <= pm.updated_at 
                       and (
                         date_trunc(
                           'week', 
                           date_trunc(
                             'month', 
                             CONCAT(
                               extract(
                                 year 
                                 from 
                                   pm.updated_at
                               ), 
                               '-11-01'
                             ):: date
                           ) + interval '5 days'
                         ):: date - interval '1 day'
                       ) >= pm.updated_at
                     ) then (
                       pm.updated_at at TIME zone 'EST' + interval '1 hour'
                     ) else (pm.updated_at at TIME zone 'EST') end, 
                     'MM-DD-YYYY HH24:MI:SS'
                   ) as updated_at, 
                   pm.plan_code, 
                   l1_id, 
                   l1_name, 
                   l2_id, 
                   l2_name, 
                   l3_id, 
                   l3_name, 
                   l4_id, 
                   l4_name,
                   inventory_source,
                   vendor, 
                   color_id_og, 
                   color_name_og, 
                   style_og, 
                   item_desc_og, 
                   paf.article, 
                   style_color_id_og, 
                   ''''||paf.size||'''' as size, 
                   size_name, 
                   saf.retail_facility_code, 
                   saf.store_name, 
                   COALESCE(sp.priority_code, coalesce(pcc.priority_code, CASE WHEN saf.channel = 'RLS' THEN 'W' ELSE 'S' END)) priority_code,
                   COALESCE(dc.retail_facility_code, flat.dc_code::character varying) dc_code,
                   available_qty, 
                   --coalesce(current_available, 0) as current_available,
                   CASE WHEN flat.dc_code in ('8880', '8882', '8883', '8884', '8004')
                        THEN 0
                        ELSE available_qty - allocated_qty
                   END AS current_available, 
                   allocated_qty, 
                   paf.brand, 
                   CASE WHEN flat.dc_code in ('8880', '8882', '8883', '8884', '8004')
                        THEN 'Placeholder'
                        ELSE 'RESERVED'
                   END  AS merch_status_desc,
                   vendor_case_pack, 
                   pfs_season_id, 
                   pfs_season, 
                   dtc_season, 
                   max_supression_flag, 
                   oh_oo_intransit, 
                   max, 
                   min,
                   case when auto_allocation_run_flag = '2' then 'Auto' else 'Manual' end as allocation_type, 
                   allocated_total_orig, 
                   is_edited, 
                   min_influenced_allocation, 
                   paf.upc, 
                   paf.sku, 
                   ssd.wos_predicted, 
                   unedited_max, 
                   unedited_min, 
                   paf.supersede_flag,
                   original_forecast,
                   constrained_demand,
                   case 
	                   when constrained_demand > allocated_total then 'DC Inventory Constrained'
	                   else '-'
	               end as order_rejection_reason,
	               status_tag,
                   concat(
                     pm.plan_code, paf.article, paf.size, 
                     dc.retail_facility_code
                   ) key 
                 from 
                   flat 
                   left join inventory_smart.plan_master pm on pm.plan_code = flat.allocation_code 
                   left join paf1 paf on paf.article = flat.article 
                   and paf.size = flat.size
                   left join product_status_mapping psm on psm.plan_code=pm.plan_code and paf.product_code=psm.product_code
                   left join global.store_attributes_filter saf on saf.store_code = flat.store 
                   left join store_priorities sp on sp.plan_code = flat.allocation_code 
                   and sp.dc_code = flat.dc_code 
                   and sp.store_code = flat.store 
                   and sp.article = flat.article 
                   left join (
                     select 
                       product_code, 
                       sum(oh) current_available 
                     from 
                       inventory_smart.latest_inventory li 
                     where 
                       product_code in (
                         select 
                           product_code 
                         from 
                           paf1 
                         where 
                           article in (
                             select 
                               article 
                             from 
                               flat
                           )
                       ) 
                       and li.store_code in (
                         select 
                           linked_store_code 
                         from 
                           global.distribution_centres
                       ) 
                     group by 
                       1
                   ) au on au.product_code = paf.product_code 
                   left join (
                     select 
                       dc_code::text,
                       retail_facility_code 
                     from 
                       global.store_attributes_filter 
                     where 
                       dc_code::text in (
                         select 
                           dc_code 
                         from 
                           flat
                       )
                   ) dc on flat.dc_code = dc.dc_code
                   left join global.user_master um on (um.user_code = pm.updated_by) 
                   left join inventory_smart.store_stock_drilldown ssd on md5(
                     ssd.store_code || '-' || ssd.article || '-' || ssd.product_code
                   ) = (
                     saf.store_code || '-' || paf.article || '-' || paf.product_code
                   )
                   left join inventory_smart.priority_code_configuration pcc on pcc.article = flat.article and pcc.store_code = saf.store_code
                   ) 
               select *
               from 
                 result 
               where 
                 allocated_qty > 0;
           $$;

      _combine_formatter = json_build_object(
               '_st', _st,
               '_et', _et,
               '_plan_codes', _plan_codes_str,
               'channel',$2
           );  
      _query_combine := inventory_smart.format_with_json(_query_combine_format , _combine_formatter);
      raise notice ' %', _query_combine;
      open $1 for execute _query_combine;
      RETURN $1;
   end
$function$
;