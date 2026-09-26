--liquibase formatted sql
--changeset liquibase:get_aps_rcl_dg runOnChange:true stripComments:false splitStatements:false context:MTP-60022 labels:liquibase_project_start
--comment: Optimize SP
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.get_aps_rcl(jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.get_aps_rcl(input jsonb)
RETURNS TABLE(article text, aps integer, wos integer)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
#variable_conflict use_column
DECLARE
  vl_unique_identifier    text := '';
  _rcl_input_table        text := '';
  _rcl_input_query_f      text := '';
  _rcl_input_query        text := '';
  _rcl_psm_query          text := '';
  _rcl_psm_table          text := '';
  _rcl_psm_query_f        text := '';
  _rcl_const_query        text := '';
  _rcl_const_query_f      text := '';
  _rcl_const_table        text := '';
  _l0_name                text := '';
BEGIN
  SELECT replace(gen_random_uuid()::text, '-', '_') INTO vl_unique_identifier;
  SELECT
    l0_name
  INTO
    _l0_name
  FROM
    global.product_attributes_filter paf
  WHERE
    article = ($1)->0->'upc'->>0;
  _rcl_input_query_f := format($$
    WITH unpack_json AS (
      SELECT
        replace(replace(value->>'upc', '[', '{'), ']', '}')::varchar[] AS product_codes,
        replace(replace(value->>'store_group_code', '[', '{'), ']', '}')::int4[] AS store_group_codes
      FROM
        jsonb_array_elements(
        '%1$s'
        )
    ),
    product_store_groups AS materialized(
      SELECT article, l0_name, L4_name, product_code, unnest(store_group_codes) sg_code FROM (
        SELECT unnest(product_codes) AS product_code, store_group_codes FROM unpack_json
      ) t1
      JOIN "global".product_attributes_filter paf using (product_code)
      where paf.l0_name ='%2$s'
    )
    SELECT psg.article, psg.product_code, psafs.store_code, psafs.psa_code FROM product_store_groups psg
    JOIN "global".aggregated_store_groups_mapping sgm ON sgm.sg_code = psg.sg_code
    JOIN "global".product_store_attributes_filter psafs ON sgm.psa_code = psafs.psa_code
    GROUP BY 1, 2, 3, 4
  $$, input, _l0_name);
  _rcl_input_table := 'public.rcl_input_data_' || vl_unique_identifier;
  _rcl_input_query:= 'CREATE UNLOGGED TABLE ' || _rcl_input_table || ' AS ( ' || _rcl_input_query_f || ' );';
  RAISE NOTICE '_rcl_input_query: %', _rcl_input_query;
  EXECUTE 'DROP TABLE IF EXISTS ' || _rcl_input_table ||' CASCADE; ';
  EXECUTE _rcl_input_query;
  _rcl_psm_query_f = format('
    SELECT
      *
    FROM global.generate_rcl_psm_data(''%1$s'', 32, CURRENT_DATE)
  ', _rcl_input_table);
  _rcl_psm_table := 'public.rcl_psm_input_data_' || vl_unique_identifier;
  _rcl_psm_query := 'CREATE UNLOGGED TABLE ' || _rcl_psm_table || ' AS ( ' || _rcl_psm_query_f || ' );';
  RAISE NOTICE '_rcl_psm_query: %', _rcl_psm_query;
  EXECUTE 'DROP TABLE IF EXISTS ' || _rcl_psm_table ||' CASCADE; ';
  EXECUTE _rcl_psm_query;
  _rcl_const_table := 'public.rcl_constraint_input_data_' || vl_unique_identifier;
--  _rcl_const_query_f := format('CREATE UNLOGGED TABLE %1$s AS (
--    SELECT psm.product_code, psm.store_code, psaf.psa_code FROM %2$s psm 
--    JOIN 
--      global.product_attributes_filter paf USING (product_code) 
--    JOIN
--      global.product_store_attributes_filter psaf 
--      ON paf.l0_name=psaf.l0_name AND psm.store_code=psaf.store_code
--    );',
--    _rcl_const_table, _rcl_psm_table);
  _rcl_const_query := format('CREATE TEMP TABLE constraints_resolved_data_%2$s AS (
    SELECT * FROM inventory_smart.generate_rcl_constraint_data(''%1$s'', 170, CURRENT_DATE)
  )', _rcl_input_table, vl_unique_identifier);

  --EXECUTE format('DROP TABLE IF EXISTS %1$s CASCADE;', _rcl_const_table);
  --RAISE NOTICE ' constraints input query: % ', _rcl_const_query_f;
  --EXECUTE _rcl_const_query_f;

  EXECUTE format('DROP TABLE IF EXISTS constraints_resolved_data_%1$s', vl_unique_identifier);
  RAISE NOTICE ' constraints resolution query: % ', _rcl_const_query;
  EXECUTE _rcl_const_query;

  RETURN QUERY EXECUTE format($$
    SELECT article::text, CAST(SUM(aps) AS INTEGER), CAST(ROUND(AVG(wos)) AS INTEGER) FROM constraints_resolved_data_%1$s cs
    JOIN %2$s paf using (product_code, store_code)
    GROUP BY 1
  $$, vl_unique_identifier, _rcl_psm_table);
END
$function$
;