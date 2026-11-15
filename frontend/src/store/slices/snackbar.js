import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  action: false,
  open: false,
  message: '',
  anchorOrigin: {
    vertical: 'bottom',
    horizontal: 'right'
  },
  severity: 'success',
  variant: 'default',
  alert: {
    color: 'primary',
    variant: 'filled'
  },
  transition: 'Fade',
  close: true,
  maxStack: 3,
  dense: false,
  iconVariant: 'usedefault',
  actionButton: false,
  hideIconVariant: false
};

// ==============================|| SLICE - SNACKBAR ||============================== //

const snackbar = createSlice({
  name: 'snackbar',
  initialState,
  reducers: {
    openSnackbar(state, action) {
      const {
        open,
        message,
        anchorOrigin,
        variant,
        alert,
        transition,
        close,
        actionButton,
        severity,
        hideIconVariant
      } = action.payload;

      state.action = !state.action;
      state.open = open ?? true;
      state.message = message || initialState.message;
      state.anchorOrigin = anchorOrigin || initialState.anchorOrigin;
      state.variant = variant || initialState.variant;
      state.alert = {
        color: alert?.color || initialState.alert.color,
        variant: alert?.variant || initialState.alert.variant
      };
      state.severity = severity || initialState.severity;
      state.transition = transition || initialState.transition;
      state.close = close === false ? close : initialState.close;
      state.actionButton = actionButton || initialState.actionButton;
      state.hideIconVariant =
        hideIconVariant === undefined ? initialState.hideIconVariant : hideIconVariant;
    },

    closeSnackbar(state) {
      state.open = false;
      state.message = '';
    }
  }
});

export default snackbar.reducer;

export const { closeSnackbar, openSnackbar } = snackbar.actions;
