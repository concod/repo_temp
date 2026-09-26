--liquibase formatted sql
--changeset liquibase:sync_season_attribute runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync_season_attribute
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_season_attribute();
CREATE OR REPLACE PROCEDURE public.sync_season_attribute()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
	declare 
		_product_code varchar;
	begin
		---Sync Season master
		begin
		insert into global.season_master (name,
		season_type,
		season_status,
		year,
		season_start_date,
		season_end_date)
		select distinct season, 'VB Season' season_type, false  as  season_status, 
		DATE_PART('year', season_start_date::date) as "year", season_start_date,season_end_date 
		from 
		public.productseason_validated_table a
		where not exists (select 'p' from  global.season_master sm
		where sm."name" =a.season
		);
		end;
	---- build partition
	
		call global.build_list_partitions('product_season_attributes');
	/*
		insert into global.product_season_attributes 
		(product_code,season_code,attribute_name,attribute_value)
select x.product_code, 
						x.season_code,
						x.attribute_name, 
                        case when 
                        gsm.generic_column_datatype = 'varchar[]' then 
                        array(select jsonb_array_elements_text(x.attribute_value::jsonb))::varchar else x.attribute_value
                        end as attribute_value
                        from (
                        select product_code, season_code,
                        j.key as attribute_name, 
                        j.value as attribute_value
                        from(
                        select 
                        product_code,
                        season_code,
                        to_jsonb(t) as j
                        from 
                        (select
					      sm.season_code,                  
						flex_season,
						ps_channel,
						cs_channel,
						"IA_Factory_Door_Count",
						"IA_Full_Line_Door_Count",
						"IA_Specialty_Door_Count",
						"Destination",
						"MFO_Rerun_Classification",
						"New_For_MFO",
						"Promo_SKU",
						"Retailer_Gift_YN",
						"Test_SKU",
						"Weeks_Of_Supply",
						"PLM_INTERNAL_SKU_SEASON_ID",
						"PLM_INTERNAL_SKUSIZETOSEASON_BRANCH_ID",
						"PLM_INTERNAL_PRODUCT_SEASON_ID",
						"PLM_INTERNAL_SEASON_ID",
						ps_sub_channel,
						cs_sub_channel,
						intellectual_property,
						initial_rc,
						channel,
						dropship_flag,
						season_l3_name,
						merchant_pyramid_colorway,
						merchant_pyramid,
						product_cost,
						wholesale_price,
						retailer_markup,
						direct_imu_target,
						indirect_imu_target,
						original_price,
						product_price,
						sku,
						product_code,
						selling_collection,
						season,
						company_code,
						imputed_flag,
						new_carryover_sku,
						new_carryover_style,
						sku_season_launch_date,
						style_season_launch_date,
						sku_dropped_date,
						style_dropped_date,
						after_nullcheck_rc,
						primary_duplicate_rank,
						duplicate_level_check_rc
					from
						public.productseason_validated_table a join 
						global.season_master sm 
						 on a.season = sm.name
						 and a.season_start_date =sm.season_start_date
						 and a.season_end_date =sm.season_end_date
						) t
                        ) x, jsonb_each_text(j) as j
                        where value is not null
                        and key not in('product_code','season_code')
                        ) x join global.productseason_generic_schema_mapping gsm
                        on x.attribute_name = gsm.generic_column_name  
                      where not exists (select 'p' from global.product_season_attributes b
			where x.product_code =b.product_code 
			and x.season_code =b.season_code 
			and x.attribute_name = b.attribute_name 
			);
	*/
	
		for _product_code in 
		select distinct product_code from 
			public.productseason_validated_table  a 
			where not exists (select 'p' from global.product_season_attributes b, global.season_master sm 
			where a.product_code =b.product_code 
			and b.season_code =sm.season_code 
			and a.season =sm."name" )
		Loop
		insert into global.product_season_attributes 
		(product_code,season_code,attribute_name,attribute_value)
		select x.product_code, 
						x.season_code,
						x.attribute_name, 
                        case when 
                        gsm.generic_column_datatype = 'varchar[]' then 
                        array(select jsonb_array_elements_text(x.attribute_value::jsonb))::varchar else x.attribute_value
                        end as attribute_value
                        from (
                        select product_code, season_code,
                        j.key as attribute_name, 
                        j.value as attribute_value
                        from(
                        select 
                        product_code,
                        season_code,
                        to_jsonb(t) as j
                        from 
                        (select
					      sm.season_code,                  
						flex_season,
						ps_channel,
						cs_channel,
						"IA_Factory_Door_Count",
						"IA_Full_Line_Door_Count",
						"IA_Specialty_Door_Count",
						"Destination",
						"MFO_Rerun_Classification",
						"New_For_MFO",
						"Promo_SKU",
						"Retailer_Gift_YN",
						"Test_SKU",
						"Weeks_Of_Supply",
						"PLM_INTERNAL_SKU_SEASON_ID",
						"PLM_INTERNAL_SKUSIZETOSEASON_BRANCH_ID",
						"PLM_INTERNAL_PRODUCT_SEASON_ID",
						"PLM_INTERNAL_SEASON_ID",
						ps_sub_channel,
						cs_sub_channel,
						intellectual_property,
						initial_rc,
						channel,
						dropship_flag,
						season_l3_name,
						merchant_pyramid_colorway,
						merchant_pyramid,
						product_cost,
						wholesale_price,
						retailer_markup,
						direct_imu_target,
						indirect_imu_target,
						original_price,
						product_price,
						sku,
						product_code,
						selling_collection,
						season,
						company_code,
						imputed_flag,
						new_carryover_sku,
						new_carryover_style,
						sku_season_launch_date,
						style_season_launch_date,
						sku_dropped_date,
						style_dropped_date,
						after_nullcheck_rc,
						primary_duplicate_rank,
						duplicate_level_check_rc
					from
						public.productseason_validated_table a join 
						global.season_master sm 
						 on a.season = sm.name
						 and a.season_start_date =sm.season_start_date
						 and a.season_end_date =sm.season_end_date
						) t
                        ) x, jsonb_each_text(j) as j
                        where value is not null
                        and key not in('product_code','season_code')
                        ) x join global.productseason_generic_schema_mapping gsm
                        on x.attribute_name = gsm.generic_column_name  
                     where 1=1
                      and product_code =_product_code  ON CONFLICT (product_code, season_code,attribute_name)
						do nothing                     
                      ;
                     
               commit ;
                     end loop;
                   call global.build_product_season_attributes_filter('');
               end
$procedure$
;
