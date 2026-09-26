const mainReducerDefaultState = {
    overlayLoaderState: false,
    loaderText: 'Loading...',
  };
  
  export default (state = mainReducerDefaultState, action) => {
    switch (action.type) {
      case 'LOADER':
        return {
          ...state,
          overlayLoaderState: action.payload.status,
          loaderText: action.payload.text,
        };
  
      default:
        return state;
    }
  };