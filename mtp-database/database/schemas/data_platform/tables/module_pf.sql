--liquibase formatted sql
--changeset manoj.solanki@impactanalytics.co:config stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: initial changeset for config

CREATE TABLE IF NOT EXISTS data_platform.module_pf
(
    sub_module_id serial NOT NULL,
    module_name character varying NOT NULL,
    module_display_name character varying NOT NULL,
    module_description character varying NOT NULL,
    sub_module_name character varying NOT NULL,
    sub_module_display_name character varying NOT NULL,
    sub_module_description character varying NOT NULL,
    status boolean DEFAULT false,
    CONSTRAINT sub_mod_id_pk PRIMARY KEY (sub_module_id)
    
);


INSERT INTO data_platform.module_pf (module_name,module_display_name,module_description,sub_module_name,sub_module_display_name,sub_module_description,status) VALUES
	 ('data_extraction','Data Extraction','Data Extraction','data_source','Data Sources','Data Sources',false),
	 ('data_extraction','Data Extraction','Data Extraction','mapping_table','Mapping Table','Mapping Table',false),
	 ('data_extraction','Data Extraction','Data Extraction','sourcing_configuration','Sourcing Configuration','Sourcing Configuration',false),
	 ('data_extraction','Data Extraction','Data Extraction','triggers','Triggers','Triggers',false),
	 ('data_sourcing','Data Sourcing','Data Sourcing','intermediate_queries','Intermediate Queries','Business logic review and approval',false),
	 ('data_validation_and_transformation','Data Validation and Transformation','Data Validation and Transformation','ingestion_configuration','Ingestion Configuration','Ingestion Configuration',false),
	 ('data_validation_and_transformation','Data Validation and Transformation','Data Validation and Transformation','generic_mapping_table','Generic Mapping Table List','Generic Mappping Table List',false),
	 ('data_validation_and_transformation','Data Validation and Transformation','Data Validation and Transformation','generic_schema_mapping','Generic Schema Mappings','Generic Mappping Table List',false),
	 ('data_validation_and_transformation','Data Validation and Transformation','Data Validation and Transformation','qc_module','QC Module','QC Module',false),
	 ('product_intergration','Product Integrations','Product Integrations','derived_table','Derived Tables','Derived Tables',false),
	 ('mlops','Mlops & ADA','Mlops & ADA','master_table','Master Table','Master Table',false),
	 ('mlops','Mlops & ADA','Mlops & ADA','lsi','Lost Sales Imputation','Lost Sales Imputation',false),
	 ('mlops','Mlops & ADA','Mlops & ADA','store_clustering','Store Clustering','Store Clustering',false),
	 ('mlops','Mlops & ADA','Mlops & ADA','fmt','Feature Modeling table','Feature Modeling table',false);

--changeset manoj.solanki@impactanalytics.co:config_update stripComments:false splitStatements:false context:Release_1_2 labels:module_pf
--comment: spelling fix
UPDATE data_platform.module_pf set module_name='product_integration' where sub_module_name='derived_table';
