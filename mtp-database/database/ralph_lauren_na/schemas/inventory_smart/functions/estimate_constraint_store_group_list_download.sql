--liquibase formatted sql
--changeset liquibase:estimate_constraint_store_group_list_download runOnChange:true stripComments:false splitStatements:false context:MTP-56391
--comment: MTP-56391
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.estimate_constraint_store_group_list_download(input refcursor, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.estimate_constraint_store_group_list_download(input refcursor, jsonb, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 	declare
 		_query_pa text := '';
 		_query_sa text := '';
 		_l0_name text[] := inventory_smart.get_l0_name_from_input($2);
 		_query_combine text := '';
 		l0_name_updated text:= '';
 		
 	begin
 		
 		_query_pa := inventory_smart.form_main_table_filters(
 		  'ph_master',
 		  $2
 		);
 		_query_sa := global.form_main_table_filters(
 		  'store_attributes_filter',
 		  $3
 		);
 		
 	select 'any('''|| concat(_l0_name) ||'''::varchar[])' into l0_name_updated;
 	
 	_query_combine := $$
		with ph_data as (
			  select 
			    *
			  from 
			    inventory_smart.ph_master
				$$||_query_pa||$$
			),
			product_master_filters_data as (
	 			SELECT 
	 			  pmps.product_code, 
					pmps.mapping_code,
	 			  channel, 
	 			  paf.product_description,
				  paf.model_description, 
				  paf.style_color_id,
	 			  paf.style,
	 			  paf.color,
	 			  paf.article_status_tag,
	 			  product->>'size' as size,
				  product->>'order' as size_order,
	 			  paf.article,
	 			  paf.l0_name, 
	 			  paf.l1_name, 
				  paf.l2_name,
                  paf.l3_name,
	 			  paf.l4_name,
					paf.brand,
				  paf.supersede_flag
	 			FROM 
	 			  (
	 			    select 
	 			      *,
	 			      unnest(product_code_size_map) as product
	 			    from 
	 			      ph_data
	 			  ) paf 
	 			  join (select mapping_code, product_code, store_code from global.product_mapping_product_store pmps where l0_name = $$||l0_name_updated||$$) pmps on paf.product->>'product_code' = pmps.product_code
				  join (
 					      select *
 					      FROM 
 					        global.store_attributes_filter saf 
 					      	 $$||_query_sa||$$
 					    ) saf using(store_code, channel)  
	 		)
--			select * from product_master_filters_data
			,constraint_data as (
				select 
				  pmps.product_code, 
	 			  pmps.channel, 
	 			  pmps.product_description,
				  pmps.model_description, 
				  pmps.style_color_id,
	 			  pmps.style,
	 			  pmps.color,
	 			  pmps.article_status_tag,
	 			  pmps.size,
				  pmps.size_order,
	 			  pmps.article,
	 			  pmps.l0_name, 
	 			  pmps.l1_name, 
				  pmps.l2_name,
                  pmps.l3_name,  
	 			  pmps.l4_name,
				  pmps.brand,
				  pmps.supersede_flag
				FROM inventory_smart.constraint_master c TABLESAMPLE SYSTEM (1)
 			    join product_master_filters_data pmps using(mapping_code,l0_name)
				where c.l0_name = $$||l0_name_updated||$$
				and c.mapping_code is not null
				group by 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18
			)
		select
  			count(*)*100 as total_count
		from
  		constraint_data;
	$$;
	raise notice '_query_combine %', _query_combine;
	OPEN $1 FOR EXECUTE _query_combine;
	return $1;
 		
END;
$function$
;