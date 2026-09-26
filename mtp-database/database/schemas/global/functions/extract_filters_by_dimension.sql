--liquibase formatted sql
--changeset liquibase:extract_filters_by_dimension runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for extract_filters_by_dimension - extracts filters from consolidated JSON by dimension values
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.extract_filters_by_dimension(input jsonb, text[]);
CREATE OR REPLACE FUNCTION global.extract_filters_by_dimension(input jsonb, dimensions text[])
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
declare
	_key text;
	_value jsonb;
	_filter jsonb;
	_filtered_array jsonb;
	_result jsonb := '{}'::jsonb;
begin
	FOR _key, _value IN SELECT * FROM jsonb_each($1) LOOP
		_filtered_array := '[]'::jsonb;
		FOR _filter IN SELECT * FROM jsonb_array_elements(_value) LOOP
			IF (_filter->>'dimension') = ANY(dimensions) THEN
				_filtered_array := _filtered_array || jsonb_build_array(_filter);
			END IF;
		END LOOP;
		IF jsonb_array_length(_filtered_array) > 0 THEN
			_result := _result || jsonb_build_object(_key, _filtered_array);
		END IF;
	END LOOP;
	RETURN _result;
end $function$
;
