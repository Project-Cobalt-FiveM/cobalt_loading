import { mount } from 'svelte';
import './app.css';
import App from './App.svelte';

if (import.meta.env.DEV && new URLSearchParams(location.search).get('simulate') !== '0')
  import('./lib/simulate').then(({ replay }) => replay());

const target = document.getElementById('app');

if (target) mount(App, { target });
