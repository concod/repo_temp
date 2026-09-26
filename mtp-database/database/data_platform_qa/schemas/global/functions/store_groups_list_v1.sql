--liquibase formatted sql
--changeset liquibase:store_groups_list_v1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for store_groups_list_v1
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.store_groups_list_v1(input jsonb, jsonb, jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION global.store_groups_list_v1(input jsonb, jsonb, jsonb, jsonb, jsonb)
 RETURNS TABLE(sg_code integer, name character varying, special_classification character varying, updated_at timestamp with time zone, created_by integer, store_count bigint, sg_count bigint)
 LANGUAGE plpgsql
AS $function$
    declare
    _query_sm text := '';
    _query_sa text := '';
    _query_table_filters text := '';
    _query_combine text := '';
    _p_main_filter_cnt int := 0;
    _p_attr_filter_cnt int := 0;
    _s_main_filter_cnt int := 0;
    _s_attr_filter_cnt int := 0;
    _query_map text := '';
    _filter_con text := ' ';
    _filter_con_map text := ' ';
    begin
        SELECT count(*) INTO _s_main_filter_cnt from jsonb_each_text($1);
        SELECT count(*) INTO _s_attr_filter_cnt from jsonb_each_text($2);
        SELECT count(*) INTO _p_main_filter_cnt from jsonb_each_text($3);
        SELECT count(*) INTO _p_attr_filter_cnt from jsonb_each_text($4);
        raise notice '%,%,%,%', _s_main_filter_cnt, _s_attr_filter_cnt, _p_main_filter_cnt, _p_attr_filter_cnt;
        _query_table_filters := global.form_table_query($5);
        if _s_main_filter_cnt = 0 and _s_attr_filter_cnt != 0 then
            _query_sa := global.form_attribute_table_filters_v2('store_attributes', 'store_code', $2);
            _filter_con := ' (SELECT sgm.sg_code, sgm.store_code FROM (' || _query_sa || ') x JOIN "global".store_groups_mapping sgm ON x.store_code = sgm.store_code) f ';
        elseif _s_main_filter_cnt != 0 and _s_attr_filter_cnt = 0 then
            _query_sm := 'SELECT * FROM global.store_master' || (global.form_main_table_filters('store_master', $1));
            _filter_con := ' (SELECT sgm.sg_code, sgm.store_code FROM (' || _query_sm || ') x JOIN "global".store_groups_mapping sgm ON x.store_code = sgm.store_code) f ';
        elseif _s_main_filter_cnt != 0 and _s_attr_filter_cnt != 0 then
            _query_sm := 'SELECT * FROM global.store_master' || (global.form_main_table_filters('store_master', $1));
            _query_sa := global.form_attribute_table_filters_v2('store_attributes', 'store_code', $2);
            _filter_con := ' (SELECT sgm.sg_code, sgm.store_code FROM (' || _query_sm || ') x JOIN (' || _query_sa || ') y on x.store_code = y.store_code join "global".store_groups_mapping sgm ON x.store_code = sgm.store_code) f ';
        elseif _s_main_filter_cnt = 0 and _s_attr_filter_cnt = 0 and (_p_main_filter_cnt > 0 or _p_attr_filter_cnt > 0) then
            _filter_con := ' (SELECT sgm.sg_code, sgm.store_code FROM "global".store_groups_mapping sgm) f ';
        end if;
        if  _p_main_filter_cnt > 0 or _p_attr_filter_cnt > 0 then
            _query_map := ' JOIN (select store_code from (' || (global.products_store_filters($3, $4, $1, $2)) || ') m group by store_code) m ON f.store_code = m.store_code ';
            _filter_con := ' JOIN (select f.sg_code from ' || (_filter_con || _query_map) || 'group by f.sg_code) f ON sg.sg_code = f.sg_code ';
        elseif _filter_con != ' ' then
            _filter_con := ' JOIN (select f.sg_code from ' || _filter_con || 'group by f.sg_code) f ON sg.sg_code = f.sg_code ';
        end if;
        _query_combine := 'SELECT * FROM (
            select
                sg.*,
                sgm.store_count,
                sgm.sg_count
            from
                (
                select
                    sg_code,
                    name,
                    special_classification,
                    updated_at,
                    created_by
                from
                    "global".store_groups
                where
                    is_deleted = false) sg'
            || _filter_con ||
            'left join (
                select
                    sg_code,
                    count(store_code) as store_count,
                    count(distinct ref_sg_code) as sg_count
                from
                    "global".store_groups_mapping
                group by
                    sg_code) sgm on
                sg.sg_code = sgm.sg_code
            ) X ' || _query_table_filters;
        --raise notice '%',_query_combine;
        return query execute _query_combine;
    end $function$
;
