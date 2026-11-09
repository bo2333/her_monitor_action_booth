const SDK = window.__HERMES_PLUGIN_SDK__;
if (!SDK?.React) console.error('[her_monitor_action_booth] 未找到 Hermes Plugin SDK');

const R = SDK?.React;

export const React = R;
export const fetchJSON = SDK?.fetchJSON;
export { SDK };

export const useState        = R?.useState;
export const useEffect       = R?.useEffect;
export const useMemo         = R?.useMemo;
export const useCallback     = R?.useCallback;
export const useRef          = R?.useRef;
export const useContext      = R?.useContext;
export const createContext   = R?.createContext;
export const Fragment        = R?.Fragment;
export const createElement   = R?.createElement;

export default SDK;