--liquibase formatted sql
--changeset liquibase:get_hierarchy_code runOnChange:true stripComments:false splitStatements:false context:MTP-24306 labels:liquibase_project_start
--comment: initial changeset for get_hierarchy_code
--rollback: SELECT 1

DROP FUNCTION IF EXISTS assort_smart.get_hierarchy_code(input jsonb);
CREATE OR REPLACE FUNCTION assort_smart.get_hierarchy_code(jsonb)
 RETURNS TABLE(hierarchy_code text, path jsonb)
 LANGUAGE plpgsql
AS $function$

/*
        Function/Procedure name: assort_smart.hierarchy_code
        Created by: Sadhana J
        Created at: 23-05-2022
        No of input parameter: 1
        Parameter Description : $1 = json

        Purpose:

        Calling Statement:

        select * from assort_smart.hierarchy_code(
        '
           {
              "data": [
                {
                  "hierarchy_code": "Jewelry_Bracelets",
                  "active": true,
                  "level": 2,
                  "path": {"l1_name": "Jewelry", "l2_name": "Bracelets"}
                },
                {
                  "hierarchy_code": "Jewelry_Cel",
                  "active": true,
                  "level": 2,
                  "path": {"l1_name": "Jewelry", "l2_name": "Cel"}
                }
              ],
            }
        '
        );

        Updated_by
        Sadhana J 23-05-2022:
*/
declare
_query_combine text ;
_insert_query_combine text ;
_filterkeys text[] ;
_filtervals text[] ;
_path_group text[] ;
_path_group_new text;
_key text;
_value text;
_key1 text;
_value1 text;
_hierarchy_code text;
_active bool;
_input_json jsonb ;
_level text;
_path jsonb;
begin

        for _input_json in select json_array_elements(value::json) input_json from
            (select value from jsonb_each_text($1::jsonb)) x

        loop
                for _key, _value in SELECT * FROM jsonb_each_text(_input_json::jsonb) --WHERE value IS NOT NULL
                loop

                        if _key ='hierarchy_code' then
                         _hierarchy_code = _value::text;

                        elsif _key ='active' then
                            _active = _value::bool;
                        elsif _key ='level' then
                            _level:= _value::integer;
                        elsif _key ='path' then
                            _path:= _value::jsonb;
                          -- raise notice '_path%',_path;
                           --_path_group := concate(''''||_value::text ||'''',','||_path_group);
                            -- _path_group add all path together
                          	_path_group := array_append(_path_group,''''||_path::text||'''');
                        end if;
                end loop;

                -- query to insert records if does not exist into product_hierarchies_filter
                _insert_query_combine:= 'INSERT INTO assort_smart.product_hierarchy_group
                                (hierarchy_code, "path", "level", active)
                            SELECT '''||_hierarchy_code||''','''|| _path||''',  '||_level||', '||_active||'
                            WHERE
                                NOT EXISTS (
                                    SELECT 1 FROM assort_smart.product_hierarchy_group
                                    WHERE "path" = '''|| _path||'''
                                )';


                 --raise notice 'insert_select_query = %',_insert_query_combine;
                 execute _insert_query_combine;
    end loop;

   -- raise notice '_path_group%',_path_group::text;
   _path_group_new := array_to_string(_path_group,',');

   --raise notice '_path_group%',_path_group_new::text;

    -- logic to fetch all hierarchy_code for given path from both table
   -- _path_group = ('{"l1_name": "Jewelry", "l2_name": "Bracelets"}', '{"l1_name": "Jewelry", "l2_name": "Bracelets"}')
    _query_combine:= ' SELECT pg.hierarchy_code::text AS hierarchy_code, pg."path" as "path"
                                       FROM assort_smart.product_hierarchy_group pg
                                       where pg.path in ('|| _path_group_new||') ;
                                        ';


     --raise notice '%',_query_combine;
     RETURN QUERY execute _query_combine;


end
;
$function$
;