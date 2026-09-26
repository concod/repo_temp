--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_create_promotion_2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added promo store partition creation

DROP FUNCTION if exists price_promo.fn_create_promotion;

CREATE OR REPLACE FUNCTION price_promo.fn_create_promotion(_promo_name text, _promo_start_date date, _promo_end_date date, _promo_status integer, _step_count integer, _user_id integer)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
declare
	query text;
	created_promo_id int;
begin
	query = format('insert into price_promo.promo_master
	        (name, start_date, end_date, status, step_count, created_by, created_at)
	    values
	        (%1$L, %2$L, %3$L, %4$s, %5$s, %6$s, now())
	    returning promo_id',
	    _promo_name, _promo_start_date, _promo_end_date, _promo_status, _step_count, _user_id);
	raise notice ' create promo query  -- %', query;
	execute query into created_promo_id;

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
