--liquibase formatted sql
--changeset liquibase:MTP-40636-store-new runOnChange:true stripComments:false splitStatements:false context:MTP-40636-store-new labels:liquibase_project_start
--comment: update sp for create_new_store_mapping
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.create_new_store_mapping(input jsonb, jsonb, integer);
CREATE OR REPLACE FUNCTION global.create_new_store_mapping(input jsonb, jsonb, integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
/*
Function/Procedure name: global.create_new_store_mapping
Created by: Sadhana Jaiswal
Created at: 11-Mar-2024
Update at: 22-Apr-2024
No of input parameter: 3
Parameter Description : jsonb,jsonb,integer

Calling Statement:
select * from "global".create_new_store_mapping(

'{"sister_store_mapping_date": null, "reservation_date": null, "s0_name": "CA", "s1_name": "CANADA", "s3_name": "ON", "s4_name": "TORONTO", "opening_date": "2024-08-01", "store_code": "CA-10008", "season_code": null, "season_end_date": null, "season_start_Date": null}'
,
'[{"store_code": "CA-10008", "sister_store_code": "CA-804", "hierarcy_details": {"l0_name": ["MENS SPORTSWEAR"], "l1_name": ["MENS BOTTOMS"], "l2_name": ["BASIC"]}}, {"store_code": "CA-10008", "sister_store_code": "CA-822", "hierarcy_details": {"l0_name": ["W SPORTSWEAR"], "l1_name": ["W BOTTOMS"], "l2_name": ["BASIC"]}}]'
, 1
);

*/
declare
    _key text;
    _value text;
    _query text;
    _keys text[] := array['created_by']::text[];
    _vals text[] := array[$3]::text[];
  	_val text[];
  	_key_new text[];
  	_input_json jsonb ;

    begin
        for _key, _value in SELECT * FROM jsonb_each_text($1) WHERE value IS NOT NULL loop
            _keys := array_append(_keys, _key);
            _vals := array_append(_vals, '''' || _value || '''');
        end loop;
       	--raise notice '_keys = %',_keys;
       	--raise notice '_vals = %',_vals;
        _query = 'INSERT INTO "global".new_store_reserve (' || (ARRAY_TO_STRING(_keys, ', ', '')) || ') VALUES (' || (ARRAY_TO_STRING(_vals, ', ', '')) || ');';
       	-- raise notice '_query = %',_query;
        execute _query;

      for _input_json in select * from jsonb_array_elements($2::jsonb) loop
	      --raise notice ' _input_json = %',_input_json;
	     	_key_new:= array[]::text[];
	       _val := array[]::text[];
	       for _key, _value in SELECT * FROM jsonb_each_text(_input_json::jsonb) loop
		       	--raise notice '_key_new = %',_key;
	       		--raise notice '_vals = %',_vals;
	            _key_new := array_append(_key_new, _key);
	            _val := array_append(_val,'''' || _value || '''');
	        end loop;
	       _query = 'INSERT INTO "global".new_store_mapping (' || (ARRAY_TO_STRING(_key_new, ', ', '')) || ') VALUES (' || (ARRAY_TO_STRING(_val, ', ', '')) || ');';
			--raise notice '_query = %',_query;
	        execute _query;
	    end loop;


end $function$
;
