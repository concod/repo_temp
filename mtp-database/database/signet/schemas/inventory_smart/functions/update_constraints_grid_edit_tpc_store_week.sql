--liquibase formatted sql
--changeset nibeel.yunus:constraints_store_week_grid_update runOnChange:true stripComments:false splitStatements:false context:MTP-48841 labels:MTP-48841
--comment: MTP-48841
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.update_constraints_grid_edit_tpc_store_week(jsonb, integer);
CREATE OR REPLACE FUNCTION inventory_smart.update_constraints_grid_edit_tpc_store_week(jsonb, integer)
	RETURNS void
	LANGUAGE plpgsql
AS $function$
	DECLARE 
  		records JSONB;
  		record_row JSONB;
  		my_cursor refcursor;
  		product_code_value TEXT;
  		channel_value TEXT;
  		store_code_value TEXT;
  		fiscal_week_records JSONB;
  		update_query TEXT := '';
	BEGIN
	
 		for records in select * from jsonb_array_elements($1::jsonb) loop
			raise notice '%', records;
			product_code_value := (records ->>'product_code');
			channel_value := (records ->>'channel');
			store_code_value := (records ->> 'store_code');
			fiscal_week_records := records -> 'fiscal_year_weeks';	
			
			OPEN my_cursor FOR SELECT * FROM jsonb_array_elements(fiscal_week_records);
		
			LOOP
    			FETCH my_cursor INTO record_row;
    			EXIT WHEN NOT FOUND;
				RAISE NOTICE 'Processing store: % with product code: % and fiscal year week : %', store_code_value, product_code_value, record_row->>'fiscal_year_week';
			
				update_query := 'UPDATE
                  					inventory_smart.constraint_master_weekly 
                					SET 
                  					' || 
                  						CASE WHEN record_row->>'min' IS NOT NULL THEN 'min_stock = '''||(record_row->>'min')||''', ' ELSE '' END ||
                  						CASE WHEN record_row->>'max' IS NOT NULL THEN 'max_stock = '''||(record_row->>'max')||''', ' ELSE '' END ||
                  						CASE WHEN record_row->>'wos' IS NOT NULL THEN 'wos = '''||(record_row->>'wos')||''', ' ELSE '' END ||
                  					'updated_at = now(), 
                  					 updated_by = '||$2||'
                					 WHERE 
                  					 product_code = '''||product_code_value||''' 
                                     AND store_code = '''||store_code_value||'''
									 AND channel = '''||channel_value||'''
									 AND fiscal_year_week = '''||(record_row->>'fiscal_year_week')||''';';

				raise notice 'update query %', update_query;
				execute update_query;
			
			END LOOP;
 			CLOSE my_cursor;
  		end loop;
	END;
$function$
;

