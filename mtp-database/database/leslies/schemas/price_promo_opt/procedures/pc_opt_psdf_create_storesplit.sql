--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_opt_psdf_create_storesplit runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_opt_psdf_create_storesplit

DROP PROCEDURE IF EXISTS price_promo_opt.pc_opt_psdf_create_storesplit ;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_opt_psdf_create_storesplit(IN temp_table_name character varying, IN var_promo_id integer, IN max_week_start_date date, IN max_week_end_date date)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$

DECLARE

start_time timestamp; end_time timestamp; query TEXT; 

begin

    query := format($q$
        DROP TABLE IF EXISTS %s_opt_tmp_store_split_ratio;
        CREATE UNLOGGED TABLE %s_opt_tmp_store_split_ratio AS

        WITH 
        se AS materialized (
            SELECT stm.store_id, stm.s0_id, stm.s3_id
            FROM price_promo.fn_fetch_stores_for_promo(%s) fsp
            INNER JOIN global.tb_store_master stm USING(store_id)
        ),

        se_hierarchy AS (
            SELECT DISTINCT s0_id, s3_id
            FROM se
        ),

        pe AS materialized (
            SELECT DISTINCT  product_id, l0_cid, l1_cid, l2_cid, l3_cid, 
            promo_id, 
            c0_id 
			FROM %s_opt_base df
        ),

        pe_prod AS (
            SELECT DISTINCT product_id, c0_id
            FROM pe
        ),

		pe_product AS materialized(
		            SELECT DISTINCT df.promo_id, df.product_id, df.l0_cid, l1_cid, l2_cid, l3_cid
		            from pe df
		),

        pe_l3 AS (
            SELECT DISTINCT c0_id, l0_cid, l1_cid, l2_cid, l3_cid
            FROM pe 
        ),

        sso_kvi AS (
            SELECT product_id, s0_id, s3_id, c0_id, week_start_date,
                   SUM(store_split_ratio) AS store_split_ratio_kvi
            FROM (
                SELECT *, store_split_ratio AS store_split_ratio_kvi
                FROM price_promo_opt.tb_store_split_opt_kvi
                WHERE week_start_date BETWEEN '%s' AND '%s'
            ) sso_kvi
            INNER JOIN se USING(store_id)
            INNER JOIN pe_prod USING(product_id, c0_id)
            GROUP BY 1,2,3,4,5
        ),

        sso AS (
            SELECT l0_cid, l1_cid, l2_cid, l3_cid, s0_id, s3_id, week_start_date, c0_id,
                   SUM(store_split_ratio) AS store_split_ratio
            FROM (
                SELECT *
                FROM price_promo_opt.tb_store_split_opt
                WHERE week_start_date BETWEEN '%s' AND '%s'
            ) sso
            INNER JOIN se USING(store_id)
            INNER JOIN pe_l3 USING(l0_cid, l1_cid, l2_cid, l3_cid, c0_id)
            GROUP BY 1,2,3,4,5,6,7,8
        )
		  SELECT
		      -- keys
		      COALESCE(k.week_start_date, s.week_start_date) AS week_start_date,
		      COALESCE(k.s0_id,         s.s0_id)             AS s0_id,
		      COALESCE(k.s3_id,         s.s3_id)             AS s3_id,
		      COALESCE(k.c0_id,         s.c0_id)             AS c0_id,
		      -- KVI product key (NULL when SSO-only row)
		      coalesce(k.product_id,s.product_id) as product_id,
		      -- ratios
		      coalesce(k.store_split_ratio_kvi, s.store_split_ratio) store_split_ratio
		  FROM 
		  (select sso.*, pe_product.product_id from sso inner join pe_product using(l0_cid, l1_cid, l2_cid, l3_cid) ) AS s
		  FULL OUTER JOIN sso_kvi AS k
		  using(week_start_date,s0_id, s3_id, c0_id, product_id)
;
    $q$,
    temp_table_name,                -- DROP TABLE
    temp_table_name,                -- CREATE TABLE
    var_promo_id,                -- fn_fetch_stores_for_promo 1
    temp_table_name,            -- pe
    max_week_start_date,  -- week_start_date from
    max_week_end_date,    -- week_start_date to
    max_week_start_date,  -- again
    max_week_end_date     -- again
    );
	start_time := clock_timestamp();
    RAISE NOTICE 'store split table: %', query;
    EXECUTE query;
	end_time := clock_timestamp();
	RAISE NOTICE 'Time taken s_opt_tmp_store_split_ratio : %', end_time - start_time;
	
end; 
$procedure$
;
