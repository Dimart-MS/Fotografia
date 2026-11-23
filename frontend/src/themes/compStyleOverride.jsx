// ==============================|| COMPONENT STYLE OVERRIDES ||============================== //
// Luz & Memoria - Identidad visual compartida

export default function componentStyleOverrides() {
  const colors = {
    primary: '#254c41',
    primaryHover: '#18352d',
    sage: '#e9efe8',
    border: '#e4e5dc',
    background: '#fffefa',
    text: '#282c28',
    muted: '#767b73'
  };

  return {
    MuiButton: {
      defaultProps: {
        disableElevation: true
      },
      styleOverrides: {
        root: {
          borderRadius: 9,
          minHeight: 38,
          padding: '8px 16px',
          fontSize: '0.8125rem',
          fontWeight: 600,
          textTransform: 'none',
          boxShadow: 'none',
          transition: 'background-color 0.18s ease, border-color 0.18s ease'
        },
        containedPrimary: {
          backgroundColor: colors.primary,
          color: '#ffffff',
          '&:hover': {
            backgroundColor: colors.primaryHover,
            boxShadow: 'none'
          }
        },
        outlinedPrimary: {
          borderColor: '#b8c8b6',
          color: colors.primary,
          '&:hover': {
            borderColor: colors.primary,
            backgroundColor: '#f4f7f2'
          }
        },
        textPrimary: {
          color: colors.primary,
          '&:hover': {
            backgroundColor: '#f0f3ed'
          }
        }
      }
    },

    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          transition: 'background-color 0.18s ease'
        }
      }
    },

    MuiTextField: {
      defaultProps: {
        fullWidth: true,
        size: 'small',
        variant: 'outlined'
      }
    },

    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          backgroundColor: '#ffffff',
          fontSize: '0.875rem',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: '#d9ded5'
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#aebfad'
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: colors.primary,
            borderWidth: 1.5
          }
        },
        input: {
          paddingTop: 11,
          paddingBottom: 11
        }
      }
    },

    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: colors.muted,
          fontSize: '0.875rem',
          '&.Mui-focused': {
            color: colors.primary
          }
        }
      }
    },

    MuiFormHelperText: {
      styleOverrides: {
        root: {
          fontSize: '0.75rem',
          lineHeight: 1.5
        }
      }
    },

    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 22,
          backgroundColor: colors.background,
          border: `1px solid ${colors.border}`,
          boxShadow: '0 20px 60px rgba(24, 53, 45, 0.12)'
        }
      }
    },

    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: '1.5rem',
          fontWeight: 400,
          color: '#343b32',
          padding: '24px 28px 18px'
        }
      }
    },

    MuiDialogContent: {
      styleOverrides: {
        root: {
          paddingLeft: 28,
          paddingRight: 28
        }
      }
    },

    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: '16px 28px 22px',
          gap: 8,
          borderTop: `1px solid ${colors.border}`
        }
      }
    },

    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          backgroundColor: colors.background,
          border: `1px solid ${colors.border}`,
          boxShadow: 'none'
        }
      }
    },

    MuiPaper: {
      styleOverrides: {
        rounded: {
          borderRadius: 16
        }
      }
    },

    MuiTableContainer: {
      styleOverrides: {
        root: {
          borderRadius: 12
        }
      }
    },

    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: '#f5f7f3'
        }
      }
    },

    MuiTableCell: {
      styleOverrides: {
        head: {
          color: '#667466',
          fontWeight: 700,
          fontSize: '0.7rem',
          letterSpacing: '0.045em',
          textTransform: 'uppercase',
          borderBottom: `1px solid ${colors.border}`
        },
        body: {
          color: colors.text,
          fontSize: '0.8125rem',
          borderBottom: '1px solid #edf0e9'
        }
      }
    },

    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 600,
          fontSize: '0.75rem'
        }
      }
    },

    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          fontSize: '0.875rem',
          alignItems: 'center'
        },
        standardInfo: {
          backgroundColor: '#edf3f0',
          color: '#315d52'
        },
        standardSuccess: {
          backgroundColor: '#e9f1e7',
          color: '#47683b'
        },
        standardWarning: {
          backgroundColor: '#f6f0e4',
          color: '#947144'
        },
        standardError: {
          backgroundColor: '#f8eae8',
          color: '#a04f4f'
        }
      }
    },

    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          borderRadius: 8,
          fontSize: '0.75rem'
        }
      }
    }
  };
}
