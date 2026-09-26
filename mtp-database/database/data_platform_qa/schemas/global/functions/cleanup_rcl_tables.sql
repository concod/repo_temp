--liquibase formatted sql
--changeset akshay.jain@impact:cleanup_rcl_2 runOnChange:true stripComments:false splitStatements:false context:Release_1_2 labels:cleanup_rcl_2
--comment: moved rcl forced cleanup
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.cleanup_rcl_tables(input text);
DROP FUNCTION IF EXISTS global.cleanup_rcl_tables(input text, boolean);
CREATE OR REPLACE FUNCTION global.cleanup_rcl_tables(input text, boolean)
 RETURNS TABLE(rule_code integer)
 LANGUAGE plpgsql
 security DEFINER
AS $function$
declare
	_query_combine text:='';
	unique_keys text:= '';
	non_prefix_unique_keys text:= '';
	drop_statement text;
	update_statement text;
	begin
		
		if $2 is true then 
		select
			
			
			COALESCE(string_agg('global.rule_creation_' || unique_id, ', '), ''),
        	COALESCE(string_agg(quote_literal(unique_id), ', '))
		    FROM global.unique_review_screen_info
		    WHERE usecase = $1
	      AND status IN ('review', 'Finalising', 'started', 'Completed', 'Failed') into unique_keys, non_prefix_unique_keys;
	     
	    else
		
		SELECT
			COALESCE(string_agg('rule_creation_' || unique_id, ', '), ''),
        	COALESCE(string_agg(quote_literal(unique_id), ', '))
		    FROM global.unique_review_screen_info
		    WHERE usecase = $1
	      	AND created_at < NOW() - INTERVAL '3 hours'
	      AND status IN ('review', 'Finalising', 'started') into unique_keys, non_prefix_unique_keys;
	     
	     
		end if;	     
	     if unique_keys != '' then
	     
	     	RAISE NOTICE 'id found';
		    drop_statement := 'DROP TABLE IF EXISTS ' || unique_keys || ';';
		   
		   	execute drop_statement;
		   	
		   raise notice 'drop %', drop_statement;
		  
		  update_statement := 'UPDATE global.unique_review_screen_info ' ||
	                        'SET status = ''Completed'' ' ||
	                        'WHERE unique_id = ANY(ARRAY[' || non_prefix_unique_keys || ']) ' ||
	                        'AND status IN (''review'', ''Finalising'', ''started'') ' ||
	                        'AND usecase = ' || quote_literal($1) || ';';
		
	      execute update_statement;
	    	RAISE NOTICE '%', update_statement;
	    end if;
	end
	$function$
;
