--liquibase formatted sql
--changeset konakandla.sujan@impactanalytics.co:email_reporting_allocation_deep_dive_wtd runOnChange:true stripComments:false splitStatements:false context:MTP-95887 labels:MTP-95887
--comment:MTP-95887,MTP-98417
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.email_reporting_allocation_deep_dive_wtd(refcursor, text);
CREATE OR REPLACE FUNCTION inventory_smart.email_reporting_allocation_deep_dive_wtd(input refcursor, channel text)
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
      		   'start_date', timezone('US/Eastern', ((now()::date - (extract(dow FROM now())::int) - 1) + interval '17 hours')::timestamp),
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
                   pack_dc_allocation_original 
                 from 
                   inventory_smart.create_allocation_result_flat_gurobi 
                 where 
                   created_at between '{_st}'::timestamp 
                   and '{_et}'::timestamp 
                   and allocation_code = any('{_plan_codes}'::varchar[]) 
                   and allocated_total > 0
               )
               , 
               paf1 as materialized (
                 select 
                   l0_name, 
                   l1_name, 
                   l2_name, 
                   l3_name, 
                   l4_name, 
                   color_id_og, 
                   color_name_og, 
                   style_og, 
                   item_desc_og, 
                   style_color_id_og, 
                   size, 
                   size_name, 
                   article, 
                   product_code, 
                   vendor, 
                   brand, 
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
                   js.key::text dc_code, 
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
                   8
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
--                   flat2.*, 
                   allocation_code, 
                   article, 
                   store,
                   size,
                   dc_code,
                   sum(allocated_qty) as total_allocated_qty 
                 from 
                   flat2 
                   left join allocation_filtered using(
                     allocation_code, article, store, size
                   )
                   group by 1,2,3,4,5
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
                   paf.l0_name,
                   l1_name, 
                   l2_name, 
                   l3_name, 
                   l4_name,
                   vendor,
                   style_og,
                   color_id_og,
                   paf.article,
                   paf.brand,
                   dc.retail_facility_code dc_code,
                   saf.retail_facility_code,
                   coalesce(
                     sp.priority_code, case when saf.channel = 'RLS' then 'W' else 'S' end
                   ) priority_code,
                   um.name as updated_by,
                   sum(total_allocated_qty) as total_allocated_qty 
                 from 
                   flat 
                   left join inventory_smart.plan_master pm on pm.plan_code = flat.allocation_code 
                   left join paf1 paf on paf.article = flat.article 
                   and paf.size = flat.size 
                   left join global.store_attributes_filter saf on saf.store_code = flat.store 
                   left join store_priorities sp on sp.plan_code = flat.allocation_code 
                   and sp.dc_code = flat.dc_code 
                   and sp.store_code = flat.store 
                   and sp.article = flat.article 
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
                    group by 1,2,3,4,5,6,7,8,9,10,11,12,13,14
                   ) 
               select *
               from 
                 result 
               where 
                 total_allocated_qty > 0;
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