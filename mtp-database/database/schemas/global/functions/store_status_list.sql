--liquibase formatted sql
--changeset akshay.jain@impactanalytics.co:store_status_list_MTP_18460 runOnChange:true stripComments:false splitStatements:false context:MTP-18460_PROD labels:HANDLED_UPDATED_AT_COLUMN_PROD
--comment: initial changeset for store_status_list handled updated_At column sycn in prod
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.store_status_list(input jsonb, jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION global.store_status_list(input jsonb, jsonb, jsonb, jsonb)
 RETURNS TABLE(store_name character varying, store_code character varying, store_description text, active boolean, attributes json, status_obj json, updated_by text, updated_at timestamp with time zone)
 LANGUAGE plpgsql
AS $function$
  declare
          _query_sm text := '';
          _query_sa text := '';
          _query_table_filters text := '';
          _query_combine text := '';
  		_where_and_clause text:= '';
  		_where text:= '';
  		_final_query text := '';
  		__attribute_json_build_column_for_filter text[]:= array[]::text[];
  		_key text;
  		_value text;
  /*
   * Function/Procedure name: global.store_status_list
   *
   * Updated_by       Updated_on      Purpose
   * ----------       -----------     --------
   * Akshay Jain    07-06-2022:    To accomodate fetching multiple status corresponding to one store as json object.
   *                               changes : 1. fetching all status for some store as jsonb array
   *                                         2. Added extra input param($4) which makes where clause to filter results
   *                                         3. changed return type of status to json and removed start-date and end-date
   * Akshay Jain    13-06-2022    Changed return column status to status_obj
   * Akshay Jain    04-08-2022    Changed start_time to status_start_time and end_time to status_end_time inside status object
   * Akshay Jain    22-08-2022    MIgrated to refcursor based SP
   * Akshay Jain    17-05-2023    updated_by, updated_at column handled using join with user_master table
   */
          begin
  	        	for _key, _value in SELECT * FROM jsonb_each_text($2) WHERE value IS NOT NULL loop
                      continue when _key = 'group';
  					__attribute_json_build_column_for_filter := array_append(array_append(__attribute_json_build_column_for_filter, ''''||_key||''''),'X.'|| _key ||'');
  				end loop;
                  _query_sm := 'SELECT * FROM global.store_master' || (global.form_main_table_filters('store_master', $1));
                  _query_sa := global.form_attribute_table_filters_v2('store_attributes', 'store_code', $2);
                  _query_table_filters := global.form_table_query($3);
  				_where_and_clause :=  global.form_where_clause('varchar', $4::jsonb);
  				
  				
  				if _where_and_clause::text =''  then 
  	   				_where:= 'where 1=1'; 
  				else
  					_where:= 'where status is not null';
  				end if;
                  _query_combine := '
                          select
                              X.store_name,
  							X.store_code,
  							X.store_description,
  							X.active as active,
  							json_build_object(' || array_to_string(__attribute_json_build_column_for_filter, ' ,') ||'),
  							status_obj,
							X.updated_by,
							X.change_time
                          from
                              (
                                  select
                                          sm.*,
                                          pta.status as status_obj,
										  pta.updated_by,
										  pta.change_time
                                  from (
                                          select
                                                  main.store_name,
                                                  main.store_description,
                                                  main.active as active,
                                                --  main.special_classification as special_classification,
  												attributes.*
                                          from
                                                  (' || _query_sm || ') main
                                          join (' || _query_sa || ') attributes on
                                                  main.store_code = attributes.store_code) sm
                                  left join (
                                      select
                                        store_code as store_code,
                                        json_agg(jsonb_build_object(''status_start_time'', concat(status_start_time)::varchar, ''status_end_time'', concat(status_end_time)::varchar, ''status'', status, ''time_attr_id'', store_time_attr_id) ORDER BY status_start_time) status, max(updated_by) as updated_by, max(change_time) as change_time
                                      from
                                          (
                                              select store_code, start_time as status_start_time, end_time as status_end_time, attribute_value as status, store_time_attr_id, um.name as updated_by, sta.updated_at as change_time
                                              from 
                                              "global".store_time_attributes sta left join "global".user_master um on sta.updated_by = um.user_code
                                              where 
                                              attribute_name = ''status''
                                          
                                          ) a
                                      ' || _where_and_clause || '
                                      group by store_code
                                  ) pta
                                  on sm.store_code = pta.store_code 
  								' || _where || '
                          ) X' || _query_table_filters ;
                  raise notice '%',_query_combine;
  --                return query execute _query_combine;
              return query execute _query_combine;
          end
  $function$
;

