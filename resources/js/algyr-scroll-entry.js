import '../css/algyr-scroll.css';
import { initAll, mount, destroy, getInstance } from './algyr-scroll.js';
window.AlgyrScroll = Object.freeze({ initAll, mount, destroy, getInstance });
const start = () => initAll(document, window.algyrScrollDependencies);
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
else start();
document.addEventListener('livewire:navigated', start);
document.addEventListener('algyr:init', start);
