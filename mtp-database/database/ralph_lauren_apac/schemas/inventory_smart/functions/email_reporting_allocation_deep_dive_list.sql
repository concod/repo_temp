--liquibase formatted sql
--changeset konakandla.sujan:email_reporting_allocation_deep_dive_list_v1 runOnChange:true stripComments:false splitStatements:false context:MTP-95887-1 labels:MTP-95887-1,MTP-115041,MTP-119750
--comment: MTP-95887-1,MTP-115041,MTP-119750
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
               'start_date', timezone('Asia/Hong_Kong', (now()::date - interval '1 day' + interval '16 hours')::timestamp), -- previous day 5:30 pm est
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
        with product_status_mapping AS (
    			SELECT
    			    plan_code,
        			json_array_elements(pa.attribute_value::json)->>'product_code' AS product_code,
    				json_array_elements(pa.attribute_value::json)->>'status_tag' AS status_tag
    			FROM inventory_smart.plan_attributes pa
    			WHERE pa.plan_code = any('{_plan_codes}'::varchar[])
    			AND pa.attribute_name = 'product_status_mapping'
			)
		    ,allocation as materialized(
            	select
                   allocation_code,
                   article,
                   store,
                   pack_dc_allocation,
                   allocated_total,
                   retail_size_cd,
                   pack_dc_allocation_original,
                   max_supression_flag,
                   oh_oo_intransit,
                   max,
                   min,
                   demand,
                   is_edited,
                   min_influenced_allocation,
                   unedited_min,
                   unedited_max,
                   auto_allocation_run_flag,
                   round(original_forecast) as original_forecast,
                   inventory_source,
                   case
	                   when original_forecast > max then max
	                   when original_forecast < min then min
	                   else original_forecast
	               end as constrained_demand_initial
                FROM inventory_smart.create_allocation_result_flat_gurobi
                where created_at between '{_st}'::timestamp and '{_et}'::timestamp
                and allocation_code = any('{_plan_codes}'::varchar[]) 
                and allocated_total > 0
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
                   season,
                   article,
                   product_code,
                   vendor,
                   brand,
                   vendor_case_pack,
                   upc,
                   sku,
                   model_description,
                   supersede_flag
                 from
                   global.product_attributes_filter
                   where article IN (SELECT distinct article FROM allocation)
                   and (active and (not is_deleted))
                   ORDER BY product_code
             ),
             allocation_filtered as MATERIALIZED(
             	select
             		*,
             		retail_size_cd size,
             		retail_size_cd pack_type_id
             	from
                allocation
                where article IN (SELECT distinct article FROM paf1)
             	and store in (select store_code from "global".store_attributes_filter saf where channel = {channel})
              )
              ,flat1_pack_dc_old as (
                 select
                   allocation_code,
                   article,
                   store,
                   js.key dc_code,
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
                   ) pack_type_id,
                   unnest(
                     (
                       translate(
                         (
                           js.value::json ->> 'packs_allocated_qty'
                         )::text,
                         '[]',
                         '{}'
                       )
                     ):: numeric[]
                   ) allocated_total_orig
                 from
                   allocation_filtered,
                   JSONB_EACH(
                     coalesce(
                      pack_dc_allocation_original::jsonb,pack_dc_allocation
                     )
                   ) js
                 group by
                   1,
                   2,
                   3,
                   4,
                   5,
                   6
               )
               ,flat1_pack_dc_new as (
                 select
                   allocation_code,
                   article,
                   store,
                   js.key dc_code,
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
                   ) pack_type_id,
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
                   ) available_qty
                 from
                   allocation_filtered,
                   JSONB_EACH(pack_dc_allocation) js
                 group by
                   1,
                   2,
                   3,
                   4,
                   5,
                   6,
                   7
               )
               ,flat1 as (
                select allocation_code,
                   article,
                   store,
                   dc_code,
                   inventory_source,
                   max_supression_flag, oh_oo_intransit, max, min, demand,
                   case when  allocated_qty::int = allocated_total_orig::int then false
                   else true end as is_edited,
                   min_influenced_allocation, unedited_min, unedited_max, auto_allocation_run_flag,
                   allocated_total_orig,
                   pack_type_id,
                   allocated_qty,
                   available_qty
                from flat1_pack_dc_new
                left join flat1_pack_dc_old using(allocation_code, article, pack_type_id, store, dc_code)
                left join allocation_filtered using(allocation_code, article, pack_type_id, store)

               )
               ,packs AS (
                SELECT allocation_code, article,
                       dc_code,
                       store,
                       max_supression_flag, oh_oo_intransit, max, min, demand, is_edited, min_influenced_allocation, unedited_min, unedited_max, auto_allocation_run_flag,
                       pack_type_id,
                       size,
                       inventory_source,
                       available_qty,
                       allocated_total_orig,
                       allocated_qty packs_allocated_qty,
                       allocated_qty * units_in_pack::double precision AS allocated_qty
                FROM inventory_smart.dc_pack_configuration dpc
                JOIN flat1 USING (article, pack_type_id)
            )
            ,packs_base as (
                SELECT allocation_code, article,
                       dc_code,
                       store,
                       max_supression_flag, oh_oo_intransit, max, min, demand, is_edited, min_influenced_allocation, unedited_min, unedited_max, auto_allocation_run_flag,
                       pack_type_id,
                       pack_type_id as size,
                       allocated_qty,
                       available_qty,
                       inventory_source,
                       0 as packs_allocated_qty,
                       0 as pack_units_allocated,
                       allocated_qty as loose_allocated_qty,
                       'E' as type,
                       allocated_total_orig
                FROM flat1
                WHERE NOT (pack_type_id IN ( SELECT pack_type_id FROM packs))
                UNION
                SELECT allocation_code, article,
                       dc_code,
                       store,
                       max_supression_flag, oh_oo_intransit, max, min, demand, is_edited, min_influenced_allocation, unedited_min, unedited_max, auto_allocation_run_flag,
                       pack_type_id,
                       size,
                       allocated_qty,
                       available_qty,
                       inventory_source,
                       packs_allocated_qty,
                       allocated_qty as pack_units_allocated,
                       0 as loose_allocated_qty,
                       'S' as type, allocated_total_orig
               FROM packs
            )
            ,flat2 AS MATERIALIZED (
                select *
                FROM packs_base
                WHERE (article, size) IN (SELECT article, size FROM paf1) AND (allocation_code,article, size, store) IN (SELECT allocation_code,article, size, store FROM allocation_filtered) and allocated_qty>0
            ),
               flat as (
                 select
                   flat2.*,
                   original_forecast,
                   allocated_total,
                   case when constrained_demand_initial - flat2.oh_oo_intransit < 0 then 0 else round(constrained_demand_initial - flat2.oh_oo_intransit) end as constrained_demand
                 from
                   flat2
                   left join allocation_filtered using(
                     allocation_code, article, store, size
                   )
               ),
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
               ),
               result as (
                   SELECT
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
                       pm.updated_at at TIME zone '$$ || inventory_smart.get_tenant_timezone() || $$' + interval '1 hour'
                     ) else (pm.updated_at at TIME zone '$$ || inventory_smart.get_tenant_timezone() || $$') end,
					 'MM-DD-YYYY HH24:MI:SS') AS updated_at,
                     pm.plan_code,
                     inventory_source,
                  	 l1_id,
                     l1_name,
                     l2_id,
                     l2_name,
                     l3_id,
                     l3_name,
                     l4_id,
                     l4_name,
                     vendor,
                     color_id_og,
                     color_name_og,
                     style_og,
                     item_desc_og,
                     paf.article,
                     style_color_id_og,
                     paf.size,
                     flat.pack_type_id,
                     flat.packs_allocated_qty,
                     flat.loose_allocated_qty,
                     size_name,
                     saf.retail_facility_code,
                   	 saf.store_name,
                   	 saf.currency_cd,
                     original_forecast,
                     constrained_demand,
                     case
	                     when constrained_demand > allocated_total then 'DC Inventory Constrained'
	                     else '-'
	                 end as order_rejection_reason,
                     COALESCE(sp.priority_code, coalesce(pcc.priority_code, '')) priority_code,
                     COALESCE(dc.retail_facility_code, flat.dc_code::character varying) dc_code,
                     available_qty,
                     COALESCE(current_available, 0) AS current_available,
                    COALESCE(au.oh_packs, 0) AS oh_packs,
                    COALESCE(au.oh_eaches, 0) AS oh_eaches,
                     CASE WHEN flat.dc_code in ('8880', '8882', '8883', '8884', '8004')
                        THEN 0
                        ELSE available_qty - allocated_qty
                     END  AS current_available,
                     allocated_qty,
                     paf.brand,
                     CASE WHEN flat.dc_code in ('8880', '8882', '8883', '8884', '8004')
                        THEN 'Placeholder'
                        ELSE 'RESERVED'
                     END  AS merch_status_desc,
                     vendor_case_pack,
                     (case when vendor_case_pack='NO INFO' then 1 else vendor_case_pack::int end) case_pack_qty,
                     season,
                     max_supression_flag,
                     coalesce(oh_oo_intransit, 0) as oh_oo_intransit,
                     coalesce(max, 0) as max,
                     coalesce(min, 0) as min,
                     demand,
                     allocated_total_orig,
                     is_edited,
                     min_influenced_allocation,
                     paf.upc,
                     paf.sku,
                     ssd.wos_predicted,
                     unedited_max,
                     unedited_min,
                     paf.model_description,
                     paf.supersede_flag,
                     status_tag,
                     to_char(plc.launch_date AT TIME ZONE '$$ || inventory_smart.get_tenant_timezone() || $$', ''MM-DD-YYYY'') as launch_date,
                     concat(pm.plan_code, paf.article, paf.size, dc.retail_facility_code) key
                     FROM flat
                     left JOIN inventory_smart.plan_master pm on pm.plan_code = flat.allocation_code
                     left join paf1 paf on paf.article = flat.article and paf.size = flat.size
                     left join product_status_mapping psm on psm.plan_code=pm.plan_code and paf.product_code=psm.product_code
                     left join global.store_attributes_filter saf on saf.store_code = flat.store
                     LEFT JOIN store_priorities sp on sp.plan_code = flat.allocation_code and sp.dc_code = flat.dc_code and sp.store_code = flat.store and sp.article = flat.article
                     LEFT JOIN (
                     	 SELECT product_code, sum(oh) current_available, sum(oh_packs) oh_packs, sum(oh_eaches) oh_eaches
                    	 FROM inventory_smart.sku_dc_available_units li
                    	 WHERE product_code IN (SELECT product_code FROM paf1 where article
                    	 IN (SELECT article FROM flat)
                    	 -- AND li.store_code IN (SELECT linked_store_code FROM global.distribution_centres)
                    	 )
                    	 GROUP BY 1
                    	 ) au on au.product_code = paf.product_code
                     LEFT JOIN (
                    	 SELECT dc_code::text, retail_facility_code
                    	 FROM global.store_attributes_filter
                    	 WHERE dc_code::text in (select dc_code from flat))dc on flat.dc_code = dc.dc_code
                     left join global.user_master um on (um.user_code = pm.updated_by)
                     left join inventory_smart.store_stock_drilldown ssd on md5(
                     ssd.store_code || '-' || ssd.article || '-' || ssd.product_code
                   	 ) = (
                     saf.store_code || '-' || paf.article || '-' || paf.product_code
                     )
                     left join inventory_smart.priority_code_configuration pcc on pcc.article = flat.article and pcc.store_code = saf.store_code
                     left join inventory_smart.product_life_cycle plc on plc.article = paf.article and plc.store_code = saf.store_code
                )
                select * from result where allocated_qty > 0
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