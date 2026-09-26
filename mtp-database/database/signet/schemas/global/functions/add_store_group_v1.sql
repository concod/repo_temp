--liquibase formatted sql
--changeset amit.lekhak@impactanalytics.co:mojo-55620755-signet runOnChange:true stripComments:false splitStatements:false context:mojo-49342973-signet labels:mojo-49342973-signet
--comment: logic to get sg_code for non deleted store groups,trim storgroup
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.add_store_group_v1(input jsonb, integer, jsonb);
CREATE OR REPLACE FUNCTION global.add_store_group_v1(input jsonb, integer, jsonb)
 RETURNS TABLE(pk integer)
 LANGUAGE plpgsql
AS $function$
	declare
	_key text;
	_value text;
	_keys text[] := array['created_by', 'updated_by']::text[];
	_vals text[] := array[$2, $2]::text[];
	_query text;
	_stores json;
	_sg_code int;
	_ref_sg_codes text[];
	_mapping_query text;
	_sg_mapping_query text;
	_grades_query text;
	_grade_keys text := 'store_code, name, grade, sg_code, store_channel';
	_grades text[] = array[]::text[];
	_sg_name text := quote_literal(trim($1->>'name'));
	_json_grades jsonb;
	grade text;
	_grades_delete_query text;
	_sg_grades_query text;
	_grade_rank_query text;
	_sg_grade record;
	_grade_rank int;
	_store_codes text[] = array[]::text[];
	_channel text;
	_store_group_name text;
	_source_ui bool := false;
	_set_upload_flag bool := false;
	begin
		for _key, _value in SELECT * FROM jsonb_each_text($1) WHERE value IS NOT NULL loop
			if _key = 'name' then
				_value := trim(_value);
				_store_group_name := _value;
			end if;
			if _key = 'stores' then
				_stores := _value;
			elseif _key = 'source_ui' then
				_source_ui := _value;
			elseif _key = 'set_upload_flag' then
				_set_upload_flag := _value;
			elsif _key = 'store_group_ids' then
				_ref_sg_codes :=  replace(replace(_value,'[','{'),']','}')::text[];
			else
				_keys := array_append(_keys, _key);
				if _key = 'name' then
					_vals := array_append(_vals, '''' || trim(_value) || '''');
				else
					_vals := array_append(_vals, '''' || _value || '''');
				end if;
			end if;
		end loop;

		raise notice 'Values are: %', _store_group_name;

		_query := 'select sg_code,channel from "global".store_groups where lower(name) =' || '''' || lower(_store_group_name) || '''' || ' and is_deleted = false';
		execute _query into _sg_code, _channel;

		raise notice 'GROUP Values are: %-%', _sg_code, _channel;

		if _source_ui = true or _sg_code is null then
            _query := 'INSERT INTO "global".store_groups (' || (ARRAY_TO_STRING(_keys, ', ', '')) || ') VALUES (' || (ARRAY_TO_STRING(_vals, ', ', '')) || ') returning sg_code, channel;';
            execute _query into _sg_code, _channel;
        else
			_query := 'update  "global".store_groups set updated_by=' || $2 || ', updated_at = now(), is_deleted = false, channel = ''' || $1 || '''::jsonb->>''channel'' where sg_code=' || _sg_code;
			execute _query;
        	_query := 'delete from "global".store_groups_mapping where sg_code='||_sg_code;
			execute _query;
		end if;

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
		for grade in select * from jsonb_array_elements($3)
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
		end loop;
		for _sg_grade in select dsg.store_code, dsg.grade from global.default_store_grade dsg where dsg.store_code != all(_store_codes) and store_code in (select sgm.store_code from global.store_groups_mapping sgm where sgm.sg_code = _sg_code)
		loop
			_grades := array_append(_grades, format('(''%1$s'',%2$s,''%3$s'',%4$s,''%5$s'')', _sg_grade.store_code, _sg_name, _sg_grade.grade, _sg_code, _channel));
		end loop; 
		_grades_delete_query := 'delete from "global".store_groups_to_grade where sg_code = '''|| _sg_code ||'''';
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

--changeset arnab.nandy@impactanalytics.co:MTP-42887 runOnChange:true stripComments:false splitStatements:false context::MTP-42887 labels::MTP-42887
--comment: removing function for signet
DROP FUNCTION IF EXISTS global.add_store_group_v1(input jsonb, integer, boolean);
