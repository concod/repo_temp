--liquibase formatted sql
--changeset sonika.baheti@impactanalytics.co:rename_colnames runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:item_smart_initial_commit
--comment: initial changeset for item_smart.rename_colnames
--rollback: SELECT 1

DROP PROCEDURE if EXISTS item_smart.rename_colnames(text);

CREATE OR REPLACE PROCEDURE item_smart.rename_colnames(IN p_source_table text)
 LANGUAGE plpgsql
AS $procedure$
DECLARE
    v_sql text;
	v_sql1 text;
	v_sql2 text;
	v_sql3 text;
	v_sql4 text;
BEGIN
    if p_source_table not in ('placeholders_info_refresh', 'new_skus_refresh')
	then
    v_sql := format('ALTER TABLE public.%s RENAME COLUMN country TO dept;',p_source_table);
	EXECUTE v_sql;
	END IF;
	if p_source_table like '%lvl_1_itemsmart_temp'
	then 
	v_sql := format('ALTER TABLE public.%s ADD product_type int8 DEFAULT 0 NULL;',p_source_table);
	EXECUTE v_sql;
	END IF;

	IF  p_source_table in ('new_skus_refresh')
	then 

	v_sql1 := format('ALTER TABLE public.new_skus_refresh ALTER COLUMN psa_codes TYPE _varchar USING psa_codes::_varchar');
	execute v_sql1;
	v_sql2 := format('ALTER TABLE public.new_skus_refresh ALTER COLUMN reference_product_codes TYPE _varchar USING reference_product_codes::_varchar');
	execute v_sql2;
	v_sql3 := format('ALTER TABLE public.new_skus_refresh ALTER COLUMN replacement_product_codes TYPE _varchar USING replacement_product_codes::_varchar');
	execute v_sql3;
	v_sql := format('ALTER TABLE public.new_skus_refresh ALTER COLUMN rcl_hash TYPE JSONB USING rcl_hash::JSONB::JSONB');
	execute v_sql;
	--execute v_sql,v_sql1,v_sql2,v_sql3;
	END IF;

	IF  p_source_table in ('placeholders_info_refresh')
	then 
	v_sql4 := format('ALTER TABLE public.placeholders_info_refresh ALTER COLUMN attributes TYPE JSONB USING attributes::JSONB::JSONB');
	execute v_sql4;
	END IF;
END;
$procedure$
;
