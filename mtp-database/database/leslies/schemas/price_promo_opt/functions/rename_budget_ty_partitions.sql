--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:rename_budget_ty_partitions runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for rename_budget_ty_partitions

DROP FUNCTION IF EXISTS price_promo_opt.rename_budget_ty_partitions ;
CREATE OR REPLACE FUNCTION price_promo_opt.rename_budget_ty_partitions()
 RETURNS void
 LANGUAGE plpgsql
AS $function$

DECLARE

    partition_name TEXT;

    new_partition_name TEXT;

BEGIN

    FOR partition_name IN (

        SELECT c.relname

        FROM pg_catalog.pg_class c

        JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace

        WHERE c.relkind = 'p'  -- 'p' for partitioned table

          AND c.relname LIKE 'tb_budget_master_ty_p%'

          AND n.nspname = 'price_promo_opt'

    ) LOOP

        -- Construct the new partition name by removing the '_p' prefix

        new_partition_name := REPLACE(partition_name, '_p', '');



        -- Rename the partition

        EXECUTE FORMAT('ALTER TABLE price_promo_opt.%I RENAME TO %I', partition_name, new_partition_name);

    END LOOP;

END;

$function$
;
