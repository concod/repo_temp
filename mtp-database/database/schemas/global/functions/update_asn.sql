--liquibase formatted sql
--changeset liquibase:update_asn runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for update_asn
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.update_asn(input integer, jsonb, integer);
CREATE OR REPLACE FUNCTION global.update_asn(input integer, jsonb, integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
	_key text;
	_val text;
	_vals_main text[] := array[('updated_by = ' || $3), 'updated_at = now()']::text[];
	_query_main text;
	_key_attr text;
	_val_attr text;
	_vals_attr text[];
	_query_attr_cleanup text;
	_query_attr text;
	_query_dc_cleanup text;
	_vals_dc text[];
	_dc text;
	_query_dc text;
begin
	for _key, _val in SELECT * FROM jsonb_each_text($2::jsonb) WHERE value IS NOT NULL loop 
		if _key = 'total_quantity' then
			_vals_main := array_append(_vals_main, (_key || ' = ''' || _val || ''''));
		elseif _key = 'attributes' then
			for _key_attr, _val_attr in SELECT * FROM jsonb_each_text(_val::jsonb) WHERE value IS NOT NULL loop
				_vals_attr := array_append(_vals_attr, '(' || $1 || ', ''' || _key_attr || ''', ''' || _val_attr || ''')');
			end loop;
		elseif _key = 'dc_map' then
			for _dc in SELECT * FROM json_array_elements(_val::json) loop
				_vals_dc := array_append(_vals_dc, ( '(' || $1 || ', ''' || ((_dc::json)->>'dc') || ''', ''' || ((_dc::json)->>'quantity') || ''', ''' || ((_dc::json)->>'quantity_perc') || ''')'));
			end loop;
		end if;
	end loop;
	_query_main := 'update "global".product_asn_master SET ' || (ARRAY_TO_STRING(_vals_main, ', ', '')) || ' WHERE pasn_code = ' || $1 || ';';
	_query_attr_cleanup := 'delete from "global".product_asn_attributes where pasn_code = ' || $1;
	_query_attr := 'INSERT INTO "global".product_asn_attributes(pasn_code, attribute_name, attribute_value) VALUES ' || (ARRAY_TO_STRING(_vals_attr, ', ', ''));
	_query_dc_cleanup := 'delete from "global".product_asn_dc_mapping where pasn_code = ' || $1;
	_query_dc := 'INSERT INTO "global".product_asn_dc_mapping(pasn_code, dc, quantity, quantity_perc) VALUES ' || (ARRAY_TO_STRING(_vals_dc, ', ', ''));
--	raise notice '%',_query_main;
-- 	raise notice '%',_query_attr_cleanup;
-- 	raise notice '%',_query_attr;
-- 	raise notice '%',_query_dc_cleanup;
-- 	raise notice '%',_query_dc;
	EXECUTE _query_main;
	EXECUTE _query_attr_cleanup;
	EXECUTE _query_attr;
	EXECUTE _query_dc_cleanup;
	EXECUTE _query_dc;
end
$function$
;
