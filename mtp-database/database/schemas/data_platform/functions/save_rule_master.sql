--liquibase formatted sql
--changeset liquibase:manoj.solanki@impactanalytics.co runOnChange:true stripComments:false splitStatements:false context:Release_1_2 labels:save_rule_master
--comment: updated description column insert
--rollback: SELECT 1
DROP FUNCTION IF EXISTS data_platform.save_rule_master(
	input jsonb,user_id integer);
CREATE OR REPLACE FUNCTION data_platform.save_rule_master(
	input jsonb,
	user_id integer)
    RETURNS void
    LANGUAGE 'plpgsql'
AS $FUNCTION$
 declare 
 _input_json json; 
 _key text;
 _value text;
 _agg bool;
 _value_tab text;
 _kpis text;
 _kpis_info text;
 _table text;
 _outer_filter text;
 _action text;
 _name text;
 _group_by text;
 _inner_filter text;
 _module text;
 _threshold text;
 _rule text;
 _rule_description text;
 _rule_display_name text;
 _created_at timestamp := now();
 _insert_query text;
 _delete_query text;
 _user_id int:=$2; 
 _deleted_at timestamp := now();
 begin
 _delete_query:='update "data_platform".rule_master set is_deleted=True, deleted_by= '||_user_id ||',deleted_at='''||_deleted_at ||''' where True ';
 raise notice '%', _delete_query;
 execute _delete_query;
 	for _input_json in select json_array_elements(value::json) input_json from 
 			(select value from jsonb_each_text($1::jsonb)) t
 	 loop	
 		for _key, _value in SELECT * FROM jsonb_each_text(_input_json::jsonb) --WHERE value IS NOT NULL 
 		loop 
	 	if 	_key ='agg' then 
		_agg=_value;
 		elsif _key ='value' then 
		if _value is null then _value_tab='null'; else _value_tab=E'\''||_value||E'\''; end if;
		elsif _key ='kpis' then 
 		_kpis = _value;
		elsif _key ='kpis_info' then 
 		_kpis_info = _value;
		elsif _key='table' then
        _table=_value;
        elsif _key='outer_filter' then
		if _value is null then _outer_filter='null'; else _outer_filter=E'\''||replace(_value,E'\'','"')||E'\''; end if;
        elsif _key='action' then
        _action=_value;
        elsif _key='name' then
        _name=_value;
        elsif _key='group_by' then
		if _value is null then _group_by='null'; else _group_by=E'\''||_value||E'\''; end if;
        elsif _key='inner_filter' then
		if _value is null then _inner_filter='null'; else _inner_filter=E'\''||replace(_value,E'\'','"')||E'\''; end if;
        elsif _key='module' then
        _module=_value;
        elsif _key='threshold' then
		if _value is null then _threshold='null'; else _threshold=E'\''||_value||E'\''; end if;
        elsif _key='rule' then
        _rule=_value;
		elsif _key='rule_description' then
        _rule_description=_value;
		elsif _key='rule_display_name' then
        _rule_display_name=_value;
 		end if;
 	raise notice '%  %', _key,_value;
 		end loop;
		
 		_insert_query:='insert into  "data_platform".rule_master (agg,value,kpis,kpis_info,"table",outer_filter,"action","name",group_by,inner_filter,module,threshold,"rule",rule_description,rule_display_name,created_by,created_at)  
                          values ('||_agg||','||_value_tab||','''||_kpis||''','''||_kpis_info||''','''||_table||''','||_outer_filter||','''||_action||''','''||_name||''','||_group_by||','||_inner_filter||','''||_module||''','||_threshold||','''||_rule||''','''||_rule_description||''','''||_rule_display_name||''','||_user_id ||','''||_created_at ||''')';
		raise notice '%', _insert_query;
		execute _insert_query;
 	 end loop;
 	 end
 ;
 
$FUNCTION$;