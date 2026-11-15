// ==============================|| COMPONENT STYLE OVERRIDES ||============================== //

export default function componentStyleOverrides() {
  return {
    MuiButton: {
      defaultProps: {
        disableElevation: true
      }
    },
    MuiTextField: {
      defaultProps: {
        fullWidth: true,
        size: 'small',
        variant: 'outlined'
      }
    }
  };
}
