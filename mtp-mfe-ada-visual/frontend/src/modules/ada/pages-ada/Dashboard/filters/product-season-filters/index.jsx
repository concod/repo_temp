import { useDispatch } from "react-redux";
import ProductFilter from "./productFilter";
import { fetchOrUpdateProductSeasonFiltersData } from "./product-filter-utils";
import { setProductSeasonFilters as setProductSeasonFiltersAction } from "modules/ada/services-ada/ada-dashboard/ada-dashboard-services";

const ProductSeasonFilters = ({ selectedDate, setLoading, adaReducer }) => {
  const productSeasonFilters = adaReducer?.productSeasonFilters || [];
  const dispatch = useDispatch();

  const fetchOrUpdateOptions = async ({
    attributeData,
    fetchAllFilters = false,
    setIsLoading,
    allFiltersData,
    setYearWeek = true,
  }) => {
    try {
      setIsLoading && setLoading(true);
      const updatedFilters = await fetchOrUpdateProductSeasonFiltersData({
        selectedDate,
        attributeData,
        fetchAllFilters,
        allFiltersData: allFiltersData ?? productSeasonFilters,
        setYearWeek,
        dispatch,
      });
      dispatch(setProductSeasonFiltersAction(updatedFilters));
    } catch (error) {
      console.log("error", error);
    } finally {
      setIsLoading && setLoading(false);
    }
  };

  const setSelectedOptions = (options, attributeData) => {
    const updatedFilters = productSeasonFilters.map((filter) => {
      if (filter.attribute_name === attributeData.attribute_name) {
        return {
          ...filter,
          selectedOptions: options,
        };
      }
      return filter;
    });

    fetchOrUpdateOptions({
      attributeData,
      fetchAllFilters: true,
      setIsLoading: true,
      selectedOptions: options,
      allFiltersData: updatedFilters,
    });
  };

  return (
    <>
      {productSeasonFilters.map((filter) => (
        <div key={filter.attribute_name}>
          <ProductFilter
            attributeData={filter}
            attributes={productSeasonFilters}
            selectedDate={selectedDate}
            fetchOrUpdateOptions={fetchOrUpdateOptions}
            setSelectedOptions={setSelectedOptions}
            isDisabled={
              selectedDate?.fiscalInfoEndDate == null ||
              selectedDate?.fiscalInfoStartDate == null
            }
          />
        </div>
      ))}
    </>
  );
};

export default ProductSeasonFilters;
