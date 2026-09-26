--liquibase formatted sql
--changeset liquibase:add_tags runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for add_tags
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.add_tags(input jsonb);
CREATE OR REPLACE FUNCTION global.add_tags(input jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
	_key text;
	_value text;
	_query text;
	_keys text[];
	_vals text[];
	
	begin
		for _key, _value in SELECT * FROM jsonb_each_text($1) WHERE value IS NOT NULL loop 
			if _key ='tag_datatype' then
				_keys := array_append(_keys, _key);
				_vals := array_append(_vals, '''' || _value || '''');
			elseif _key = 'tag_key' then
				_keys := array_append(_keys, _key);
				_vals := array_append(_vals, '''' || _value || '''');
			else
				_keys := array_append(_keys, _key);
				_vals := array_append(_vals, '''' || _value || '''');
			end if;
		end loop;
		
		_query := 'INSERT INTO "global".tags_master (' || (ARRAY_TO_STRING(_keys, ', ', '')) || ') VALUES (' || (ARRAY_TO_STRING(_vals, ', ', '')) || ');';
		raise notice '%', _query;
		execute _query;		
end
$function$
;
