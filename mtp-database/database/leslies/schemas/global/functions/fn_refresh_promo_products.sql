--liquibase formatted sql
--changeset liquibase:fn_refresh_promo_products_4 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: commented product count update

DROP FUNCTION if exists global.fn_refresh_promo_products;
CREATE OR REPLACE FUNCTION global.fn_refresh_promo_products(_promo_id integer, _product_ids integer[] DEFAULT ARRAY[]::integer[])
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
declare

begin
	-- Delete Promo Products.
--	delete from price_promo.promo_product pp where pp.promo_id = _promo_id;
	delete from price_promo.included_products pp where pp.promo_id = _promo_id;

	-- Insert New Pg Products.
	if array_length(_product_ids, 1) > 0 then
		execute format('create table if not exists price_promo.included_products_%1$s PARTITION OF price_promo.included_products FOR VALUES IN (%1$s)', _promo_id);
		insert into price_promo.included_products(promo_id, product_id, product_name)
		select
			_promo_id as promo_id,
			product_id,
			product_name
		from
			price_promo.product_master pm
		where
			pm.product_id = any(_product_ids);
	end if;

	-- Update New Pg Products Count.
	-- update price_promo.promo_master set products_count = (select count(distinct product_id) from price_promo.included_products where promo_id = _promo_id)  where promo_id = _promo_id;


	return 1;
end;
$function$
;
