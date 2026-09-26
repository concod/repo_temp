--liquibase formatted sql
--changeset liquibase:update_store_group_v2 runOnChange:true stripComments:false splitStatements:false context:MTP-35536 labels:store_grade
--comment: Add store channel in store group create and update
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.update_store_group_v2(input integer, jsonb, integer, jsonb);
CREATE OR REPLACE FUNCTION global.update_store_group_v2(input integer, jsonb, integer, jsonb)
 RETURNS TABLE(pk integer)
 LANGUAGE plpgsql
AS $function$
	declare
	_key text;
	_value text;
	--_keys text[] := array['created_by']::text[];
	_vals text[] := array[('updated_by = ' || $3), ('updated_at = now()')]::text[];
	_query text;
	_stores json;
	_sg_code int;
	_ref_sg_codes text[];
	_mapping_query text;
	_sg_mapping_query text;
	_sg_mapping_cleanup_query text;
	_grades_query text;
	_grade_keys text := 'store_code, name, grade, sg_code, store_channel';
	_grades text[] = array[]::text[];
	_sg_name text := $2->'name';
	_json_grades jsonb;
	grade text;
	_grades_delete_query text;
	_sg_grades_query text;
	_grade_rank_query text;
	_sg_grade record;
	_grade_rank int;
	_store_codes text[] = array[]::text[];
	_channel text;
	begin
		_sg_code = $1;
		for _key, _value in SELECT * FROM jsonb_each_text($2) WHERE value IS NOT NULL loop
			if _key = 'stores' then
				_stores := _value;
			elsif _key = 'store_group_ids' then
				_ref_sg_codes :=  replace(replace(_value,'[','{'),']','}')::text[];
			else
				_vals := array_append(_vals, (_key || ' = ''' || _value || ''''));
			end if;
		end loop;
		--_query := 'INSERT INTO "global".store_groups (' || (ARRAY_TO_STRING(_keys, ', ', '')) || ') VALUES (' || (ARRAY_TO_STRING(_vals, ', ', '')) || ') returning sg_code;';
		--execute _query into _sg_code;
		_query := 'update "global".store_groups SET ' || (ARRAY_TO_STRING(_vals, ', ', '')) || ' where sg_code = ' || _sg_code || ';';
		execute _query;
		select channel into _channel from global.store_groups where sg_code = _sg_code;
	
		
	
		_sg_mapping_cleanup_query := 'delete from "global".store_groups_mapping where sg_code = ' || _sg_code || ';';
			raise notice ' _sg_mapping_cleanup_query % ', _sg_mapping_cleanup_query;
			execute _sg_mapping_cleanup_query;
		
		_sg_mapping_query := 'INSERT INTO "global".store_groups_mapping
				(sg_code, store_code)
				select
					' || _sg_code || ' as sg_code,
						(s->>''store_code'')::varchar as store_code
					from
						(
						select
							json_array_elements(''' || _stores || '''::json) as s) x';
		execute _sg_mapping_query;	  
		if _ref_sg_codes::text != '{}' then 
			_sg_mapping_query := 'INSERT INTO "global".store_groups_mapping
				(sg_code, store_code)
				( select ' || _sg_code || ' as sg_code, sgm.store_code
					from "global".store_groups_mapping sgm where sgm.sg_code in ('||array_to_string(_ref_sg_codes,',','*')||')
                 ) ON conflict do nothing;
			   ';
			execute _sg_mapping_query;
			raise notice 'store group insert query %',_sg_mapping_query;
		end if;
		for grade in select * from jsonb_array_elements($4)
		loop
			raise notice 'grade %', grade;
			if _ref_sg_codes::text != '{}' then
				raise notice 'test %',grade::jsonb->'store_code';
				_sg_grades_query := format('select sgtg.grade as grade, (select attribute_value->''value''->''ranks''->sgtg.grade from "global".tenant_attribute_master tam where "name"=''grade_rank'') as "rank" from global.store_groups_to_grade sgtg where sgtg.sg_code in (%1$s) and store_code = ''%2$s'' order by rank limit 1', array_to_string(_ref_sg_codes,',','*'), replace(text(grade::jsonb->'store_code'), '"', ''));
				raise notice 'sg grades query %',_sg_grades_query;
				execute _sg_grades_query into _sg_grade;
				raise notice 'grades %', _sg_grade;
				if _sg_grade is not null then
					_grade_rank_query := format('select attribute_value->''value''->''ranks''->''%1$s'' as "rank" from "global".tenant_attribute_master tam where "name"=''grade_rank''', replace(text(grade::jsonb->'store_grade'), '"', ''));
					raise notice 'grade rank %', _grade_rank_query;
					execute _grade_rank_query into _grade_rank;
					if _grade_rank > _sg_grade.rank::int then
						raise notice 'rank higher';
						_grades := array_append(_grades, format('(%1$s,%2$s,''%3$s'',%4$s,''%5$s'')', grade::jsonb->'store_code', _sg_name, _sg_grade.grade, _sg_code, _channel));
						continue;
					end if;
				end if;
			end if;
			_grades := array_append(_grades, format('(%1$s,%2$s,%3$s,%4$s,''%5$s'')', grade::jsonb->'store_code', _sg_name, grade::jsonb->'store_grade', _sg_code, _channel));
			_store_codes := array_append(_store_codes, replace(text(grade::jsonb->'store_code'), '"', ''));
		end loop;
		raise notice 'store codes %', _store_codes;
		for _sg_grade in select sgtg.store_code, sgtg.grade, (select attribute_value->'value'->'ranks'->sgtg.grade from "global".tenant_attribute_master tam where name='grade_rank') as "rank" from global.store_groups_to_grade sgtg where store_code != all(_store_codes) and sg_code = any(_ref_sg_codes::int[]) order by rank
		loop
			_grades := array_append(_grades, format('(''%1$s'',%2$s,''%3$s'',%4$s,''%5$s'')', _sg_grade.store_code, _sg_name, _sg_grade.grade, _sg_code, _channel));
			_store_codes := array_append(_store_codes,  _sg_grade.store_code);
		end loop;
		for _sg_grade in select dsg.store_code, dsg.grade from "global".default_store_grade dsg where dsg.store_code in (select sgm.store_code from global.store_groups_mapping sgm where sgm.sg_code = _sg_code) and store_code not in (select sgtg.store_code from global.store_groups_to_grade sgtg where sgtg.sg_code = _sg_code)
		loop
			_grades := array_append(_grades, format('(''%1$s'',%2$s,''%3$s'',%4$s,''%5$s'')', _sg_grade.store_code, _sg_name, _sg_grade.grade, _sg_code, _channel));
		end loop; 
		_grades_delete_query := 'delete from "global".store_groups_to_grade where sg_code = '''|| _sg_code ||''' and store_code in ('''|| array_to_string(_store_codes,''',''','*') ||''')';
		raise notice 'grades delete query %', _grades_delete_query;
		execute _grades_delete_query;
		_grades_query := 'insert into "global".store_groups_to_grade ('|| _grade_keys ||') VALUES '|| REPLACE(ARRAY_TO_STRING(_grades, ', ', ''), '"', '''') ||' on conflict do nothing';
		raise notice 'grades query %', _grades_query;
		if array_length(_grades, 1) > 0 then
			execute _grades_query;
		end if;
		return query execute ('select ' || _sg_code);
		
	end $function$
;

--changeset arnab.nandy@impactanalytics.co:droping_update_store_group_v2_psa_flag runOnChange:true stripComments:false splitStatements:false context:MTP-42552 labels:MTP-42552
--comment: changeset for deleting update_store_group_v2 function to handle psa_flag for signet
DROP FUNCTION IF EXISTS global.update_store_group_v2(input integer, jsonb, integer, boolean);
