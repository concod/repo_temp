--liquibase formatted sql
--changeset fn_is_promo_conflicting_on_stores_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: fn_is_promo_conflicting_on_stores_create_1 for fn_is_promo_conflicting_on_stores_1

Drop function if exists base_pricing.fn_is_promo_conflicting_on_stores();

CREATE OR REPLACE FUNCTION base_pricing.fn_is_promo_conflicting_on_stores(_promo_id integer, _store_ids integer[])
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
declare 
	is_conflicted bool;
	_store_selection_type integer;
begin 
	-- Fetch current promo store_selection_type info.
	select 
		store_selection_type into _store_selection_type
	from 
		base_pricing.promo_master pm where pm.promo_id = _promo_id;
	if _store_selection_type = 1 then -- if the promo is all store selection.
		is_conflicted = true;
	else -- find conflict between two sets of stores.
		select 
			(case when count(ps.store_id) > 0 then true else false end) into is_conflicted
		from 
			base_pricing.promo_store ps 
		where 
			ps.promo_id = _promo_id
			and ps.store_id = any(_store_ids);
	end if;
	return is_conflicted;
end;
$function$
;
