--liquibase formatted sql
--changeset akshay.jain:rcl_fetch_review_screen_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:rcl_fetch_review
--comment: initial changeset for rcl_fetch_review
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.rcl_fetch_review_screen(input refcursor, _meta_filters jsonb, _created_by integer, body jsonb);
CREATE OR REPLACE FUNCTION global.rcl_fetch_review_screen(input refcursor, _meta_filters jsonb, _created_by integer, body jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare 
_query_part text;
_query_combine text;
_rule_filter text;
_index_query text;
_product_filter text;
_store_filter text = '';
_hierarchy text;
_key text;
_value text;
_keys text[];
_jsonb_arr text[];
_jsonb_body text;
_query_table_filters text;
select_query text;
persist_query text;
drop_query text;
_rcl_level_val text[];
_validity datemultirange;

_unique_id text;

/*
 * select  * from global.rcl_fetch_review_screen('cur', 'asadad', '{}', 251, '{"rcl_code" : 3}');
*/
BEGIN
   	_query_table_filters := global.form_table_query($2);
   
   	select unique_id from global.unique_review_screen_info ursi WHERE user_code = $3 AND status IN ('review','pending') AND usecase = 'CREATE_NEW_RULE_WITH_REVIEW' and data = $4 order by created_at desc limit 1 into _unique_id;
   	raise notice '_unique id: %', _unique_id;
	select_query := 'select * from global.rule_creation_' || _unique_id::text || _query_table_filters;
	raise notice '_query_part: %', select_query;
	open $1 for execute select_query;
RETURN $1;
END
$function$
;
