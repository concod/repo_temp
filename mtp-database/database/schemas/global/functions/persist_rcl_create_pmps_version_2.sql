--liquibase formatted sql
--changeset akshay.jain:persist_rcl_create_pmps_version_2_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start_1
--comment: removed generating rule code in this step
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.persist_rcl_create_pmps_version_2(_temp_tbl_name text);
CREATE OR REPLACE FUNCTION global.persist_rcl_create_pmps_version_2(_temp_tbl_name text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare 
    _item text;
    _rule_code_update_sql text;
    _insert_master text;
    _rcl_code int;
    _level varchar[];
    _priority int;
    _cb text;
    _validity datemultirange;
   drop_query text;
   /*select * from global.persist_rcl_create_pmps('_temp_tbl_name');*/
begin
	/*
    for _item in execute 'select distinct rule_code from global.' || _temp_tbl_name loop
        _rule_code_update_sql := 'update global.' || _temp_tbl_name || 
            ' set rule_code = ' || nextval('global.rcl_product_mapping_product_store_rule_rule_code_seq') || 
            ' where rule_code = ' || quote_literal(_item) || ';';
          raise notice 'rule code query: %', _rule_code_update_sql;
        execute _rule_code_update_sql;
    end loop;
    */  
--  insert into rule table
  	_insert_master := 'insert into global.rcl_product_mapping_product_store_rule(rcl_code, rule_code, rcl_dimension) select distinct rcl_code, rule_code, rcl_dimension from global.' || _temp_tbl_name || ' ON CONFLICT DO NOTHING;';
   raise notice 'insert rule: %', _insert_master;
   execute _insert_master;
  --  insert into BASE table
  	_insert_master := 'insert into global.rcl_product_mapping_product_store(rcl_code, rule_code, psa_code, psa_name, validity, created_at, created_by) select rcl_code, rule_code, psa_code, psa_name, validity::datemultirange, created_at, created_by from global.' || _temp_tbl_name || ' s where  exists (select 1 from global.rcl_product_mapping_product_store_rule d where d.rule_code = s.rule_code);;';
    raise notice 'insert base: %', _insert_master;
	execute _insert_master;

	drop_query = 'drop table if exists global.' || _temp_tbl_name;
	raise notice 'drop_query: %', drop_query;
	execute drop_query;
end;
$function$
;
