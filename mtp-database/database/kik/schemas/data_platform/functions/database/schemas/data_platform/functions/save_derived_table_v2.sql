--liquibase formatted sql
--changeset liquibase:mohammed.abdulla@impactanalytics.co_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:save_derived_tables_mapping
--comment: updating db_type column in derived_tables_mapping and derived_graph_mapping  
--rollback: SELECT 1
DROP FUNCTION IF EXISTS data_platform.save_derived_table_v2(
	input jsonb,user_id integer);

CREATE OR REPLACE FUNCTION data_platform.save_derived_table_v2(input jsonb, user_id integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare 
_input_json json; 
_key text;
_value text;
_name text;
_run_in text;
_replace_flag_gbq text;
_replace_flag_psg text;
_execution_order int;
_type text;
_schedule_interval text;
_created_at timestamp := now();
_insert_query text;
_delete_query text;
_user int:=$2; 
_deleted_at timestamp := now();
-- Variables for graph mapping
_graph_insert_query text;
_graph_delete_query text;
_parent_id text;
_tables_tobe_copied text;
_label text;
_db text;
_db_type text;
begin

_delete_query:='update "data_platform".derived_tables_mapping set is_deleted=True, updated_by= '||_user ||',updated_at='''||_deleted_at ||''' where True ';
raise notice '%', _delete_query;
execute _delete_query;

_graph_delete_query:='update "data_platform".derived_graph_mapping set is_deleted=True, updated_by= '||_user ||',updated_at='''||_deleted_at ||''' where True ';
raise notice '%', _graph_delete_query;
execute _graph_delete_query;

    for _input_json in select json_array_elements(data::json) input_json from 
            (select value as data from jsonb_each_text($1::jsonb)) t
     loop    
        -- Debug each JSON object
        raise notice 'Processing JSON object: %', _input_json;
        
        -- Reset variables for each iteration
        _parent_id := null;
        _tables_tobe_copied := null;
        _label := null;
        
        for _key, _value in SELECT * FROM jsonb_each_text(_input_json::jsonb)
        loop 
        if  _key ='name' then 
        _name=_value;
        elsif _key ='run_in' then 
        _run_in = _value;
        elsif _key ='replace_flag_gbq' then 
        if _value is null then _replace_flag_gbq='null'; else _replace_flag_gbq=_value::varchar; end if;
        elsif _key='replace_flag_psg' then
        if _value is null then _replace_flag_psg='null'; else _replace_flag_psg=_value::varchar; end if;
        elsif _key='execution_order' then
        _execution_order=_value::int;
        elsif _key='type' then
        _type=_value;
        elsif _key='schedule_interval' then
        _schedule_interval=_value;
        elsif _key='parent_id' then
        raise notice 'Found parent_id key with value: %', _value;
        _parent_id=_value;
        raise notice 'Assigned to _parent_id: %', _parent_id;
        elsif _key='tables_tobe_copied' then
        _tables_tobe_copied=_value;
        elsif _key='label' then
        _label=_value;
        elsif _key='db' then
        _db=_value;
        elsif _key='db_type' then
        _db_type=_value;
        end if;
        end loop;
        
        _insert_query:='insert into "data_platform".derived_tables_mapping (name,run_in,replace_flag_gbq,replace_flag_psg,execution_order,type,label,db,db_type,schedule_interval,created_by,created_at)  
                          values ('''||_name||''','''||_run_in||''','||
                          CASE WHEN _replace_flag_gbq = 'null' THEN 'null' ELSE ''''||_replace_flag_gbq||'''' END||','||
                          CASE WHEN _replace_flag_psg = 'null' THEN 'null' ELSE ''''||_replace_flag_psg||'''' END||','||
                          _execution_order||','''||_type||''','''||_label||''','''||_db||''','''||_db_type||''','''||_schedule_interval||''','||_user ||','''||_created_at ||''')';
        
        -- For debugging
        RAISE NOTICE 'SQL: %', _insert_query;
        
        execute _insert_query;

        -- Debug values before graph insert
        raise notice 'Before graph insert:';
        raise notice 'task_id (name): %', _name;
        raise notice 'parent_id: %', _parent_id;
        raise notice 'tables_tobe_copied: %', _tables_tobe_copied;
        raise notice 'label: %', _label;

        -- Direct string handling without any transformations
        _graph_insert_query := format('
            insert into "data_platform".derived_graph_mapping (
                task_id,
                parent_id,
                tables_tobe_copied,
                db_type,
                db,
                created_by,
                created_at,
                is_deleted
            ) values (
                %L,
                %L,
                %L,
                %L,
                %L,
                %s,
                %L,
                False
            )',
            _name,
            _parent_id,
            _tables_tobe_copied,
            _db_type,
            _db,
            _user,
            _created_at
        );

        raise notice 'Graph insert query: %', _graph_insert_query;
        execute _graph_insert_query;
        
        -- Debug after insert
        raise notice 'Verifying insert:';
        raise notice 'SELECT * FROM data_platform.derived_graph_mapping WHERE task_id = %L AND db_type = %L AND db = %L AND is_deleted = False', _name, _db_type, _db;
     end loop;
     end
;
$function$
;
