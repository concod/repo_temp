--liquibase formatted sql
--changeset harsh.singh@impactanalytics.co:fn_save_event_final_stores runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial_function_create for fn_save_event_final_stores

DROP FUNCTION if exists price_promo.fn_save_event_final_stores;
CREATE OR REPLACE FUNCTION price_promo.fn_save_event_final_stores(_event_id integer)
 RETURNS void
 LANGUAGE plpgsql
 security definer
AS $function$
declare
	_store_selection_type text;
	final_store_count int;
	stores_query text;
begin
	select store_selection_type into _store_selection_type from price_promo.event_master where event_id = _event_id;

	execute format('CREATE TABLE if not exists price_promo.event_stores_%1$s PARTITION OF price_promo.event_stores FOR VALUES IN (%1$s);', _event_id);
	execute format('delete from price_promo.event_stores_%1$s', _event_id);

	-- all stores
	if _store_selection_type = 'all_stores' or _store_selection_type = '' or _store_selection_type is null   then  
		stores_query = format('
				insert into price_promo.event_stores (store_id, event_id)
				select distinct store_id, %1$s as event_id
				from price_promo.tb_store_hierarchy_mapping
				where is_active = 1
			', _event_id);
		raise notice 'stores query  --- %', stores_query;
		execute stores_query;
		
	--bnm stores
	elsif _store_selection_type = 'bnm_stores' then  

		stores_query = format('
				insert into price_promo.event_stores (store_id, event_id)
				select distinct store_id, %1$s as event_id
				from price_promo.tb_store_hierarchy_mapping
				where
					store_id in (select store_id from price_promo.tb_store_hierarchy_mapping where hierarchy_id in (select hierarchy_id from price_promo.event_store_hierarchy where event_id = %1$s))
					and is_active = 1
			', _event_id);

		raise notice 'stores query  --- %', stores_query;
		execute stores_query;

	--ecom stores
	elsif _store_selection_type = 'ecom_stores' then  

		stores_query = format('
				insert into price_promo.event_stores (store_id, event_id)
				select distinct store_id, %1$s as event_id
				from price_promo.tb_store_hierarchy_mapping
				where
					store_id in (select store_id from price_promo.tb_store_hierarchy_mapping where hierarchy_id in (select hierarchy_id from price_promo.event_store_hierarchy where event_id = %1$s))
					and is_active = 1
			', _event_id);

		raise notice 'stores query  --- %', stores_query;
		execute stores_query;

	 -- specific stores
	elsif _store_selection_type = 'specific_stores'then 
		
		stores_query = format('
				insert into price_promo.event_stores (store_id, event_id)
				select distinct store_id, %1$s as event_id
				from price_promo.tb_store_hierarchy_mapping
				where
					store_id in (select store_id from price_promo.included_event_stores where event_id = %1$s)
					and is_active = 1
			', _event_id);

		raise notice 'stores query  --- %', stores_query;
		execute stores_query;

	 -- store group
	elsif _store_selection_type = 'store_group'  then
		stores_query = format('
				insert into price_promo.event_stores (store_id, event_id)
				select distinct store_id, %1$s as event_id
				from price_promo.tb_store_hierarchy_mapping
				where
					store_id in (select distinct store_id from global.tb_sg_store where sg_id in (select store_group_id from price_promo.included_event_store_groups esg where event_id = %1$s))
					and is_active = 1
			', _event_id);
		raise notice 'stores query  --- %', stores_query;
		execute stores_query;

	end if;

	WITH stores_count_cte AS (
	    SELECT count(*) AS stores_count, event_id
	    FROM price_promo.event_stores 
	    WHERE event_id = _event_id
	    GROUP BY event_id
	)
	UPDATE price_promo.event_master em
	SET 
	    stores_count = COALESCE(scc.stores_count, 0)
	FROM stores_count_cte scc
	WHERE em.event_id = _event_id;

end;
$function$
;
