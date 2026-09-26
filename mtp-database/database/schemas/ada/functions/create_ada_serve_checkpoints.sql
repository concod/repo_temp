--liquibase formatted sql
--changeset liquibase:create_ada_serve_checkpoints runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for create_ada_serve_checkpoints
--rollback: SELECT 1
DROP FUNCTION IF EXISTS ada.create_ada_serve_checkpoints(req_code integer, prod_codes text[]);
CREATE OR REPLACE FUNCTION ada.create_ada_serve_checkpoints(req_code integer, prod_codes text[])
 RETURNS integer[]
 LANGUAGE plpgsql
AS $function$
declare
    _request_code int := $1;
    _product_codes text[] := array[$2]::text[];
    _status text := 'PENDING';
    _checkpoint_codes int[];
    _query text;
    begin
      -- _query := 'insert into ada.ada_serve_checkpoint(request_code, product_codes, pg_code, hierarchy_code, training_sub_category, training_category, model_url, prod_split_url, coefficients, transformations) select ' || _request_code || ', array_agg(product_code) as product_codes,pg_code, hierarchy_code, training_sub_category, training_category, model_url, prod_split_url, coefficients, transformations from ada.model_mapping where product_code in (' || ARRAY_TO_STRING(_product_codes, ', ', '') || ') group by pg_code, hierarchy_code, training_sub_category, training_category, model_url, prod_split_url, coefficients, transformations returning checkpoint_code';
      insert into ada.ada_serve_checkpoint(request_code,product_codes,pg_code,hierarchy_code,training_category,training_sub_category,model_url,prod_split_url,status,coefficients,transformations) select _request_code, array_agg(product_code) as product_codes,pg_code, hierarchy_code, training_category, training_sub_category, model_url, prod_split_url, 'PENDING' as status, coefficients, transformations from ada.model_mapping where product_code in (ARRAY_TO_STRING(_product_codes, ', ', '')) group by pg_code, hierarchy_code, training_sub_category, training_category, model_url, prod_split_url, coefficients, transformations;
      -- execute _query into _checkpoint_code;
      select array_agg(checkpoint_code) into _checkpoint_codes from ada.ada_serve_checkpoint where request_code = _request_code;
      raise notice '_checkpoint_codes: %',_checkpoint_codes;
    return _checkpoint_codes;
end
$function$
;
