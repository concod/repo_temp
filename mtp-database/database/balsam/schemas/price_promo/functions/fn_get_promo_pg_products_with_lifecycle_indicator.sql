--liquibase formatted sql
--changeset fn_get_promo_pg_products_with_lifecycle_indicator_2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: fn_get_promo_pg_products_with_lifecycle_indicator_change_2 for fn_get_promo_pg_products_with_lifecycle_indicator_2

Drop function if exists price_promo.fn_get_promo_pg_products_with_lifecycle_indicator();

CREATE OR REPLACE FUNCTION price_promo.fn_get_promo_pg_products_with_lifecycle_indicator(_promo_id integer, _product_selection_type integer)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
declare 
	idx integer;
	_pg_id integer;
	_pg_ids integer[];
	temp_products_query text;
	pg_products_union_query text;
	final_query text;
begin 
	if _product_selection_type = 1 then 
		return '';
	elseif _product_selection_type = any(array[3, 7]) then -- 3 and 7 are whole/specific prodcut group selection.
		temp_products_query = 'select 
									tpp.product_id,
									tplm.lifecycle_indicator_id 
								from 
									global.tb_pg_product tpp 
								left join 
									global.tb_parent_lifecycle_mapping tplm on tpp.product_id = tplm.product_id 
								where 
									tpp.pg_id = %1$L
									and tplm.lifecycle_indicator_id = any(coalesce((select mphad.lifecycle_indicator_ids from price_markdown.mvw_pg_hierarchy_agg_data mphad where mphad.pg_id = %1$L), (select array_agg(tlic.id) from global.tb_lifecycle_indicator_config tlic )))
								';
		select 
			array_agg(tppg.product_group_id) into _pg_ids
		from 
			price_promo.tb_promo_product_groups tppg 
		where 
			tppg.promo_id = _promo_id;
		
	    FOR idx IN array_lower(_pg_ids, 1)..array_upper(_pg_ids, 1) LOOP
	        _pg_id = _pg_ids[idx];
		    if idx = 1 then 
	       		pg_products_union_query = format(temp_products_query, _pg_id);
	       	else 
	       		pg_products_union_query = pg_products_union_query || ' union ' || format(temp_products_query, _pg_id);
	       	end if;
	    END LOOP;
	   	final_query = format('	select 
									dd.product_id, 
									dd.lifecycle_indicator_id 
								from ( 
										%1$s 
								)dd 
							 ', pg_products_union_query); 
	else
		final_query = format('	select 
									dd.product_id, 
									dd.lifecycle_indicator_id 
								from ( 
										select 
											pp.product_id,
											tplm.lifecycle_indicator_id 
										from 
											price_promo.promo_product pp
										left join
											global.tb_parent_lifecycle_mapping tplm on pp.product_id  = tplm.product_id 
										where 
											pp.promo_id = %1$L
											and tplm.lifecycle_indicator_id = any(coalesce((select array_agg(pph.hierarchy_value_id) from price_promo.included_product_hierarchy pph where pph.promo_id = %1$L and pph.hierarchy_level_id = -2), (select array_agg(tlic.id) from global.tb_lifecycle_indicator_config tlic ))) 
								)dd 
							 ', _promo_id); 
	end if;
	-- raise notice 'final_query : % ', final_query;
	return final_query;
end;
$function$
;
