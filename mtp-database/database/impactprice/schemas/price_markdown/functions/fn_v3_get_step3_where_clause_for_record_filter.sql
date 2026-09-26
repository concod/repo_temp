--liquibase formatted sql
--changeset durgaprasad.tulugu@impactanalytics.co:fn_v3_get_step3_where_clause_for_record_filter_6 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:approval
--comment: fn_v3_get_step3_where_clause_for_record_filter_6
--rollback: SELECT 1

DROP FUNCTION if exists price_markdown.fn_v3_get_step3_where_clause_for_record_filter;


CREATE OR REPLACE FUNCTION price_markdown.fn_v3_get_step3_where_clause_for_record_filter(_records_filters jsonb DEFAULT NULL::jsonb)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
declare
    filter jsonb;
    column_name text;
    details jsonb;
    operator text;
    value1 text = null::text;
    value2 text = null::text;
    where_clauses text[] := '{}';
    clause text;
begin
    if _records_filters is null then
        return '';
    end if;
    
    for column_name, details in select * from jsonb_each(_records_filters) loop
        operator := details->>'operator';
        
        if details ? 'value' then
            value1 := details->>'value';
            
            if column_name in ('brand', 'division', 'department', 'style', 'color', 'size', 'product_name') then
                column_name := format('lower(array_to_string(%1$s , '',''))', column_name);
                value1 := lower(value1);
				
				clause := price_markdown.fn_v3_get_step3_filter_condition(column_name, operator, value1);
			else
				clause := price_markdown.fn_v3_get_step3_filter_condition('bl.' || column_name, operator, value1);
            end if;
	
	        if clause is not null then
	            where_clauses := array_append(where_clauses, clause);
	        end if;
    
        elseif details ? 'value1' then
            value1 := details->>'value1';
            value2 := details->>'value2';
            
            clause := price_markdown.fn_v3_get_step3_filter_condition('bl.' || column_name, operator, value1, value2);
	        if clause is not null then
	            where_clauses := array_append(where_clauses, clause);
	        end if;
      
        elseif details ? 'date1' then
            value1 := (details->>'date1')::date;
            value2 := nullif(details->>'date2', '')::date;
			
			if value2 != '' then
				clause := price_markdown.fn_v3_get_step3_filter_condition('bl.' || column_name, operator, value1, value2);
            else
            	clause := price_markdown.fn_v3_get_step3_filter_condition('bl.' || column_name, operator, value1);
	        end if;

			if clause is not null then
	            where_clauses := array_append(where_clauses, clause);
	        end if;
  
        end if;
    end loop;
    
    return array_to_string(where_clauses, ' and ');
end;
$function$
;
