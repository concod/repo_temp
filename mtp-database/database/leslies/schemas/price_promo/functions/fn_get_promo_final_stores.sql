--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_get_promo_final_stores runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for fn_get_promo_final_stores

DROP FUNCTION if exists price_promo.fn_get_promo_final_stores;

CREATE OR REPLACE FUNCTION price_promo.fn_get_promo_final_stores(_promo_id integer)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
declare
	_store_selection_type int;
	final_store_count int;
begin
	select store_selection_type into _store_selection_type from price_promo.promo_master where promo_id = _promo_id;
	if _store_selection_type = 1 then  -- all stores
		select count(store_code) into final_store_count from global.tb_store_master where is_active = 1;
	elsif _store_selection_type = 2 then  --bnm stores
		select count(store_code) into final_store_count from global.tb_store_master where is_active = 1 and s1_id IN (2);
	elsif _store_selection_type = 3 then  --ecom stores
		select count(store_code) into final_store_count from global.tb_store_master where is_active = 1 and s1_id IN (1);
	elsif _store_selection_type = 4 or _store_selection_type = 5 or _store_selection_type = 6 then  -- specific stores
		select count(*) into final_store_count from price_promo.promo_store where promo_id = _promo_id;
	elsif _store_selection_type = 7  then -- store group
		select count(distinct store_id) into final_store_count from global.tb_sg_store where sg_id in (select store_group_id from price_promo.tb_promo_store_groups where promo_id = _promo_id);
	end if;

	return final_store_count;
end;
$function$
;
