--liquibase formatted sql
--changeset liquibase:update_product_life_cycle runOnChange:true stripComments:false splitStatements:false context:MTP-59520 labels:MTP-59520
--comment:  MTP-59520 upload_flag added
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.update_product_life_cycle(input jsonb, integer);
CREATE OR REPLACE FUNCTION inventory_smart.update_product_life_cycle(input jsonb, integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
/*
 * 
 * 
   Product Life Cycle Screen SP
  -------------------
  Inputs :- 
  ------
  $1 - refcursor
  $2 - array which contains madown_date, clearance_date, current_status, next_markdown_start_date,next_clearance_start_date,next_markdown_end_date,next_clearance_end_date, store_code,article,l0_name
  $3 - store attribute filters - mainly for channel
 */
declare
	query text;
	query_combine text;
	BEGIN
		query := $$
		update
			inventory_smart.product_life_cycle t1
		set
			markdown_date = t2.markdown_date,
			clearance_date = t2.clearance_date,
			next_markdown_start_date = case when t2.next_markdown_start_date = '' then null else t2.next_markdown_start_date::date end,
		    next_clearance_start_date = case when t2.next_clearance_start_date = '' then null else t2.next_clearance_start_date::date end,
		    next_markdown_end_date = case when t2.next_markdown_end_date = '' then null else t2.next_markdown_end_date::date end,
		    next_clearance_end_date = case when t2.next_clearance_end_date = '' then null else t2.next_clearance_end_date::date end,
		    launch_date = case when t2.launch_date = '' then null else t2.launch_date::date end,
			current_status=t2.current_status,
			upload_flag = 'false',
			updated_at = now(),
			updated_by = %2$s
		from
			(
			select
				data->>'store_code' as store_code,
				data->>'article' as article,
				data->>'l0_name' as l0_name,
				STRING_TO_ARRAY(TRIM(BOTH '{}' from data->'values'->>'markdown_date'), '], [') as markdown_date,
				STRING_TO_ARRAY(TRIM(BOTH '{}' from data->'values'->>'clearance_date'), '], [') as clearance_date,
				(data->'values'->>'next_markdown_start_date') AS next_markdown_start_date,
		        (data->'values'->>'next_clearance_start_date') AS next_clearance_start_date,
		        (data->'values'->>'next_markdown_end_date') AS next_markdown_end_date,
		        (data->'values'->>'next_clearance_end_date') AS next_clearance_end_date,
		        (data->'values'->>'current_status') AS current_status,
				(data->'values'->>'launch_date') AS launch_date
			from
				(
				select
					jsonb_array_elements('%1$s') as data
		    ) as inp
		) as t2
		where
			t1.store_code = t2.store_code
			and t1.article = t2.article
			and t1.l0_name = t2.l0_name;
		$$;
		query_combine := format(query, $1, $2);
		raise notice '$1%  ',$1;
		raise notice '$2%  ',$2;
		raise notice 'query% ',query_combine;
		execute query_combine;		
	END
$function$
;
