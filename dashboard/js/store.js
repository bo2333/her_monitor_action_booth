import { reactive } from 'vue';

export const store = reactive({
  cfg: {},
  users: [],
  actions: [],

  showToken: false,
  showSettings: false,
  showInstall: false,

  connected: true,

  // ---- 查询条件 ----
  filterUser: '',
  filterAction: {
    mode: "all",
    checked: null
  },
  queryStart: '',
  queryEnd: ''
});