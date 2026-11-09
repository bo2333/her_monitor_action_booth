import { React, SDK } from './lib/sdk';
import App from './App';

(function () {
  'use strict';
  if (!SDK?.React) {
    console.error('[her_monitor_action_booth] SDK 未就绪');
    return;
  }
  window.__HERMES_PLUGINS__.register('her_monitor_action_booth', (props) =>
    React.createElement(App, props)
  );
})();