--liquibase formatted sql
--changeset konakandla.sujan@impactanalytics.co:store_status_list_rl_eu_MTP-69490_1 runOnChange:true stripComments:false splitStatements:false context:MTP-69490 labels:MTP-69490_revert_date_format,MTP-95045
--comment: revert date changes,MTP-95045
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.store_status_list(input jsonb, jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION global.store_status_list(input jsonb, jsonb, jsonb, jsonb)
 RETURNS TABLE(store_name character varying, store_code character varying, store_description text, active boolean, attributes json, status_obj json, updated_by text, updated_at text, is_prepack_eligible boolean,  is_auto_allocation_active text)
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
        _limit_exists bool := false;
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
   * Shreehari A    24-06-2024    is_prepack_eligible added in response and return latest updated_at and updated_by
   * Sameer Q       21-11-2024    is_auto_allocation_active added in response and return latest updated_at and updated_by
   * Chaitanya      02-12-2024    auto allocation download issue fixed
   * Sameer Q       15-01-2025    default value of is_prepack_eligible set to false
   * K Sujan        27-01-2025    fix timestamp to utc 
   * K Sujan.       07-07-2025.   fix date format



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
                SELECT ($3 ->> 'limit') IS NOT NULL INTO _limit_exists;


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
							to_char(X.change_time AT TIME ZONE '''|| inventory_smart.get_tenant_timezone() ||''',''MM-DD-YYYY HH24:MI:SS'') as change_time,
							COALESCE(is_prepack_eligible, false),
                            CASE 
                                WHEN ' || _limit_exists || ' THEN
                                    COALESCE(is_auto_allocation_active, true) :: TEXT
                                ELSE -- If limit does not exist
                                    CASE
                                        WHEN COALESCE(is_auto_allocation_active, true) THEN ''Active''
                                        ELSE ''Inactive''
                                    END
                            END AS is_auto_allocation_active
                          from
                              (
                                  select
                                          sm.*,
                                          pta.status as status_obj,
										  greatest(pta.change_time, prepack.updated_at, auto_allocation_status.updated_at) as change_time,
                                          CASE
                                            WHEN greatest(pta.change_time, prepack.updated_at, auto_allocation_status.updated_at) = pta.change_time THEN pta.updated_by::text
                                            WHEN greatest(pta.change_time, prepack.updated_at, auto_allocation_status.updated_at) = prepack.updated_at THEN prepack.updated_by::text
                                            ELSE coalesce(auto_allocation_status.updated_by::text, pta.updated_by::text)
                                          END AS updated_by,
										  prepack.is_prepack_eligible as is_prepack_eligible,
                                          auto_allocation_status.is_auto_allocation_active as is_auto_allocation_active
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
                                        json_agg(jsonb_build_object(''status_start_time'', CASE 
                                WHEN EXTRACT(YEAR FROM status_start_time::date) IN (2022, 2023) THEN CURRENT_DATE::varchar
                                ELSE status_start_time::varchar
                            END, ''status_end_time'', concat(status_end_time)::varchar, ''status'', status, ''time_attr_id'', store_time_attr_id) ORDER BY status_start_time) status, max(updated_by) as updated_by, max(change_time) as change_time
                                      from
                                          (
                                              select store_code, start_time as status_start_time, end_time as status_end_time, attribute_value as status, store_time_attr_id, um.name as updated_by, pg_xact_commit_timestamp(sta.xmin) as change_time
                                              from
                                              "global".store_time_attributes sta left join "global".user_master um on sta.updated_by = um.user_code
                                              where
                                              attribute_name = ''status'' AND end_time >= CURRENT_DATE

                                          ) a
                                      ' || _where_and_clause || '
                                      group by store_code
                                  ) pta
                                  on sm.store_code = pta.store_code
                                  left join(
                                    select
                                        spa.store_code as store_code,
                                        spa.is_prepack_eligible,
                                        spa.updated_at,
                                        um.name as updated_by
                                    from
                                        inventory_smart.store_prepack_allocation spa
                                    left join "global".user_master um on
                                        spa.updated_by = um.user_code
                                  ) prepack
                                  on sm.store_code = prepack.store_code
                                  left join(
                                    select
                                        aass.store_code as store_code,
                                        aass.is_auto_allocation_active,
                                        aass.updated_at as updated_at,
                                        um.name as updated_by
                                    from inventory_smart.auto_allocation_store_status aass
                                    left join "global".user_master um on aass.updated_by = um.user_code
                                  ) auto_allocation_status
                                  on sm.store_code = auto_allocation_status.store_code
  								' || _where || '
                          ) X' || _query_table_filters ;
                  raise notice '%',_query_combine;
  --                return query execute _query_combine;
              return query execute _query_combine;
          end
  $function$
;

