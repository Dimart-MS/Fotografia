// third party
import { configureStore } from '@reduxjs/toolkit';
import {
  useDispatch as useAppDispatch,
  useSelector as useAppSelector
} from 'react-redux';

// project imports
import rootReducer from './reducer';

// ==============================|| REDUX - MAIN STORE ||============================== //

const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
      immutableCheck: false
    })
});

const { dispatch } = store;

function useDispatch() {
  return useAppDispatch();
}

const useSelector = useAppSelector;

export { store, dispatch, useSelector, useDispatch };
