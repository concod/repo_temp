--liquibase formatted sql
--changeset navya.modepalli:sync_dc_availability_report_flattened_v3 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-134003_
--comment: initial changeset for sync_dc_availability_report_flattened renaming columns
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_dc_availability_report_flattened();
CREATE OR REPLACE PROCEDURE public.sync_dc_availability_report_flattened()
 LANGUAGE plpgsql
AS $procedure$
	declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_dc_availability_report_flattened';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    TRUNCATE inventory_smart.dc_availability_report_flattened;

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
size_name,
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
pfs_year,
dtc_year,
pfs_season,
dtc_season,
rtl_zone_id,
store_comp_status_cd,
store_name,
color,
rtl_coordinate_group_desc,
active,
new_article,
old_article,
instock_pct,
instock_pct_details

    )

with base as (
	select product_code,dc_code,saf.channel 
	from inventory_smart.latest_inventory li
	join global.store_attributes_filter saf
	on  li.store_code = saf.store_code
	and  saf.special_classification ='WHS'
	where  li.oh >0
)
, dc_instock_percent as (

	select product_code, ssd.store_code,
	round(coalesce(instock_pct::NUMERIC, 0), 2) AS instock_pct,
	round(coalesce(instock_pct_details::NUMERIC, 0), 2) AS instock_pct_details
	from inventory_smart.store_stock_drilldown ssd 
	join global.store_attributes_filter saf
	on  ssd.store_code = saf.store_code
	and  saf.special_classification ='WHS'
	
),
store_oh as (

	select product_code,
	saf.channel,
	sum(coalesce (oh,0)) oh 
	from inventory_smart.latest_inventory li
	join global.store_attributes_filter saf
	on  li.store_code = saf.store_code
	and  saf.special_classification <>'WHS'
	group by 1,2
)
, paf as (
	select
	article,
	brand,
	color,
	dtc_season,
	pfs_season,
	dtc_year,
	pfs_year,
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
	model_description,
	product_code,
	product_description,
	rtl_coordinate_group_desc,
	pfs_season as season,
	size,
	size_name,
	source_code as source,
	style,
	style_color_id,
	supersede_flag,
	active
	from global.product_attributes_filter prd
)
, saf as (
	select
	store_code,
	channel,
	s3_name as state,
	s4_name as city,
	climate,
	country,
	dc_code,
	dc_name,
	district,
	region,
	rtl_zone_id,
	store_comp_status_cd,
	store_name
	from global.store_attributes_filter
)
,
sg as (
	select article,phf.channel,ARRAY_AGG(distinct sg_code) default_store_groups,STRING_AGG(DISTINCT name, ',') AS sg_name 
	from 
	(
  		select ph_code,channel,sg_code 
  		from inventory_smart.ph_configuration_mapping,unnest(default_store_groups_selected) sg_code
  	) phf
	join global.product_hierarchies_filter_flattened
	on hierarchy_code =ph_code
	and level=6
	join global.store_groups sg
	using(sg_code)
	where is_deleted = false
	group by 1,2
)
, pg as (
	select product_code,ARRAY_AGG(DISTINCT name) AS product_group 
	from global.product_groups_mapping
	join global.product_groups
	using(pg_code)
	WHERE is_deleted = false
	GROUP BY product_code
),

new_sup as (
	select  new_article article,STRING_AGG(distinct old_article,',') old_article 
	from inventory_smart.style_mapping_table 
	where effective_date <=current_date 
	group by 1
),

old_sup as (
	 select  old_article article ,STRING_AGG(distinct new_article,',') new_article 
	 from inventory_smart.style_mapping_table where effective_date <=current_date 
	 group by 1
)
select
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
	size_name,
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
	COALESCE(oh,0) oh,
	dc_code,
	dc_name,
	default_store_groups,
	sg_name,
	CONCAT(article, size, dc_name) as key,
	country,
	DENSE_RANK() OVER (partition by channel ORDER BY article,size,dc_code) AS seq_no,
	district,
	region,
	climate,
	state,
	city,
	product_group,
	pfs_year,
	dtc_year,
	pfs_season,
	dtc_season,
	rtl_zone_id,
	store_comp_status_cd,
	store_name,
	color,
	rtl_coordinate_group_desc,
	active,
	new_article,
	old_article,
	instock_pct,
	instock_pct_details
from  base
left join store_oh
using(product_code,channel)
left join paf
using(product_code)
left join saf  
using(dc_code,channel)
left join sg
using(article,channel)
left join pg
using(product_code)
left join old_sup
using(article)
left join new_sup
using(article)
left join dc_instock_percent
using(product_code,store_code);


		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END;
$procedure$
;