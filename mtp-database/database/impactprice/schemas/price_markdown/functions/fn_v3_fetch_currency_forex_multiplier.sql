--liquibase formatted sql
--changeset utkarsh.tiwari@impactanalytics.co:fn_v3_fetch_currency_forex_multiplier runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Added the multiple currency support
--rollback: SELECT 1

DROP FUNCTION if exists price_markdown.fn_v3_fetch_currency_forex_multiplier;

CREATE OR REPLACE FUNCTION price_markdown.fn_v3_fetch_currency_forex_multiplier(_currency_ids integer[])
 RETURNS real
 LANGUAGE plpgsql
AS $function$
	DECLARE
		query_ text;
		target_currency_id integer;
		result real;
		start_time timestamp;
    	end_time timestamp;
	BEGIN
		select
			price_markdown.fn_get_target_currency_id(_currency_ids)
		into
			target_currency_id;
		
		if target_currency_id = ANY(_currency_ids) then
			return 1;
		elsif target_currency_id is not null then
			query_ = format('
							select 
								planned_conversion_multiplier
							from 
								"pricesmart".actual_forex_rate
							where
								source_currency_id in (%1$s) and target_currency_id = %2$s and date = current_date',
					array_to_string(_currency_ids,','), target_currency_id);

			raise notice 'Currency conversion multiplier query ----- %', query_;

			start_time := clock_timestamp();
		    execute query_ into result;
		    end_time := clock_timestamp();

		    raise notice 'query time: %', end_time - start_time;
		end if;

		return result;
	END;
$function$
;
