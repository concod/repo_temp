--liquibase formatted sql
--changeset liquibase:srishti.kumari@impactanalytics.co:rule_code auto-incremented runOnChange:true stripComments:false splitStatements:false context:MTP-46698 labels:MTP-46698
--comment: rule_code type change from int4 to auto-increment and fixed updated_at
--rollback: SELECT 1
drop function if exists inventory_smart.update_auto_allocation_rules(_rule_codes int[], _master_input jsonb, _mapping_input jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.update_auto_allocation_rules(_rule_codes integer, _master_input jsonb, _mapping_input jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare 
_sql text;
_key text;
_value text;
_keys text[];
_values text[];
_item jsonb;
_dt_sql text;
_dt text;
_set text[];
_sets text;
_validity text[];
_validity_val text;
/*select * from inventory_smart.update_auto_allocation_rules(229201,'{
    "rule_code": 229201,
    "rule_name": "test",
    "rule_definitions": "(threshold_type: set-wos-rule,condition: <,threshold: 0.5)",
    "is_active": true,
    "created_by": 3,
    "validity": "[2024-05-05,2025-05-05]",
    "is_default": false
}','[
    {
        "rule_code": 229201,
        "rule_type": 4,
        "rule_definitions": {
            "threshold_type": "set-wos-rule",
            "condition": "<",
            "threshold": 0.5
        },
        "is_active": true,
        "created_by": 3
		
    }
]');*/
begin 
	if EXISTS (SELECT 1 FROM jsonb_object_keys(_master_input)) then 
		for _key, _value in select * from jsonb_each_text(_master_input) loop
			if _key = 'rule_definitions' then 
				_dt := 'varchar';
			else
			_dt_sql := 'select coalesce(max(udt_name), ''varchar'') from information_schema.columns 
					join information_schema.tables using(table_schema, table_name)
					where column_name = ''' || _key || ''' and table_name like ''%alloc_rule%'' and table_type = ''BASE TABLE'';';
			execute _dt_sql into _dt; 
			end if ;
			if _dt in ('string', 'varchar', 'date', 'timestamp', 'timestampz', 'text', 'daterange', 'datemultirange', 'jsonb', 'char', 'json') then 
				_value := quote_literal(_value);
			end if;
			_set := array_append(_set, _key || ' = ' || _value); 
			
       end loop;
--      _validity_val := 'daterange(' || array_to_string(_validity, ', ') || ')';
--			raise notice 'validity: %', _validity_val;
--		_set := array_append(_set, ''||'validity = ' || _validity_val ||'');
		_set := array_append(_set, 'updated_at = now()');
		raise notice 'set: %', _set;
       _sets := array_to_string(_set, ', ');
      raise notice 'sets: %',  _master_input->>'rule_type' ;
		_sql := 'UPDATE inventory_smart.alloc_rule_master set '|| _sets || ' where rule_code = ' || _rule_codes ||';';
		raise notice 'sql: %', _sql;
		execute _sql;
		_set := '{}';
		_sets := '{}';
		_validity := '{}';
	end if;

	if jsonb_array_length(_mapping_input) > 0 then
		for _item in select * from jsonb_array_elements(_mapping_input) loop
			for _key, _value in select * from jsonb_each_text(_item) loop
			if _key = 'rule_definitions' then 
				_dt := 'jsonb';
			else
			_dt_sql := 'select coalesce(max(udt_name), ''varchar'') from information_schema.columns 
					join information_schema.tables using(table_schema, table_name)
					where column_name = ''' || _key || ''' and table_name like ''%alloc_rule%'' and table_type = ''BASE TABLE'';';
			execute _dt_sql into _dt; 
		end if;
			if _dt in ('string', 'varchar', 'date', 'timestamp', 'timestampz', 'text', 'daterange', 'datemultirange', 'jsonb', 'char', 'json') then 
				_value := quote_literal(_value);
		end if;
			_set := array_append(_set, _key || ' = ' || _value); 
			
			
       end loop;
--      _validity_val := 'daterange(' || array_to_string(_validity, ', ') || ')';
--			raise notice 'validity: %', _validity_val;
--		_set := array_append(_set, ''||'validity = ' || _validity_val ||'');
		_set := array_append(_set, 'updated_at = now()');
		raise notice 'set: %', _set;
       _sets := array_to_string(_set, ', ');
      raise notice 'sets: %', _item->>'rule_type';
		_sql := 'UPDATE inventory_smart.alloc_rule_type_mapping set '|| _sets || ' where rule_code = ' || _rule_codes ||' and rule_type = '|| (_item->>'rule_type') || ';';
		raise notice 'sql: %', _sql;
		execute _sql;
		_set := '{}';
		end loop;
	end if;
end
$function$;