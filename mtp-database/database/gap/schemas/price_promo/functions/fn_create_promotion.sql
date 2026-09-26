--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_create_promotion_2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added promo store partition creation

DROP FUNCTION if exists price_promo.fn_create_promotion;
CREATE OR REPLACE FUNCTION price_promo.fn_create_promotion(
    _promo_name text,
    _promo_start_date date,
    _promo_end_date date,
    _promo_status integer,
    _step_count integer,
    _user_id integer,
    _event_id integer,
    _is_vendor_created_promo boolean DEFAULT false,
    _vendor_portal_status integer DEFAULT 0
)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
declare
	query text;
	created_promo_id int;
	vendor_created_by int = null;
begin
	if _is_vendor_created_promo then
		vendor_created_by = _user_id;
	end if;

	query = format('insert into price_promo.promo_master
	        (event_id, name, start_date, end_date, status, step_count, is_vendor_created_promo, vendor_portal_status, created_by, vendor_created_by)
	    values
	        (%9$L, %1$L, %2$L, %3$L, %4$s, %5$s, %6$L, %7$s, %8$s, %10$L)
	    returning promo_id',
	    _promo_name, _promo_start_date, _promo_end_date, _promo_status, _step_count, _is_vendor_created_promo, _vendor_portal_status, _user_id, _event_id, vendor_created_by);
	raise notice ' create promo query  -- %', query;
	execute query into created_promo_id;

	update price_promo.promo_master
	set currency_id = (
		select currency_id from global.tb_country_currency_mapping where country_id = (
			select country_id from price_promo.event_master where event_id = _event_id
		)
	)
	where promo_id = created_promo_id;

	query = format('select price_promo.fn_create_promo_product_partition_table(%1$s)', created_promo_id);
	raise notice ' product partition create query  -- %', query;
	execute query;

	query = format('select price_promo.fn_create_promo_store_partition_table(%1$s)', created_promo_id);
	raise notice ' store partition create query  -- %', query;
	execute query;

	return created_promo_id;
end
$function$
;
