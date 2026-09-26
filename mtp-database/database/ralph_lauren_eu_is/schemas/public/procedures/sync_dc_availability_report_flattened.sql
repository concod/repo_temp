--liquibase formatted sql
--changeset navya.modepalli:sync_dc_availability_report_flattened_final_v1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0
--comment: initial changeset for sync_dc_availability_report_flattened_final_v1
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_dc_availability_report_flattened();
CREATE OR REPLACE PROCEDURE public.sync_dc_availability_report_flattened()
LANGUAGE plpgsql
SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_dc_availability_report_flattened';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		delete from
		  inventory_smart.dc_availability_report_flattened
		where
		  true;
		INSERT INTO inventory_smart.dc_availability_report_flattened (
			l0_name,
			l1_name,
			l2_name,
			l3_name,
			l4_name,
			l0_id,
			l1_id,
			l2_id,
			l3_id,
			l4_id,
			size,
			source,
			brand,
			style_color_id,
			product_description,
			model_description,
			article,
			style,
			channel,
			product_code,
			supersede_flag,
			oh,
			dc_code,
			dc_name,
			default_store_groups,
			sg_name,
			key,
			s1_name,
			seq_no,
			district,
			s2_id,
			climate,
			s3_name,
			s4_name,
			product_group,
			foe_year,
			season,
			rtl_zone_id,
			store_comp_status_cd,
			store_name,
			color,
			rtl_coordinate_group_desc,
			active,
			old_article,
			new_article
		)
		
with base
as
(
 select product_code, dc_code, saf.channel from inventory_smart.latest_inventory li
 join global.store_attributes_filter saf
   on li.store_code = saf.store_code
   and saf.special_classification ='WHS'
 where li.oh > 0
 union distinct
 select product_code, dc_code, channel from inventory_smart.dc_pack_inventory dpi
 where dpi.oh_pack_qty > 0
)
--select * from base
,
store_oh
as
(
 -- Scanning the inventory table once here for store stock
 select product_code, saf.channel, sum(coalesce(oh, 0)) oh
 from inventory_smart.latest_inventory li
 join global.store_attributes_filter saf
   on li.store_code = saf.store_code
   and saf.special_classification <> 'WHS'
 group by 1, 2
)
--select * from store_oh
,
sg
as
(
 -- Optimized to join only necessary keys
 select article, phf.channel, ARRAY_AGG(distinct sg_code) default_store_groups, STRING_AGG(DISTINCT name, ',') AS sg_name from
 (
   select ph_code, channel, sg_code from inventory_smart.ph_configuration_mapping, unnest(default_store_groups_selected) sg_code
 ) phf
 join global.product_hierarchies_filter_flattened
   on hierarchy_code = ph_code
   and level = 6
 join global.store_groups sg
   using(sg_code)
 where is_deleted = false
 group by 1, 2
)
--select * from sg
,
pg
as
(
 select product_code, ARRAY_AGG(DISTINCT name) AS product_group
 from global.product_groups_mapping
 join global.product_groups using(pg_code)
 where is_deleted = false
 group by product_code
)
--select * from pg
,
new_sup
as
(
 select new_article article, STRING_AGG(distinct old_article, ',') old_article
 from inventory_smart.style_mapping_table
 where effective_date <= current_date
 group by 1
)
--select * from new_sup
,
old_sup
as
(
 select old_article article, STRING_AGG(distinct new_article, ',') new_article
 from inventory_smart.style_mapping_table
 where effective_date <= current_date
 group by 1
)
-- Final Select: Joining attributes directly to the base to limit row processing
select
   paf.l0_name,
   paf.l1_name,
   paf.l2_name,
   paf.l3_name,
   paf.l4_name,
   paf.l0_id,
   paf.l1_id,
   paf.l2_id,
   paf.l3_id,
   paf.l4_id,
   paf.size,
   paf.source_code as source,
   paf.brand,
   paf.style_color_id,
   paf.product_description,
   paf.model_description,
   paf.article,
   paf.style,
   base.channel,
   base.product_code,
   paf.supersede_flag,
   COALESCE(store_oh.oh, 0) oh,
   base.dc_code,
   saf.dc_name,
   sg.default_store_groups,
   sg.sg_name,
   CONCAT(paf.article, paf.size, saf.dc_name) as key,
   saf.country,
   DENSE_RANK() OVER (partition by base.channel ORDER BY paf.article, paf.size, base.dc_code) AS seq_no,
   saf.district,
   saf.region,
   saf.climate,
   saf.s3_name as state,
   saf.s4_name as city,
   pg.product_group,
   paf.foe_year,
   paf.season,
   saf.rtl_zone_id,
   saf.store_comp_status_cd,
   saf.store_name,
   paf.color,
   paf.rtl_coordinate_group_desc,
   CASE WHEN paf.active = true THEN 'true' ELSE 'false' END active,
   new_sup.old_article,
   old_sup.new_article
from base
left join store_oh
   using(product_code, channel)
left join global.product_attributes_filter paf
   using(product_code)
  
left join global.store_attributes_filter saf
   on base.dc_code = saf.dc_code
   and base.channel = saf.channel
  
left join sg
   on paf.article = sg.article
   and base.channel = sg.channel
     
left join pg
   using(product_code)
  
left join old_sup
   on paf.article = old_sup.article
left join new_sup
   on paf.article = new_sup.article;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
           raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
	end
$procedure$;