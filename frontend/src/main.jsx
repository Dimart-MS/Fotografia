import { createRoot } from 'react-dom/client';

// third party
import { Provider } from 'react-redux';

// project imports
import App from './App';
import { store } from './store';

// style + assets
import './style.css';

// ==============================|| REACT DOM RENDER ||============================== //

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <Provider store={store}>
    <App />
  </Provider>
);
