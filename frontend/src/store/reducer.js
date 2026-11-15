// third party
import { combineReducers } from 'redux';

// project imports
import clientReducer from './slices/client';
import bookingReducer from './slices/booking';
import snackbarReducer from './slices/snackbar';

// ==============================|| COMBINE REDUCER ||============================== //

const reducer = combineReducers({
  client: clientReducer,
  booking: bookingReducer,
  snackbar: snackbarReducer
});

export default reducer;
