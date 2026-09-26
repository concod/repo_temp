--liquibase formatted sql
--changeset akash.bhandari:inventory_smart_get_product_profiles runOnChange:true stripComments:false splitStatements:false context:initial labels:inventory_smart_get_product_profiles MTP-103848
--comment: Initial changeset for get_product_profiles function in inventory_smart schema
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.get_product_profiles(refcursor, text);

CREATE OR REPLACE FUNCTION inventory_smart.get_product_profiles(input refcursor, p_article text)
 RETURNS refcursor
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_uuid text := replace(gen_random_uuid()::text, '-', '');
    v_prod_data_table text := format('prod_data_%s', v_uuid);
    v_query text;
    v_query_combine text;
    v_special_classification text;
    v_pp_code bigint;
BEGIN
    -- Drop temp table if exists
    v_query := format('DROP TABLE IF EXISTS %I CASCADE;', v_prod_data_table);
    EXECUTE v_query;

    -- Create temp product data table
    v_query := format(
        'CREATE UNLOGGED TABLE %I AS
         SELECT unnest(product_codes) AS product_code
         FROM inventory_smart.ph_master
         WHERE article = %L;',
        v_prod_data_table,
        p_article
    );
    EXECUTE v_query;

    -- First, get pp_code and special_classification
    SELECT g.default_product_profile, ppm.special_classification
    INTO v_pp_code, v_special_classification
    FROM inventory_smart.generate_rcl_dc_store_policy(v_prod_data_table, 10003, current_date) g
    LEFT JOIN inventory_smart.product_profile_master ppm
           ON g.default_product_profile = ppm.pp_code;

	RAISE NOTICE 'default_product_profile: %', v_pp_code;
	RAISE NOTICE 'v_special_classification: %', v_special_classification;

    -- Decide logic based on classification
    IF v_pp_code IS NULL THEN

		-- IA: return article + size level contribution
		-- Try to fetch pp_code dynamically for this article
	    SELECT pp_code
	    INTO v_pp_code
	    FROM inventory_smart.product_profile_master
	    WHERE name = p_article
	      AND NOT is_deleted
	    LIMIT 1;

		RAISE NOTICE 'v_pp_code: %', v_pp_code;

        v_query_combine := format(
            $sql$
            SELECT 
                saf.store_code,
                saf.store_name,
                saf.channel,
                paf.article,
                COALESCE(ppm.overall_proportion, 0) AS overall_proportion,
                COALESCE(ppm.size_level_proportion, 0) AS size_level_proportion,
                paf."size"
            FROM inventory_smart.product_profile_mapping ppm
            RIGHT JOIN "global".product_attributes_filter paf 
                   ON paf.product_code = ppm.product_code
                  AND ppm.pp_code = %1$s
            JOIN "global".store_attributes_filter saf 
                   USING(store_code)
            GROUP BY saf.store_code, saf.store_name, saf.channel,
                     paf.article, ppm.overall_proportion, 
                     ppm.size_level_proportion, paf."size"
            ORDER BY saf.store_code
            $sql$,
            v_pp_code
        );

    ELSE
		v_query_combine := format(
		$sql$

		WITH distinct_sizes as MATERIALIZED(
		    SELECT DISTINCT size FROM global.product_attributes_filter
		    where article = %1$s
		)
		select
		    saf.store_code,
		    saf.store_name,
		    saf.channel,
		    pum.overall_proportion,
		    pum.size_level_proportion,
		    pum.size
		from inventory_smart.product_profile_user_mapping_size pum
		join global.store_attributes_filter saf using(store_code)
		join distinct_sizes ds on ds.size = pum.size
		where pum.pp_code = %2$L
		group by 1, 2, 3, 4, 5, 6
		order by 1
            $sql$,
			p_article,
            v_pp_code

        );
    END IF;

    RAISE NOTICE 'Final query_combine: %', v_query_combine;

    OPEN $1 FOR EXECUTE v_query_combine;
    RETURN $1;
END;
$function$
;
