--liquibase formatted sql
--changeset linu.nazil:update_plan_updated runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for update_plan, MTP-43185 added allocation qty update
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.update_plan(input character varying, jsonb, jsonb, integer);
CREATE OR REPLACE FUNCTION inventory_smart.update_plan(input character varying, jsonb, jsonb, integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
	declare
		_key text;
		_value text;
		_key_attr text;
		_value_attr text;
		_map_attr text[];
		_del_prefix text[];
		_del_attrs text[];
		_level_name text;
		_each_ele text; 
		_level_value_arr text;
		_level_value text;
		_vals text[] := array[('updated_by = ' || $4), ('updated_at = now()')]::text[];
		_updated_status int;
	begin
		_del_prefix := array[' where true '];
		for _key, _value in SELECT * FROM jsonb_each_text($2) WHERE value IS NOT NULL loop
			_vals := array_append(_vals, (_key || ' = ''' || _value || ''''));
		end loop;
		for _key_attr, _value_attr in SELECT * FROM jsonb_each_text($3) WHERE value is NOT NULL loop
			if _key_attr = 'levels' then
				for _level_name, _level_value_arr in select * from jsonb_each_text(_value_attr::jsonb) where value is not null loop
					_map_attr := array_append(_map_attr, ('(' || $1 || ', ''' || _level_name || ''',  '''|| _level_value_arr || ''')'));
				end loop;
			else
				--_map_attr := array_append(_map_attr, ('(' || $1 || ', ''' || _key_attr || ''', ''' || _value_attr || ''')'));
				_map_attr := array_append(_map_attr, ('(''' || $1 || ''', ''' || _key_attr || ''', ''' || _value_attr || ''')'));
				_del_attrs := array_append(_del_attrs, 'attribute_name ' || ' = ''' || _key_attr || '''');
			end if;
			raise notice '%', _map_attr;
		end loop;
        --raise notice '%', _del_attrs;
        --raise notice '%', 'INSERT INTO "inventory_smart".plan_attributes (plan_code, attribute_name, attribute_value) VALUES ' || (ARRAY_TO_STRING(_map_attr2, ', ', '')) || ';';
		if cardinality(_vals) > 0 then
			execute 'UPDATE "inventory_smart".plan_master SET ' || (ARRAY_TO_STRING(_vals, ', ', '')) || ' WHERE plan_code = ''' || $1 || ''' returning status;' into _updated_status;
			if _updated_status = 3 then
				call inventory_smart.update_article_allocation_tracker($1);
				call inventory_smart.update_alerts_product_store_level($1);
				call inventory_smart.update_allocation_detail($1);
			end if;
		end if;
		-- raise notice '%', 'UPDATE "inventory_smart".plan_master SET ' || (ARRAY_TO_STRING(_vals, ', ', '')) || ' WHERE plan_code = ''' || $1 || ''';';
		if cardinality(_map_attr) > 0 then
			--execute 'UPDATE "inventory_smart".plan_attributes SET ' || (ARRAY_TO_STRING(_vals, ', ', '')) || ' WHERE plan_code = ''' || $1 || ''';';
			foreach _each_ele in array _del_attrs  loop
				--raise notice '%', 'DELETE FROM "inventory_smart".plan_attributes WHERE plan_code = ''' || $1 || ''' AND '|| _each_ele ||' ;' ;
				execute 'DELETE FROM "inventory_smart".plan_attributes WHERE plan_code = ''' || $1 || ''' AND '|| _each_ele ||' ;' ;
				--execute 'DELETE FROM "inventory_smart".plan_attributes WHERE plan_code = ''' || $1 || '''  || _each_ele  || ';';
			end loop;
			--raise notice '%', 'INSERT INTO "inventory_smart".plan_attributes (plan_code, attribute_name, attribute_value) VALUES ' || (ARRAY_TO_STRING(_map_attr2, ', ', '')) || ';';
			execute 'INSERT INTO "inventory_smart".plan_attributes (plan_code, attribute_name, attribute_value) VALUES ' || (ARRAY_TO_STRING(_map_attr, ', ', '')) || ';';
		end if;
	end
	$function$
;
