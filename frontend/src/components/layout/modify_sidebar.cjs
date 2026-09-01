const fs = require('fs');
let code = fs.readFileSync('Sidebar.tsx', 'utf8');

// 1. Import useAuthStore
code = code.replace(
  "import { useSettingsStore } from '../../store/settingsStore';",
  "import { useSettingsStore } from '../../store/settingsStore';\nimport { useAuthStore } from '../../store/authStore';"
);

// 2. Extract user and filter modules
code = code.replace(
  "const modules = Object.keys(MODULE_REGISTRY) as ModuleKey[];",
  "const { user } = useAuthStore();\n  const allModules = Object.keys(MODULE_REGISTRY) as ModuleKey[];\n  const modules = allModules.filter(key => user?.modules?.includes(key));"
);

fs.writeFileSync('Sidebar.tsx', code);
console.log('Sidebar.tsx modified successfully');
