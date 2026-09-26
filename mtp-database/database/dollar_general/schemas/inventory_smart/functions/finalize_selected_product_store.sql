--liquibase formatted sql
--changeset liquibase:finalize_selected_product_store runOnChange:true stripComments:false splitStatements:false context:MTP-63848 labels:MTP-63848
--comment: feature/MTP-63848 store band details for list of articles
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.finalize_selected_product_store(refcursor, varchar, varchar, varchar[], varchar, varchar);
CREATE OR REPLACE FUNCTION inventory_smart.finalize_selected_product_store(input refcursor, allocation_code character varying, store_code character varying, article_list character varying[], ignore_allocation_code character varying, type character varying)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
DECLARE
    _query_combine text;
    _store_filter1 text;
    _store_filter2 text;
    _article_filter text;
    _final_inv_query text;
    _priority_allocation text;
BEGIN
    _store_filter1 := '';
    _article_filter := '';
    _store_filter2 := '';
    _priority_allocation := '';
    
    IF ignore_allocation_code = '' THEN
        _priority_allocation := allocation_code;
    ELSE
        _priority_allocation := ignore_allocation_code;
    END IF;

    IF (store_code = '') IS FALSE THEN
        _store_filter1 := format($$WHERE store_code = '%s'$$, store_code);
        _store_filter2 := format($$WHERE a.store_code = '%s'$$, store_code);
    END IF;

    -- Update to handle array of articles
    IF array_length(article_list, 1) IS NOT NULL THEN
        _article_filter := format($$AND carfs.article = ANY (%L)$$, article_list);
    END IF;

    _query_combine := format($$
        WITH base_table AS MATERIALIZED (
            SELECT carfs.article, 
                   carfs.allocated_total, carfs.store_name, carfs.oh, carfs.oo, carfs.it,
                   carfs.wos, carfs.pack_dc_allocation, carfs.min, carfs.max, 
                   channel, store store_code, retail_size_cd size, updated_oh_oo_it, saf.store_attribute
            FROM inventory_smart.create_allocation_result_flat_gurobi carfs
            LEFT JOIN global.store_attributes_filter saf ON store_code = store
            WHERE allocation_code = '%1$s' %2$s
        ),
        base_table_min_wos AS (
            SELECT b.*, l0_name, l1_code, l2_code, l3_code, l4_code, l0_code, l1_name, l3_name
            FROM (
                SELECT b.*, 
                       GREATEST(0, MIN - (updated_oh_oo_it)) AS min_short,
                       GREATEST(0, allocated_total - GREATEST(0, MIN - (updated_oh_oo_it))) AS wos_allocation,
                       LEAST(allocated_total, GREATEST(0, MIN - (updated_oh_oo_it))) AS min_allocation
                FROM base_table b
            ) b 
            JOIN global.product_attributes_filter paf ON paf.product_code = b.article
        ),
        store_level_base_table AS (
            SELECT store_code,
                   article,
                   store_name,
                   l0_code,
                   l0_name, 
                   l1_code, 
                   l2_code, 
                   l3_code,
                   l4_code,
                   l1_name, 
                   l3_name,
                   SUM(oh) AS oh,
                   SUM(oo) AS oo,
                   SUM(it) AS it,
                   SUM(min) AS min_store,
                   SUM(max) AS max_store,
                   SUM(allocated_total) AS allocated_quantity,
                   COALESCE(SUM(min_allocation), 0) AS min_allocation,
                   COALESCE(SUM(wos_allocation), 0) AS wos_allocation
            FROM base_table_min_wos
            GROUP BY article, store_code, store_name, l0_code, l0_name, l1_code, l2_code, l3_code, l4_code, l1_name, l3_name
        ),
        store_band_level_base_table AS MATERIALIZED (
            SELECT distinct psaf.psa_name, psaf.store_group_description, slbt.*   
            FROM store_level_base_table slbt 
            LEFT JOIN global.product_store_attributes_filter psaf 
            ON md5(slbt.l0_code || slbt.l1_code || slbt.l3_code || slbt.l4_code || slbt.store_code) = md5(psaf.l0_code || psaf.l1_code || psaf.l3_code || psaf.l4_code || psaf.store_code)
        ),
        store_band AS MATERIALIZED (
            SELECT psa_name,
                   article,
                   l0_code,
                   l1_name,
                   l3_name,
                   COALESCE(SUM(oh),0) AS oh,
                   COALESCE(SUM(oo),0) AS oo,
                   COALESCE(SUM(it),0) AS it,
                   COALESCE(SUM(oh), 0) + COALESCE(SUM(oo), 0) + COALESCE(SUM(it), 0) AS oh_oo_it_total,
                   ROUND(COALESCE(AVG(min_store),0)) AS min_store,
                   ROUND(COALESCE(AVG(max_store),0)) AS max_store,
                   COALESCE(SUM(allocated_quantity),0) AS allocated_quantity,
                   COALESCE(SUM(min_allocation), 0) AS min_allocation_dc,
                   COALESCE(SUM(wos_allocation), 0) AS allocated_for_wos
            FROM store_band_level_base_table
            GROUP BY psa_name, article, l0_code, l1_name, l3_name
        ),
        cnt_table AS (
            SELECT psa_name, article, COALESCE(COUNT(DISTINCT store_code),0) AS stores_cnt 
            FROM store_band_level_base_table 
            WHERE allocated_quantity > 0 
            GROUP BY psa_name, article
        )
        SELECT 
            slb.*,
            COALESCE(ct.stores_cnt, 0) AS stores_cnt
        FROM store_band slb
        LEFT JOIN cnt_table ct ON slb.psa_name = ct.psa_name AND slb.article = ct.article
        ORDER BY article, psa_name
    $$, allocation_code, _article_filter);

    RAISE NOTICE '%', _query_combine;
    OPEN input FOR EXECUTE _query_combine;  
    RETURN input;
END;
$function$
;