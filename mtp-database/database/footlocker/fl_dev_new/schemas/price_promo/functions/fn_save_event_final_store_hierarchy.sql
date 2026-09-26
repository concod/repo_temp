--liquibase formatted sql
--changeset harsh.singh@impactanalytics.co:fn_save_event_final_store_hierarchy runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial_function_create for fn_save_event_final_store_hierarchy

DROP FUNCTION if exists price_promo.fn_save_event_final_store_hierarchy;
CREATE OR REPLACE FUNCTION price_promo.fn_save_event_final_store_hierarchy(_event_id integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
	_store_selection_type text;
	final_store_count int;
	stores_query text;
begin
	select store_selection_type into _store_selection_type from price_promo.event_master where event_id = _event_id;
	-- all stores
	if _store_selection_type = 'all_stores' or  _store_selection_type = '' or _store_selection_type is null then  
		stores_query = format('
					insert into price_promo.event_store_hierarchy (event_id, hierarchy_id)
					select %1$s as event_id, hierarchy_id from price_promo.tb_store_hierarchy_combination
				', _event_id);

		raise notice 'stores query  --- %', stores_query;
		execute stores_query;
		
	--bnm stores
	elsif _store_selection_type = 'bnm_stores' then  

		stores_query = format('
				insert into price_promo.event_store_hierarchy (hierarchy_id, event_id)
					select distinct hierarchy_id, %1$s as event_id from global.tb_store_master 
					where store_id in (select store_id from global.tb_store_master where is_active = 1 and s1_id in (2))
				', _event_id);

		raise notice 'stores query  --- %', stores_query;
		execute stores_query;

	--ecom stores
	elsif _store_selection_type = 'ecom_stores' then  

		stores_query = format('
				insert into price_promo.event_store_hierarchy (hierarchy_id, event_id)
					select distinct hierarchy_id, %1$s as event_id from global.tb_store_master 
					where store_id in (select store_id from global.tb_store_master where is_active = 1 and s1_id in (1))
				', _event_id);

		raise notice 'stores query  --- %', stores_query;
		execute stores_query;

	 -- specific stores
	elsif _store_selection_type = 'specific_stores'then 
		
		stores_query = format('
				insert into price_promo.event_store_hierarchy (hierarchy_id, event_id)
					select distinct hierarchy_id, %1$s as event_id from global.tb_store_master 
					where store_id in (select store_id from price_promo.included_event_stores where event_id = %1$s)
				', _event_id);

		raise notice 'stores query  --- %', stores_query;
		execute stores_query;

	 -- store group
	elsif _store_selection_type = 'store_group'  then
		stores_query = format('
				insert into price_promo.event_store_hierarchy (hierarchy_id, event_id)
					select distinct hierarchy_id, %1$s as event_id from  global.tb_store_master where
					store_id in (select distinct store_id from pricesmart.tb_sg_store where sg_id in (select store_group_id from price_promo.included_event_store_groups esg where event_id = %1$s))
				', _event_id);
		raise notice 'stores query  --- %', stores_query;
		execute stores_query;

	end if;

end;
$function$
;
