--liquibase formatted sql
--changeset navya.modepalli@impactanalytics.co:preallocation_po_alerts stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--inventory_smart.preallocation_po_alerts definition

CREATE TABLE inventory_smart.preallocation_po_alerts (
            raw_po_code VARCHAR NULL,
            anticipate_date DATE NULL,
            purchqty int4  NULL,
            qtyreceived int4  NULL,
            available_qty int4  NULL,
            asn_id VARCHAR NULL,
            dc_number VARCHAR NULL,
            dest_whouse VARCHAR NULL,
            article VARCHAR NULL,
            product_code VARCHAR NULL,
            channel VARCHAR NULL,
            style_color_id_og VARCHAR NULL,
            product_description VARCHAR NULL,
            l0_name VARCHAR NULL,
            l1_name VARCHAR NULL,
            l2_name VARCHAR NULL,
            l3_name VARCHAR NULL,
            l4_name VARCHAR NULL,
            brand VARCHAR NULL,
            rtl_coordinate_group_desc VARCHAR NULL,
            store_group VARCHAR NULL,
            CONSTRAINT preallocation_po_alerts_un UNIQUE (product_code,dc_number)

);

--changeset navya.modepalli@impactanalytics.co:preallocation_po_alerts_v1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Added 1 new column
ALTER TABLE inventory_smart.preallocation_po_alerts ADD retail_region varchar NULL;

--changeset navya.modepalli@impactanalytics.co:preallocation_po_alerts_v2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Added 1 new column
ALTER TABLE inventory_smart.preallocation_po_alerts ADD s1_id varchar NULL;


--changeset abhi.bhardwaj@impactanalytics.co:preallocation_po_alerts_v1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Changed datatype of store_group
ALTER TABLE inventory_smart.preallocation_po_alerts ALTER COLUMN store_group TYPE _varchar USING ARRAY[store_group];