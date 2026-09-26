--liquibase formatted sql
--changeset liquibase:store_dc_mapping_list_test runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for store_dc_mapping_list_test_coach
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.store_dc_mapping_list(input refcursor, jsonb, jsonb, jsonb, boolean);

CREATE OR REPLACE FUNCTION global.store_dc_mapping_list(input refcursor, jsonb, jsonb, jsonb, boolean)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
declare
    _query_sm text := '';
    _query_sa text := '';
    _query_table_filters text := '';
    _query_combine text;
    _final_query text := '';
    begin
        _query_sm := 'SELECT * FROM "global".store_master' || ("global".form_main_table_filters('store_master', $2));
        _query_sa := "global".form_attribute_table_filters_v2('store_attributes', 'store_code', $3);
        _query_table_filters := "global".form_table_query($4);
        _query_combine := 'SELECT * FROM (select
            sm.*,
            sdm.dc_map,
            channel_orig_attr.attribute_value as channel_orig_attr
        from (
            SELECT 
                main.store_name, 
                main.store_description, 
                attributes.* 
            FROM (' || _query_sm || ') main 
            JOIN (' || _query_sa || ') attributes ON main.store_code = attributes.store_code
        ) sm
        left join (
            select store_code, json_agg(jsonb_build_object(''dc_code'', dc.dc_code, ''name'', dc.name)) as dc_map 
            from "global".store_dc_mapping sdm
            join "global".distribution_centres dc on sdm.dc_code = dc.dc_code 
            group by store_code
        ) sdm on sm.store_code = sdm.store_code 
        left join (
            select store_code, attribute_value 
            from global.store_attributes
            where attribute_name = ''channel_orig''
        ) channel_orig_attr on
            sm.store_code = channel_orig_attr.store_code
        ) X ' || _query_table_filters;
        raise notice '%', _query_combine;
        if $5 is false then 
            _final_query := _query_combine;
        else
            _final_query := 'select count(*) from (' || _query_combine || ') temp' ;
        end if;
        
        open $1 for execute _final_query;
        RETURN _query_combine;
    end
$function$
;