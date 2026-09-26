--liquibase formatted sql
--changeset liquibase:estimate_constraint_store_grade_list_download runOnChange:true stripComments:false splitStatements:false context:MTP-82691
--comment: MTP-82691
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.estimate_constraint_store_grade_list_download(input refcursor, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.estimate_constraint_store_grade_list_download(input refcursor, jsonb, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 	declare
 		_query_pa text := '';
 		_query_sa text := '';
 		_query_combine text := '';
		_channel text := inventory_smart.get_channel_from_input($3);
 		
 	begin
 		
 		_query_pa := inventory_smart.form_main_table_filters(
 		  'ph_master',
 		  $2
 		);
 		_query_sa := global.form_main_table_filters(
 		  'store_attributes_filter',
 		  $3
 		);
 	_query_combine := $$
 		
with ph_data as (
			  select 
			    *
			  from 
			    inventory_smart.ph_master
				$$||_query_pa||$$ and channel = '$$||_channel||$$'
			),
			product_master_filters_data AS (
			    SELECT
					product->>'product_code' as product_code,
					-- pmps.mapping_code,
					product->>'size' as size,
					product->>'order' as size_order,
				   	asg.store_code,
					paf.channel,
					paf.article,
					paf.l0_name,
					paf.l1_name,
                    paf.l3_name,
					paf.l4_name,
					paf.product_description,
					paf.model_description, 
					paf.style_color_id,
					paf.article_status_tag,
					paf.color,
					paf.brand,
					paf.supersede_flag,
					paf.l2_name
				FROM (select *, unnest(product_code_size_map) as product FROM ph_data) paf
			    join inventory_smart.article_store_grade asg TABLESAMPLE SYSTEM (1) using (ph_code)		
			)
--			select * from product_master_filters_data
			,
			constraint_data AS (
			    SELECT distinct
				   pmps.product_code,
				   pmps.size,
				   pmps.size_order,
				   pmps.channel,
					pmps.article,
					pmps.l0_name,
					pmps.l1_name,
					pmps.l2_name,
					pmps.l3_name,
					pmps.l4_name,
					pmps.article_status_tag,
					pmps.product_description,
					pmps.model_description, 
					pmps.style_color_id,
					pmps.color,
					pmps.brand,
					pmps.supersede_flag
			    FROM product_master_filters_data pmps
		)
		select count(*)*100 as total_count
		from
		constraint_data;
		$$;
	raise notice '_query_combine %', _query_combine;
	OPEN $1 FOR EXECUTE _query_combine;
	return $1;	
END;
$function$
;