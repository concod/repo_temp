--liquibase formatted sql
--changeset akshay.jain@impactanalytics.co:update_dimension_time_attribute runOnChange:true stripComments:false splitStatements:false context:MTP-18565 labels:liquibase_lines_changed
--comment: deleting existing data first and then refilling
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.update_dimension_time_attribute(input jsonb, text, text);
CREATE OR REPLACE FUNCTION global.update_dimension_time_attribute(input jsonb, text, text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
 declare
 		_vals text[];
 		_key_attr text;
 		_value_attr text;
 		_query text;
 		_obj json;
 		_del_id text[];
 		_action text;
 		_id text;
 		_del_query text;
 		_affected_rows int;
 		keys text[];
  		values text[];
  		sql_query text;
  		_update_query text[];
  		_insert_query text[];
  		query text;
 	
 /*
  * Function/Procedure name: global.update_dimension_time_attribute
  * 
  * Created_by : Akshay Jain
  * Created_on : 10-Aug-2022
  * 
  * Purpose : To edit Delete dimensional time attribute based on dimension code and ID supplied
  * Sample Calling Statement : select * from global.update_dimension_time_attribute('{"attributes": [{"attribute_name": "status", "attribute_value": "open", "start_time": "2022-08-01", "end_time": "2022-08-06", "time_attr_id": "10", "action": "edit"}, {"attribute_name": "status", "attribute_value": "close", "start_time": "2022-08-08", "end_time": "2022-08-13", "time_attr_id": "11", "action": "delete"}, {"attribute_name": "status", "attribute_value": "renovation", "start_time": "2022-08-15", "end_time": "2022-08-20", "time_attr_id": "14", "action": "delete"}]}', 'product', '123')       
  * Update 1-May-2023 : Now we delete all data for the product/store code and re-insert the final data.                
  */
 	
 	begin
	 	_del_query:= 'DELETE FROM "global".'|| $2 ||'_time_attributes where ' || $2 || '_code = '''|| $3 || ''';';
 			raise notice '%', _del_query;
 			execute _del_query;
 		for _obj in select json_array_elements((($1)::json->>'attributes')::json) loop
 			_action = _obj->>'action';
 			_id = _obj->>'time_attr_id';
 			if _action = 'delete' then
 				_del_id := array_append(_del_id, _id);
 			elsif _action = 'edit' then
 				for _key_attr, _value_attr in SELECT * FROM jsonb_each_text(_obj::jsonb) WHERE value IS NOT NULL loop
 					if _key_attr != 'time_attr_id' and _key_attr != 'action' then
 						_vals := array_append(_vals, (_key_attr || ' = ''' || _value_attr || ''''));
 					end if;
 				end loop;
 				if cardinality(_vals) > 0 then
 					_query := 'UPDATE "global".'|| $2 ||'_time_attributes SET ' || (ARRAY_TO_STRING(_vals, ', ', '')) || ' WHERE ' || $2 || '_time_attr_id = ''' || _id || ''' AND ' || $2 ||'_code = '''|| $3 || ''';';
 					raise notice '%', _query;
 					_update_query := array_append(_update_query, _query);
 					--execute _query;
 					--GET DIAGNOSTICS _affected_rows = ROW_COUNT;
 					--if _affected_rows = 0 then
 					--	RAISE EXCEPTION 'Ids Not updated, Maybe does not exist';
 					--end if;
 					--raise notice '%',_query;
 				end if;
 				_vals = null;
 			else
 				SELECT array_agg(key) INTO keys FROM jsonb_object_keys(_obj::jsonb) as key where key != 'time_attr_id' and key != 'action';
				SELECT array_agg(COALESCE(jsonb_extract_path_text(_obj::jsonb, key), 'NULL')) INTO values FROM jsonb_object_keys(_obj::jsonb) as key where key != 'time_attr_id' and key != 'action';
				keys = ARRAY_APPEND(keys, $2 ||'_code');
				values = ARRAY_APPEND(values, $3);
				raise notice '%', keys;
				raise notice '%', values;
				sql_query := format('INSERT INTO "global".'|| $2 ||'_time_attributes (%s) VALUES (%s)', 
                      array_to_string(keys, ', '),
                      --array_to_string(array_fill('?'::text, cardinality(values)), ','));
                      array_to_string(array(SELECT CASE
							    WHEN elem = 'NULL' THEN 'NULL'
							    ELSE quote_literal(elem)
							  END
							  FROM unnest(values) AS elem), ', ', ''));
				_insert_query := array_append(_insert_query, sql_query);
                --raise notice '%', sql_query;
               --execute sql_query;
 			end if;
 		end loop;
 	
 		if cardinality(_update_query) > 0 then
 			FOREACH query IN ARRAY _update_query
	  			LOOP
			    RAISE NOTICE 'Running query: %', query;
			    EXECUTE query;
  			END LOOP;
 		end if;
 	
 		if cardinality(_insert_query) > 0 then
 			FOREACH query IN ARRAY _insert_query
	  			LOOP
			    RAISE NOTICE 'Running query: %', query;
			    EXECUTE query;
  			END LOOP;
 		end if;
 	
 	end
 $function$
;

