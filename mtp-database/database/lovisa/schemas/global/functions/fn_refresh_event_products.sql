--liquibase formatted sql
--changeset liquibase:fn_refresh_event_products runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: new function fn_refresh_event_products
--rollback: SELECT 1
DROP FUNCTION if exists global.fn_refresh_event_products;
CREATE OR REPLACE FUNCTION global.fn_refresh_event_products(_event_id integer, _product_ids integer[] DEFAULT ARRAY[]::integer[])
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
declare

begin
	-- Delete Event Products.
	delete from price_promo.included_event_products pp where pp.event_id = _event_id;

	-- Insert New Pg Products.
	if array_length(_product_ids, 1) > 0 then
		execute format('create table if not exists price_promo.included_event_products_%1$s PARTITION OF price_promo.included_event_products FOR VALUES IN (%1$s)', _event_id);
		insert into price_promo.included_event_products(event_id, product_id)
		select 
			_event_id as event_id,
			product_id
		from 
			price_promo.product_master pm 
		where 
			pm.product_id = any(_product_ids);
	end if;
	

	return 1;
end;
$function$
;
