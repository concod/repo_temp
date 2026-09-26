export const FILTER_DATA = {
  "data": {
    "total": null,
    "page": null,
    "count": null,
    "status": true,
    "data": [
        {
            "dimensions": [
                {
                    "product": [
                        {
                            "sub_dimension": []
                        }
                    ]
                }
            ],
            "saved_filters": {
                "fc_code": "##",
                "name": "Rules Constraints",
                "mappings": [
                    {
                        "fc_code": 1,
                        "label": "Sales Organisation",
                        "column_name": "l0_name",
                        "type": "cascaded",
                        "display_type": "dropdown",
                        "level": 1,
                        "dimension": "product",
                        "is_mandatory": true,
                        "is_multiple_selection": false,
                        "range_min": null,
                        "range_max": null,
                        "default_value": null,
                        "is_disabled": false,
                        "is_clearable": true,
                        "display_order": 1,
                        "is_required": false,
                        "extra": {},
                        "is_deleted": false,
                        "is_hierarchy": true
                    },
                    {
                        "fc_code": 1,
                        "label": "Category",
                        "column_name": "l1_name",
                        "type": "cascaded",
                        "display_type": "dropdown",
                        "level": 1,
                        "dimension": "product",
                        "is_mandatory": true,
                        "is_multiple_selection": true,
                        "range_min": null,
                        "range_max": null,
                        "default_value": null,
                        "is_disabled": false,
                        "is_clearable": true,
                        "display_order": 2,
                        "is_required": false,
                        "extra": {},
                        "is_deleted": false,
                        "is_hierarchy": true
                    },
                    {
                        "fc_code": 1,
                        "label": "Sub Category",
                        "column_name": "l2_name",
                        "type": "cascaded",
                        "display_type": "dropdown",
                        "level": 1,
                        "dimension": "product",
                        "is_mandatory": true,
                        "is_multiple_selection": true,
                        "range_min": null,
                        "range_max": null,
                        "default_value": null,
                        "is_disabled": false,
                        "is_clearable": true,
                        "display_order": 3,
                        "is_required": false,
                        "extra": {},
                        "is_deleted": false,
                        "is_hierarchy": true
                    },
                    {
                        "fc_code": 1,
                        "label": "Brand",
                        "column_name": "l3_name",
                        "type": "cascaded",
                        "display_type": "dropdown",
                        "level": 1,
                        "dimension": "product",
                        "is_mandatory": false,
                        "is_multiple_selection": true,
                        "range_min": null,
                        "range_max": null,
                        "default_value": null,
                        "is_disabled": false,
                        "is_clearable": true,
                        "display_order": 4,
                        "is_required": false,
                        "extra": {},
                        "is_deleted": false,
                        "is_hierarchy": false
                    },
                    {
                        "fc_code": 1,
                        "label": "Merchandise Category",
                        "column_name": "l4_name",
                        "type": "cascaded",
                        "display_type": "dropdown",
                        "level": 1,
                        "dimension": "product",
                        "is_mandatory": false,
                        "is_multiple_selection": true,
                        "range_min": null,
                        "range_max": null,
                        "default_value": null,
                        "is_disabled": false,
                        "is_clearable": true,
                        "display_order": 5,
                        "is_required": false,
                        "extra": {},
                        "is_deleted": false,
                        "is_hierarchy": false
                    },
                    {
                        "fc_code": 1,
                        "label": "Local Flag",
                        "column_name": "local_flag",
                        "type": "cascaded",
                        "display_type": "dropdown",
                        "level": 1,
                        "dimension": "product",
                        "is_mandatory": false,
                        "is_multiple_selection": true,
                        "range_min": null,
                        "range_max": null,
                        "default_value": null,
                        "is_disabled": false,
                        "is_clearable": true,
                        "display_order": 6,
                        "is_required": false,
                        "extra": {},
                        "is_deleted": false,
                        "is_hierarchy": false
                    },
                    {
                        "fc_code": 1,
                        "label": "Value Stream",
                        "column_name": "info_lifecycle_description",
                        "type": "cascaded",
                        "display_type": "dropdown",
                        "level": 1,
                        "dimension": "product",
                        "is_mandatory": false,
                        "is_multiple_selection": true,
                        "range_min": null,
                        "range_max": null,
                        "default_value": null,
                        "is_disabled": false,
                        "is_clearable": true,
                        "display_order": 7,
                        "is_required": false,
                        "extra": {},
                        "is_deleted": false,
                        "is_hierarchy": false
                    }
                ]
            },
            "dimension_filter_mapping": {
                "filters": [
                    {
                        "label": "Cost",
                        "column_name": "cost",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": true,
                        "dimension": "product"
                    },
                    {
                        "label": "Original Price",
                        "column_name": "original_price",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": true,
                        "dimension": "product"
                    },
                    {
                        "label": "Created At",
                        "column_name": "created_at",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": true,
                        "dimension": "product"
                    },
                    {
                        "label": "Updated At",
                        "column_name": "updated_at",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": true,
                        "dimension": "product"
                    },
                    {
                        "label": "Product Code",
                        "column_name": "product_code",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": true,
                        "dimension": "product"
                    },
                    {
                        "label": "Product Name",
                        "column_name": "product_name",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": true,
                        "dimension": "product"
                    },
                    {
                        "label": "Product Description",
                        "column_name": "product_description",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": true,
                        "dimension": "product"
                    },
                    {
                        "label": "Division",
                        "column_name": "l0_name",
                        "is_hierarchy": true,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Gender",
                        "column_name": "l1_name",
                        "is_hierarchy": true,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Category",
                        "column_name": "l2_name",
                        "is_hierarchy": true,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Class",
                        "column_name": "l3_name",
                        "is_hierarchy": true,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "F Style Franchise",
                        "column_name": "f_style_franchise",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Price",
                        "column_name": "price",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": true,
                        "dimension": "product"
                    },
                    {
                        "label": "F Style",
                        "column_name": "l4_name",
                        "is_hierarchy": true,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "F Style Description",
                        "column_name": "style_name",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Color Name",
                        "column_name": "color_name",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Color Family",
                        "column_name": "color_family_name",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Color Code",
                        "column_name": "color_id",
                        "is_hierarchy": true,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Tall Petite Size",
                        "column_name": "tall_petite_size",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Style Color Sku Code",
                        "column_name": "article",
                        "is_hierarchy": true,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Style Color Code",
                        "column_name": "style_color_code",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Base Size",
                        "column_name": "base_size",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Size",
                        "column_name": "size",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Product Life Cycle",
                        "column_name": "product_lifecycle",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Color Type V2",
                        "column_name": "color_type",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "F Licensed Vs Non Licensed",
                        "column_name": "f_licensed_vs_non_licensed",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "License Type",
                        "column_name": "license_type",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "F Launch Date",
                        "column_name": "launch_date",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "F Silhouette",
                        "column_name": "f_silhouette",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "F Inseam Body Length",
                        "column_name": "f_inseam_body_length",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "F Waistband",
                        "column_name": "f_waistband",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "F Closure",
                        "column_name": "f_closure",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "F Leg Shape",
                        "column_name": "f_leg_shape",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "F Neckline",
                        "column_name": "f_neckline",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "F Sleeve Length",
                        "column_name": "f_sleeve_length",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "F Sleeve Type",
                        "column_name": "f_sleeve_type",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "F Rise",
                        "column_name": "f_rise",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "F Style Fabric",
                        "column_name": "f_style_fabric",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Clearance",
                        "column_name": "clearance",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": true,
                        "dimension": "product"
                    },
                    {
                        "label": "Receipt Date",
                        "column_name": "receipt_date",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": true,
                        "dimension": "product"
                    },
                    {
                        "label": "Product Bucket Code",
                        "column_name": "product_bucket_code",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Active",
                        "column_name": "active",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": true,
                        "dimension": "product"
                    },
                    {
                        "label": "Vendor Id",
                        "column_name": "vendor_id",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Vendor Desc",
                        "column_name": "vendor_desc",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Style Type V2",
                        "column_name": "style_type_v2",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Factory",
                        "column_name": "factory",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Style Type",
                        "column_name": "style_type",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Assort Product Type",
                        "column_name": "assort_product_type",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Ordering",
                        "column_name": "ordering",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Replenish Status",
                        "column_name": "replenish_status",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Replenishment Status",
                        "column_name": "replenishment_status",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "product group",
                        "column_name": "product_group",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Store Description",
                        "column_name": "store_description",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": true,
                        "dimension": "store"
                    },
                    {
                        "label": "Special Classification",
                        "column_name": "special_classification",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": true,
                        "dimension": "store"
                    },
                    {
                        "label": "Created At",
                        "column_name": "created_at",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": true,
                        "dimension": "store"
                    },
                    {
                        "label": "Updated At",
                        "column_name": "updated_at",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": true,
                        "dimension": "store"
                    },
                    {
                        "label": "Dc Code",
                        "column_name": "dc_code",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": true,
                        "dimension": "store"
                    },
                    {
                        "label": "Fc Code",
                        "column_name": "fc_code",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": true,
                        "dimension": "store"
                    },
                    {
                        "label": "Store Name",
                        "column_name": "store_name",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": true,
                        "dimension": "store"
                    },
                    {
                        "label": "Store Code",
                        "column_name": "store_code",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": true,
                        "dimension": "store"
                    },
                    {
                        "label": "Channel",
                        "column_name": "channel",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "store"
                    },
                    {
                        "label": "Active",
                        "column_name": "active",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": true,
                        "dimension": "store"
                    },
                    {
                        "label": "City",
                        "column_name": "s2_name",
                        "is_hierarchy": true,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "store"
                    },
                    {
                        "label": "Country",
                        "column_name": "s0_name",
                        "is_hierarchy": true,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "store"
                    },
                    {
                        "label": "Province",
                        "column_name": "s1_name",
                        "is_hierarchy": true,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "store"
                    },
                    {
                        "label": "Zip",
                        "column_name": "zip",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "store"
                    },
                    {
                        "label": "Is Retail Store",
                        "column_name": "is_retail_store",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "store"
                    },
                    {
                        "label": "Retail Store Opened At",
                        "column_name": "open_date",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "store"
                    },
                    {
                        "label": "Is Distribution Center",
                        "column_name": "is_distribution_center",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "store"
                    },
                    {
                        "label": "Dc Name",
                        "column_name": "dc_name",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "store"
                    },
                    {
                        "label": "Channel ",
                        "column_name": "channel_name",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "store"
                    },
                    {
                        "label": "Like Store Id",
                        "column_name": "like_store_id",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "store"
                    },
                    {
                        "label": "store group",
                        "column_name": "store_group",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": false,
                        "dimension": "store"
                    },
                    {
                        "label": "Cost",
                        "column_name": "cost",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": true,
                        "dimension": "product"
                    },
                    {
                        "label": "Original Price",
                        "column_name": "original_price",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": true,
                        "dimension": "product"
                    },
                    {
                        "label": "Created At",
                        "column_name": "created_at",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": true,
                        "dimension": "product"
                    },
                    {
                        "label": "Updated At",
                        "column_name": "updated_at",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": true,
                        "dimension": "product"
                    },
                    {
                        "label": "Product Code",
                        "column_name": "product_code",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": true,
                        "dimension": "product"
                    },
                    {
                        "label": "Product Name",
                        "column_name": "product_name",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": true,
                        "dimension": "product"
                    },
                    {
                        "label": "Product Description",
                        "column_name": "product_description",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": true,
                        "dimension": "product"
                    },
                    {
                        "label": "Division",
                        "column_name": "l0_name",
                        "is_hierarchy": true,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Gender",
                        "column_name": "l1_name",
                        "is_hierarchy": true,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Category",
                        "column_name": "l2_name",
                        "is_hierarchy": true,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Class",
                        "column_name": "l3_name",
                        "is_hierarchy": true,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "F Style Franchise",
                        "column_name": "f_style_franchise",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Price",
                        "column_name": "price",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": true,
                        "dimension": "product"
                    },
                    {
                        "label": "F Style",
                        "column_name": "l4_name",
                        "is_hierarchy": true,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "F Style Description",
                        "column_name": "style_name",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Color Name",
                        "column_name": "color_name",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Color Family",
                        "column_name": "color_family_name",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Color Code",
                        "column_name": "color_id",
                        "is_hierarchy": true,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Tall Petite Size",
                        "column_name": "tall_petite_size",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Style Color Sku Code",
                        "column_name": "article",
                        "is_hierarchy": true,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Style Color Code",
                        "column_name": "style_color_code",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Base Size",
                        "column_name": "base_size",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Size",
                        "column_name": "size",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Product Life Cycle",
                        "column_name": "product_lifecycle",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Color Type V2",
                        "column_name": "color_type",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "F Licensed Vs Non Licensed",
                        "column_name": "f_licensed_vs_non_licensed",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "License Type",
                        "column_name": "license_type",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "F Launch Date",
                        "column_name": "launch_date",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "F Silhouette",
                        "column_name": "f_silhouette",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "F Inseam Body Length",
                        "column_name": "f_inseam_body_length",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "F Waistband",
                        "column_name": "f_waistband",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "F Closure",
                        "column_name": "f_closure",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "F Leg Shape",
                        "column_name": "f_leg_shape",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "F Neckline",
                        "column_name": "f_neckline",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "F Sleeve Length",
                        "column_name": "f_sleeve_length",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "F Sleeve Type",
                        "column_name": "f_sleeve_type",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "F Rise",
                        "column_name": "f_rise",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "F Style Fabric",
                        "column_name": "f_style_fabric",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Clearance",
                        "column_name": "clearance",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": true,
                        "dimension": "product"
                    },
                    {
                        "label": "Receipt Date",
                        "column_name": "receipt_date",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": true,
                        "dimension": "product"
                    },
                    {
                        "label": "Product Bucket Code",
                        "column_name": "product_bucket_code",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Active",
                        "column_name": "active",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": true,
                        "dimension": "product"
                    },
                    {
                        "label": "Vendor Id",
                        "column_name": "vendor_id",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Vendor Desc",
                        "column_name": "vendor_desc",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Style Type V2",
                        "column_name": "style_type_v2",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Factory",
                        "column_name": "factory",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Style Type",
                        "column_name": "style_type",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Assort Product Type",
                        "column_name": "assort_product_type",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Ordering",
                        "column_name": "ordering",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Replenish Status",
                        "column_name": "replenish_status",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Replenishment Status",
                        "column_name": "replenishment_status",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "product group",
                        "column_name": "product_group",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Store Description",
                        "column_name": "store_description",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": true,
                        "dimension": "store"
                    },
                    {
                        "label": "Special Classification",
                        "column_name": "special_classification",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": true,
                        "dimension": "store"
                    },
                    {
                        "label": "Created At",
                        "column_name": "created_at",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": true,
                        "dimension": "store"
                    },
                    {
                        "label": "Updated At",
                        "column_name": "updated_at",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": true,
                        "dimension": "store"
                    },
                    {
                        "label": "Dc Code",
                        "column_name": "dc_code",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": true,
                        "dimension": "store"
                    },
                    {
                        "label": "Fc Code",
                        "column_name": "fc_code",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": true,
                        "dimension": "store"
                    },
                    {
                        "label": "Store Name",
                        "column_name": "store_name",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": true,
                        "dimension": "store"
                    },
                    {
                        "label": "Store Code",
                        "column_name": "store_code",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": true,
                        "dimension": "store"
                    },
                    {
                        "label": "Channel",
                        "column_name": "channel",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "store"
                    },
                    {
                        "label": "Active",
                        "column_name": "active",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": true,
                        "dimension": "store"
                    },
                    {
                        "label": "City",
                        "column_name": "s2_name",
                        "is_hierarchy": true,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "store"
                    },
                    {
                        "label": "Country",
                        "column_name": "s0_name",
                        "is_hierarchy": true,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "store"
                    },
                    {
                        "label": "Province",
                        "column_name": "s1_name",
                        "is_hierarchy": true,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "store"
                    },
                    {
                        "label": "Zip",
                        "column_name": "zip",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "store"
                    },
                    {
                        "label": "Is Retail Store",
                        "column_name": "is_retail_store",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "store"
                    },
                    {
                        "label": "Retail Store Opened At",
                        "column_name": "open_date",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "store"
                    },
                    {
                        "label": "Is Distribution Center",
                        "column_name": "is_distribution_center",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "store"
                    },
                    {
                        "label": "Dc Name",
                        "column_name": "dc_name",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "store"
                    },
                    {
                        "label": "Channel ",
                        "column_name": "channel_name",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "store"
                    },
                    {
                        "label": "Like Store Id",
                        "column_name": "like_store_id",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "store"
                    },
                    {
                        "label": "store group",
                        "column_name": "store_group",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": false,
                        "dimension": "store"
                    }
                ]
            }
        },
        {
            "dimensions": [
                {
                    "product": [
                        {
                            "sub_dimension": []
                        }
                    ]
                }
            ],
            "saved_filters": {
                "fc_code": "##2",
                "name": "Rules Constraint Filters",
                "mappings": [
                    {
                        "fc_code": 10019,
                        "label": "Division",
                        "column_name": "l0_name",
                        "type": "cascaded",
                        "display_type": "dropdown",
                        "level": 1,
                        "dimension": "product",
                        "is_mandatory": true,
                        "is_multiple_selection": false,
                        "range_min": null,
                        "range_max": null,
                        "default_value": null,
                        "is_disabled": false,
                        "is_clearable": true,
                        "display_order": 1,
                        "is_required": false,
                        "extra": {},
                        "is_deleted": false,
                        "is_hierarchy": true
                    },
                    {
                        "fc_code": 10019,
                        "label": "Gender",
                        "column_name": "l1_name",
                        "type": "cascaded",
                        "display_type": "dropdown",
                        "level": 1,
                        "dimension": "product",
                        "is_mandatory": true,
                        "is_multiple_selection": false,
                        "range_min": null,
                        "range_max": null,
                        "default_value": null,
                        "is_disabled": false,
                        "is_clearable": true,
                        "display_order": 2,
                        "is_required": false,
                        "extra": {},
                        "is_deleted": false,
                        "is_hierarchy": true
                    },
                    {
                        "fc_code": 10019,
                        "label": "Category",
                        "column_name": "l2_name",
                        "type": "cascaded",
                        "display_type": "dropdown",
                        "level": 1,
                        "dimension": "product",
                        "is_mandatory": false,
                        "is_multiple_selection": false,
                        "range_min": null,
                        "range_max": null,
                        "default_value": null,
                        "is_disabled": false,
                        "is_clearable": true,
                        "display_order": 3,
                        "is_required": false,
                        "extra": {},
                        "is_deleted": false,
                        "is_hierarchy": true
                    },
                    {
                        "fc_code": 10019,
                        "label": "Class",
                        "column_name": "l3_name",
                        "type": "cascaded",
                        "display_type": "dropdown",
                        "level": 1,
                        "dimension": "product",
                        "is_mandatory": false,
                        "is_multiple_selection": false,
                        "range_min": null,
                        "range_max": null,
                        "default_value": null,
                        "is_disabled": false,
                        "is_clearable": true,
                        "display_order": 4,
                        "is_required": false,
                        "extra": {},
                        "is_deleted": false,
                        "is_hierarchy": false
                    },
                    {
                        "fc_code": 10019,
                        "label": "Style Description",
                        "column_name": "style_name",
                        "type": "cascaded",
                        "display_type": "dropdown",
                        "level": 1,
                        "dimension": "product",
                        "is_mandatory": false,
                        "is_multiple_selection": true,
                        "range_min": null,
                        "range_max": null,
                        "default_value": null,
                        "is_disabled": false,
                        "is_clearable": true,
                        "display_order": 5,
                        "is_required": false,
                        "extra": {},
                        "is_deleted": false,
                        "is_hierarchy": false
                    },
                    {
                        "fc_code": 10019,
                        "label": "Color Name",
                        "column_name": "color_id",
                        "type": "cascaded",
                        "display_type": "dropdown",
                        "level": 1,
                        "dimension": "product",
                        "is_mandatory": false,
                        "is_multiple_selection": true,
                        "range_min": null,
                        "range_max": null,
                        "default_value": null,
                        "is_disabled": false,
                        "is_clearable": true,
                        "display_order": 6,
                        "is_required": false,
                        "extra": {},
                        "is_deleted": false,
                        "is_hierarchy": false
                    },
                    {
                        "fc_code": 10019,
                        "label": "Style Collection",
                        "column_name": "style_type",
                        "type": "cascaded",
                        "display_type": "dropdown",
                        "level": 1,
                        "dimension": "product",
                        "is_mandatory": false,
                        "is_multiple_selection": true,
                        "range_min": null,
                        "range_max": null,
                        "default_value": null,
                        "is_disabled": false,
                        "is_clearable": true,
                        "display_order": 7,
                        "is_required": false,
                        "extra": {},
                        "is_deleted": false,
                        "is_hierarchy": false
                    },
                    {
                        "fc_code": 10019,
                        "label": "Replenishment Status",
                        "column_name": "replenish_status",
                        "type": "cascaded",
                        "display_type": "dropdown",
                        "level": 1,
                        "dimension": "product",
                        "is_mandatory": false,
                        "is_multiple_selection": true,
                        "range_min": null,
                        "range_max": null,
                        "default_value": null,
                        "is_disabled": false,
                        "is_clearable": true,
                        "display_order": 8,
                        "is_required": false,
                        "extra": {},
                        "is_deleted": false,
                        "is_hierarchy": false
                    },
                    {
                        "fc_code": 10019,
                        "label": "Style Fabric",
                        "column_name": "f_style_fabric",
                        "type": "cascaded",
                        "display_type": "dropdown",
                        "level": 1,
                        "dimension": "product",
                        "is_mandatory": false,
                        "is_multiple_selection": true,
                        "range_min": null,
                        "range_max": null,
                        "default_value": null,
                        "is_disabled": false,
                        "is_clearable": true,
                        "display_order": 9,
                        "is_required": false,
                        "extra": {},
                        "is_deleted": false,
                        "is_hierarchy": false
                    }
                ]
            },
            "dimension_filter_mapping": {
                "filters": [
                    {
                        "label": "Cost",
                        "column_name": "cost",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": true,
                        "dimension": "product"
                    },
                    {
                        "label": "Original Price",
                        "column_name": "original_price",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": true,
                        "dimension": "product"
                    },
                    {
                        "label": "Created At",
                        "column_name": "created_at",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": true,
                        "dimension": "product"
                    },
                    {
                        "label": "Updated At",
                        "column_name": "updated_at",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": true,
                        "dimension": "product"
                    },
                    {
                        "label": "Product Code",
                        "column_name": "product_code",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": true,
                        "dimension": "product"
                    },
                    {
                        "label": "Product Name",
                        "column_name": "product_name",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": true,
                        "dimension": "product"
                    },
                    {
                        "label": "Product Description",
                        "column_name": "product_description",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": true,
                        "dimension": "product"
                    },
                    {
                        "label": "Division",
                        "column_name": "l0_name",
                        "is_hierarchy": true,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Gender",
                        "column_name": "l1_name",
                        "is_hierarchy": true,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Category",
                        "column_name": "l2_name",
                        "is_hierarchy": true,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Class",
                        "column_name": "l3_name",
                        "is_hierarchy": true,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "F Style Franchise",
                        "column_name": "f_style_franchise",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Price",
                        "column_name": "price",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": true,
                        "dimension": "product"
                    },
                    {
                        "label": "F Style",
                        "column_name": "l4_name",
                        "is_hierarchy": true,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "F Style Description",
                        "column_name": "style_name",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Color Name",
                        "column_name": "color_name",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Color Family",
                        "column_name": "color_family_name",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Color Code",
                        "column_name": "color_id",
                        "is_hierarchy": true,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Tall Petite Size",
                        "column_name": "tall_petite_size",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Style Color Sku Code",
                        "column_name": "article",
                        "is_hierarchy": true,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Style Color Code",
                        "column_name": "style_color_code",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Base Size",
                        "column_name": "base_size",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Size",
                        "column_name": "size",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Product Life Cycle",
                        "column_name": "product_lifecycle",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Color Type V2",
                        "column_name": "color_type",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "F Licensed Vs Non Licensed",
                        "column_name": "f_licensed_vs_non_licensed",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "License Type",
                        "column_name": "license_type",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "F Launch Date",
                        "column_name": "launch_date",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "F Silhouette",
                        "column_name": "f_silhouette",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "F Inseam Body Length",
                        "column_name": "f_inseam_body_length",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "F Waistband",
                        "column_name": "f_waistband",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "F Closure",
                        "column_name": "f_closure",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "F Leg Shape",
                        "column_name": "f_leg_shape",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "F Neckline",
                        "column_name": "f_neckline",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "F Sleeve Length",
                        "column_name": "f_sleeve_length",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "F Sleeve Type",
                        "column_name": "f_sleeve_type",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "F Rise",
                        "column_name": "f_rise",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "F Style Fabric",
                        "column_name": "f_style_fabric",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Clearance",
                        "column_name": "clearance",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": true,
                        "dimension": "product"
                    },
                    {
                        "label": "Receipt Date",
                        "column_name": "receipt_date",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": true,
                        "dimension": "product"
                    },
                    {
                        "label": "Product Bucket Code",
                        "column_name": "product_bucket_code",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Active",
                        "column_name": "active",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": true,
                        "dimension": "product"
                    },
                    {
                        "label": "Vendor Id",
                        "column_name": "vendor_id",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Vendor Desc",
                        "column_name": "vendor_desc",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Style Type V2",
                        "column_name": "style_type_v2",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Factory",
                        "column_name": "factory",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Style Type",
                        "column_name": "style_type",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Assort Product Type",
                        "column_name": "assort_product_type",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Ordering",
                        "column_name": "ordering",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Replenish Status",
                        "column_name": "replenish_status",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Replenishment Status",
                        "column_name": "replenishment_status",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "product group",
                        "column_name": "product_group",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Store Description",
                        "column_name": "store_description",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": true,
                        "dimension": "store"
                    },
                    {
                        "label": "Special Classification",
                        "column_name": "special_classification",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": true,
                        "dimension": "store"
                    },
                    {
                        "label": "Created At",
                        "column_name": "created_at",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": true,
                        "dimension": "store"
                    },
                    {
                        "label": "Updated At",
                        "column_name": "updated_at",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": true,
                        "dimension": "store"
                    },
                    {
                        "label": "Dc Code",
                        "column_name": "dc_code",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": true,
                        "dimension": "store"
                    },
                    {
                        "label": "Fc Code",
                        "column_name": "fc_code",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": true,
                        "dimension": "store"
                    },
                    {
                        "label": "Store Name",
                        "column_name": "store_name",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": true,
                        "dimension": "store"
                    },
                    {
                        "label": "Store Code",
                        "column_name": "store_code",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": true,
                        "dimension": "store"
                    },
                    {
                        "label": "Channel",
                        "column_name": "channel",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "store"
                    },
                    {
                        "label": "Active",
                        "column_name": "active",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": true,
                        "dimension": "store"
                    },
                    {
                        "label": "City",
                        "column_name": "s2_name",
                        "is_hierarchy": true,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "store"
                    },
                    {
                        "label": "Country",
                        "column_name": "s0_name",
                        "is_hierarchy": true,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "store"
                    },
                    {
                        "label": "Province",
                        "column_name": "s1_name",
                        "is_hierarchy": true,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "store"
                    },
                    {
                        "label": "Zip",
                        "column_name": "zip",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "store"
                    },
                    {
                        "label": "Is Retail Store",
                        "column_name": "is_retail_store",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "store"
                    },
                    {
                        "label": "Retail Store Opened At",
                        "column_name": "open_date",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "store"
                    },
                    {
                        "label": "Is Distribution Center",
                        "column_name": "is_distribution_center",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "store"
                    },
                    {
                        "label": "Dc Name",
                        "column_name": "dc_name",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "store"
                    },
                    {
                        "label": "Channel ",
                        "column_name": "channel_name",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "store"
                    },
                    {
                        "label": "Like Store Id",
                        "column_name": "like_store_id",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "store"
                    },
                    {
                        "label": "store group",
                        "column_name": "store_group",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": false,
                        "dimension": "store"
                    },
                    {
                        "label": "Cost",
                        "column_name": "cost",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": true,
                        "dimension": "product"
                    },
                    {
                        "label": "Original Price",
                        "column_name": "original_price",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": true,
                        "dimension": "product"
                    },
                    {
                        "label": "Created At",
                        "column_name": "created_at",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": true,
                        "dimension": "product"
                    },
                    {
                        "label": "Updated At",
                        "column_name": "updated_at",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": true,
                        "dimension": "product"
                    },
                    {
                        "label": "Product Code",
                        "column_name": "product_code",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": true,
                        "dimension": "product"
                    },
                    {
                        "label": "Product Name",
                        "column_name": "product_name",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": true,
                        "dimension": "product"
                    },
                    {
                        "label": "Product Description",
                        "column_name": "product_description",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": true,
                        "dimension": "product"
                    },
                    {
                        "label": "Division",
                        "column_name": "l0_name",
                        "is_hierarchy": true,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Gender",
                        "column_name": "l1_name",
                        "is_hierarchy": true,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Category",
                        "column_name": "l2_name",
                        "is_hierarchy": true,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Class",
                        "column_name": "l3_name",
                        "is_hierarchy": true,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "F Style Franchise",
                        "column_name": "f_style_franchise",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Price",
                        "column_name": "price",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": true,
                        "dimension": "product"
                    },
                    {
                        "label": "F Style",
                        "column_name": "l4_name",
                        "is_hierarchy": true,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "F Style Description",
                        "column_name": "style_name",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Color Name",
                        "column_name": "color_name",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Color Family",
                        "column_name": "color_family_name",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Color Code",
                        "column_name": "color_id",
                        "is_hierarchy": true,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Tall Petite Size",
                        "column_name": "tall_petite_size",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Style Color Sku Code",
                        "column_name": "article",
                        "is_hierarchy": true,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Style Color Code",
                        "column_name": "style_color_code",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Base Size",
                        "column_name": "base_size",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Size",
                        "column_name": "size",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Product Life Cycle",
                        "column_name": "product_lifecycle",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Color Type V2",
                        "column_name": "color_type",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "F Licensed Vs Non Licensed",
                        "column_name": "f_licensed_vs_non_licensed",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "License Type",
                        "column_name": "license_type",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "F Launch Date",
                        "column_name": "launch_date",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "F Silhouette",
                        "column_name": "f_silhouette",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "F Inseam Body Length",
                        "column_name": "f_inseam_body_length",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "F Waistband",
                        "column_name": "f_waistband",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "F Closure",
                        "column_name": "f_closure",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "F Leg Shape",
                        "column_name": "f_leg_shape",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "F Neckline",
                        "column_name": "f_neckline",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "F Sleeve Length",
                        "column_name": "f_sleeve_length",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "F Sleeve Type",
                        "column_name": "f_sleeve_type",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "F Rise",
                        "column_name": "f_rise",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "F Style Fabric",
                        "column_name": "f_style_fabric",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Clearance",
                        "column_name": "clearance",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": true,
                        "dimension": "product"
                    },
                    {
                        "label": "Receipt Date",
                        "column_name": "receipt_date",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": true,
                        "dimension": "product"
                    },
                    {
                        "label": "Product Bucket Code",
                        "column_name": "product_bucket_code",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Active",
                        "column_name": "active",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": true,
                        "dimension": "product"
                    },
                    {
                        "label": "Vendor Id",
                        "column_name": "vendor_id",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Vendor Desc",
                        "column_name": "vendor_desc",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Style Type V2",
                        "column_name": "style_type_v2",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Factory",
                        "column_name": "factory",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Style Type",
                        "column_name": "style_type",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Assort Product Type",
                        "column_name": "assort_product_type",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Ordering",
                        "column_name": "ordering",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Replenish Status",
                        "column_name": "replenish_status",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Replenishment Status",
                        "column_name": "replenishment_status",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "product group",
                        "column_name": "product_group",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": false,
                        "dimension": "product"
                    },
                    {
                        "label": "Store Description",
                        "column_name": "store_description",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": true,
                        "dimension": "store"
                    },
                    {
                        "label": "Special Classification",
                        "column_name": "special_classification",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": true,
                        "dimension": "store"
                    },
                    {
                        "label": "Created At",
                        "column_name": "created_at",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": true,
                        "dimension": "store"
                    },
                    {
                        "label": "Updated At",
                        "column_name": "updated_at",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": true,
                        "dimension": "store"
                    },
                    {
                        "label": "Dc Code",
                        "column_name": "dc_code",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": true,
                        "dimension": "store"
                    },
                    {
                        "label": "Fc Code",
                        "column_name": "fc_code",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": true,
                        "dimension": "store"
                    },
                    {
                        "label": "Store Name",
                        "column_name": "store_name",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": true,
                        "dimension": "store"
                    },
                    {
                        "label": "Store Code",
                        "column_name": "store_code",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": true,
                        "dimension": "store"
                    },
                    {
                        "label": "Channel",
                        "column_name": "channel",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "store"
                    },
                    {
                        "label": "Active",
                        "column_name": "active",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": true,
                        "dimension": "store"
                    },
                    {
                        "label": "City",
                        "column_name": "s2_name",
                        "is_hierarchy": true,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "store"
                    },
                    {
                        "label": "Country",
                        "column_name": "s0_name",
                        "is_hierarchy": true,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "store"
                    },
                    {
                        "label": "Province",
                        "column_name": "s1_name",
                        "is_hierarchy": true,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "store"
                    },
                    {
                        "label": "Zip",
                        "column_name": "zip",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "store"
                    },
                    {
                        "label": "Is Retail Store",
                        "column_name": "is_retail_store",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "store"
                    },
                    {
                        "label": "Retail Store Opened At",
                        "column_name": "open_date",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "store"
                    },
                    {
                        "label": "Is Distribution Center",
                        "column_name": "is_distribution_center",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "store"
                    },
                    {
                        "label": "Dc Name",
                        "column_name": "dc_name",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "store"
                    },
                    {
                        "label": "Channel ",
                        "column_name": "channel_name",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "store"
                    },
                    {
                        "label": "Like Store Id",
                        "column_name": "like_store_id",
                        "is_hierarchy": false,
                        "is_attribute": true,
                        "is_main_col": false,
                        "dimension": "store"
                    },
                    {
                        "label": "store group",
                        "column_name": "store_group",
                        "is_hierarchy": false,
                        "is_attribute": false,
                        "is_main_col": false,
                        "dimension": "store"
                    }
                ]
            }
        }
    ],
    "message": "Successful",
    "previous": null,
    "next": null,
    "offset": null,
    "sub_offset": null,
    "download_rows": null
}
}