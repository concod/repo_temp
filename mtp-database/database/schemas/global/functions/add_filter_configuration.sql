--liquibase formatted sql
--changeset liquibase:add_filter_configuration runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for add_filter_configuration
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.add_filter_configuration(input jsonb, integer);
CREATE OR REPLACE FUNCTION global.add_filter_configuration(input jsonb, integer)
 RETURNS TABLE(pk integer)
 LANGUAGE plpgsql
AS $function$
    declare
         fc_code int;
         _key text;
         _value text;
         _query text := '';
         _keys text[] := array['created_by']::text[];
         _vals text[] := array[$2]::text[];
         _screen_code text;
         _query_fc_code text;
     begin
         -- Get the screen code from the input JSON object
         _screen_code := quote_literal(replace(replace((input->'screens'->0)::varchar, '"{', ''), '}"', ''));
		
         -- Check if the screen code already exists in the filter_configuration table
         _query_fc_code := 'SELECT filter_configurations.fc_code FROM "global".filter_configurations WHERE ' || _screen_code || '=any(screens) and is_deleted=false;';
         
         execute _query_fc_code into fc_code;
         
         if fc_code IS NOT NULL THEN
             -- If the screen code already exists for a particular config , update the existing row
             for _key, _value IN SELECT * FROM jsonb_each_text(input) WHERE value IS NOT NULL LOOP
                 _query := _query || _key || ' = ' || quote_literal(_value) || ',';
             end loop;
             -- Remove the last comma from the query string
             _query := SUBSTRING(_query, 1, LENGTH(_query) - 1);
             _query := 'UPDATE "global".filter_configurations SET ' || _query || ' WHERE fc_code = ' || fc_code || ' RETURNING fc_code;';
         else
             -- If the screen code does not exist, insert a new row
             for _key, _value IN SELECT * FROM jsonb_each_text(input) WHERE value IS NOT NULL LOOP
                 _keys := array_append(_keys, _key);
                 _vals := array_append(_vals, quote_literal(_value));
             end loop;
             _query := 'INSERT INTO "global".filter_configurations (' || (ARRAY_TO_STRING(_keys, ', ', '')) || ') VALUES (' || (ARRAY_TO_STRING(_vals, ', ', '')) || ') returning fc_code;';
         end if;
 
         -- Execute the query and return the fc_code
         return query execute _query;
 
    end $function$
;
