--liquibase formatted sql
--changeset navya.modepalli@impactanalytics.co:new_and_optimised_report_renaming_columns runOnChange:true stripComments:false splitStatements:false context:Ralph_Lauren_InventorySmart MTP-134003
--comment: new_and_optimised_report_renaming_columns
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
			district,
			s2_id,
			s3_name,
			s4_name,
			season,
			rtl_zone_id,
			store_comp_status_cd,
			store_name,
			color,
			rtl_coordinate_group_desc, 
retail_region, 
year, 
forecasting_channel, 
product_group,
old_article, 
new_article, 
active
		) 
WITH paf AS MATERIALIZED (
  SELECT
      article,
      product_description,
      model_description,
      style_color_id,
      brand,
      size,
      size_name,
      style,
      l0_name, l1_name, l2_name, l3_name, l4_name,
      l0_id, l1_id, l2_id, l3_id, l4_id,
      product_code,
      supersede_flag,
      source_code,
      season,
      color,
      rtl_coordinate_group_desc,
      active,
      year
  FROM global.product_attributes_filter
),
saf AS MATERIALIZED (
  SELECT
      store_code,
      channel,
      country,
      special_classification,
      district,
      region,
      s3_name AS state,
      s4_name AS city,
      rtl_zone_id,
      store_comp_status_cd,
      store_name,
      retail_region,
      forecasting_channel
  FROM global.store_attributes_filter
  where active
),
store_on_hand AS (
  SELECT
       paf.product_code,
      saf.retail_region,
      SUM(li.oh) AS oh
  FROM inventory_smart.latest_inventory li
  JOIN saf
      ON li.store_code = saf.store_code
  JOIN paf
      ON li.product_code = paf.product_code
  JOIN global.product_mapping_product_store pmps
      ON pmps.product_code = li.product_code
     AND pmps.store_code = li.store_code
  WHERE saf.special_classification <> 'WHS'
    AND pmps.is_active = true
  GROUP BY 1,2
),
dc_on_hand_each AS (
  SELECT
      paf.article,
      paf.product_description,
      paf.model_description,
      paf.style_color_id,
      paf.brand,
      paf.size,
      paf.style,
      paf.l0_name, paf.l1_name, paf.l2_name, paf.l3_name, paf.l4_name,
      paf.l0_id, paf.l1_id, paf.l2_id, paf.l3_id, paf.l4_id,
      paf.product_code,
      paf.supersede_flag,
      paf.source_code,
      paf.season,
      paf.color,
      paf.rtl_coordinate_group_desc,
      paf.year,
      saf.channel,
      paf.active,
      dc.dc_code,
      dc.name AS dc_name,
      saf.retail_region ,
      saf.district,
	    saf.region,
	    saf.state,
	    saf.city,
	    saf.country,
	    saf.rtl_zone_id,
      saf.store_comp_status_cd,
      saf.store_name,
      saf.forecasting_channel
    
  FROM inventory_smart.latest_inventory li
  JOIN saf
      ON li.store_code = saf.store_code
  JOIN paf
      ON li.product_code = paf.product_code
  JOIN global.distribution_centres dc
      ON li.store_code = dc.linked_store_code
   where oh+oo+it > 0
),
store_on_hand_data AS (
  SELECT
      dce.*,
      soh.oh AS store_oh
  FROM dc_on_hand_each dce
  LEFT JOIN store_on_hand soh
     ON soh.product_code = dce.product_code
     AND soh.retail_region = dce.retail_region
),
article_sg_mapped AS (
SELECT
       pm.article,
       s.retail_region,
       pcm.default_store_groups,
       STRING_AGG(DISTINCT sg.name, ',') AS sg_name
   FROM inventory_smart.ph_configuration_mapping pcm
   JOIN inventory_smart.ph_master pm USING (ph_code, channel)
   CROSS JOIN UNNEST(pcm.default_store_groups) AS sg_code
   JOIN global.store_groups sg USING (sg_code)
   JOIN global.store_groups_mapping sgm USING (sg_code)
   JOIN saf s ON sgm.store_code = s.store_code
   WHERE sg.is_deleted = false
   GROUP BY 1, 2, 3
),
product_groups AS (
   SELECT
       product_code, 
       ARRAY_AGG(DISTINCT name) AS pg_name
   FROM (
       SELECT
           product_code,
           pg_code
       FROM global.product_groups_mapping
   ) p
   JOIN global.product_groups sg USING(pg_code)
   WHERE is_deleted = false
   GROUP BY product_code
),
sup1 as (
select new_article, STRING_AGG(DISTINCT old_article::varchar, ',') AS old_article
from inventory_smart.style_mapping_table
group by 1
),
sup2 as (
select old_article, STRING_AGG(DISTINCT new_article::varchar, ',')  as new_article
from inventory_smart.style_mapping_table
group by 1
)
SELECT
  fr.l0_name,
	fr.l1_name,
	fr.l2_name,
	fr.l3_name,
	fr.l4_name,
	fr.l0_id,
	fr.l1_id,
	fr.l2_id,
	fr.l3_id,
	fr.l4_id,
	fr.size,
	fr.source_code as source,
	fr.brand,
	fr.style_color_id,
	fr.product_description,
	fr.model_description,
	fr.article,
	fr.style,
	fr.channel,
	fr.product_code,
	fr.supersede_flag,
	COALESCE(fr.store_oh,0) as oh,
	fr.dc_code,
	fr.dc_name,
	asm.default_store_groups,
	asm.sg_name,
	CONCAT(fr.article, fr.size, fr.dc_name) AS key,
	fr.country, 
	fr.district,
	fr.region,
	fr.state,
	fr.city,
	fr.season,
	fr.rtl_zone_id,
	fr.store_comp_status_cd,
	fr.store_name,
	fr.color,
	fr.rtl_coordinate_group_desc,
	fr.retail_region,
	fr.year,
	fr.forecasting_channel,
	pg.pg_name as product_group,
   coalesce( sup1.old_article, fr.article) as old_article,
   coalesce( sup2.new_article, fr.article) as new_article,
	fr.active
	
FROM store_on_hand_data fr
LEFT JOIN article_sg_mapped asm
  ON fr.article = asm.article
 AND fr.retail_region = asm.retail_region
left join sup1 on sup1.new_article  = fr.article
left join sup2 on sup2.old_article  = fr.article
left join product_groups pg using (product_code); 
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
	end
$procedure$
;